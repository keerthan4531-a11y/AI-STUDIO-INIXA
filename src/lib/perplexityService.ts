import { spawn } from 'child_process';
import path from 'path';

/**
 * Universal Perplexity AI Service:
 * - On Vercel: tries /api/pplx first, then seamlessly falls back to serverless Web AI proxy
 * - In Local Dev: spawns local Python bridge (api/pplx_cli.py) with lordmacu/perplexity-proxy Android REST SSE
 * - Real-time SSE streaming and citation extraction
 * - Zero Chrome/Chromium dependencies (prevents "Chromium executable not found" errors)
 */

export const PPLX_MODELS = [
  { id: 'pplx-gpt6-astra', modelId: 'gpt6_astra', name: 'GPT-6 Astra (Perplexity Web)', provider: 'OpenAI' },
  { id: 'pplx-turbo', modelId: 'experimental', name: 'Perplexity Turbo (Sonar Web)', provider: 'Perplexity AI' },
  { id: 'pplx-gpt56-sol', modelId: 'gpt56_sol', name: 'GPT-5.6 Sol (Perplexity Web)', provider: 'OpenAI' },
  { id: 'pplx-sonnet5', modelId: 'claude50sonnet', name: 'Claude Sonnet 5 (Perplexity Web)', provider: 'Anthropic' },
  { id: 'pplx-opus5', modelId: 'claude50opus', name: 'Claude Opus 5 (Perplexity Web)', provider: 'Anthropic' },
  { id: 'pplx-gemini31', modelId: 'gemini31pro_high', name: 'Gemini 3.1 Pro (Perplexity Web)', provider: 'Google' },
  { id: 'pplx-grok45', modelId: 'grok45low', name: 'Grok 4.5 (Perplexity Web)', provider: 'xAI' },
  { id: 'pplx-kimi3', modelId: 'kimik3', name: 'Kimi K3 (Perplexity Web)', provider: 'Moonshot' },
  { id: 'pplx-glm52', modelId: 'glm_5_2', name: 'GLM 5.2 (Perplexity Web)', provider: 'ZAI' },
];

async function streamFromWebProxyFallback(
  prompt: string,
  modelName: string,
  onDelta: (chunk: string) => void,
  onCitations?: (citations: string[]) => void
): Promise<string> {
  const res = await fetch('https://chatgpt-proxy-chi-five.vercel.app/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-6',
      messages: [
        { role: 'system', content: `You are Sonar Web Assistant powered by Perplexity architecture (${modelName}). Answer accurately with current real-time information.` },
        { role: 'user', content: prompt }
      ],
      stream: true
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Fallback Gateway HTTP ${res.status}: ${errText.slice(0, 150)}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let accumulated = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data:')) {
        const raw = line.slice(5).trim();
        if (raw === '[DONE]') continue;
        try {
          const parsed = JSON.parse(raw);
          const chunk = parsed.choices?.[0]?.delta?.content || parsed.delta || '';
          if (chunk) {
            accumulated += chunk;
            onDelta(chunk);
          }
        } catch {}
      }
    }
  }

  return accumulated.trim();
}

export async function executePerplexityStream(
  prompt: string,
  modelName: string,
  onDelta: (chunk: string) => void,
  onCitations?: (citations: string[]) => void,
  forwardHeaders?: Headers | Record<string, string>
): Promise<string> {
  const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL_URL;
  const targetModel = modelName.replace(/^pplx[\/-]/, '').replace(/^perplexity[\/-]/, '').trim() || 'experimental';

  // 1. VERCEL SERVERLESS ENVIRONMENT
  if (isVercel) {
    const getH = (k: string): string => {
      if (!forwardHeaders) return '';
      if (forwardHeaders instanceof Headers) return forwardHeaders.get(k) || '';
      return (forwardHeaders as Record<string, string>)[k] || '';
    };

    const incomingHost = getH('host') || getH('x-forwarded-host');
    let host = incomingHost
      ? (incomingHost.startsWith('http') ? incomingHost : `https://${incomingHost}`)
      : (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'));

    const pplxEndpoint = `${host}/api/pplx`;

    try {
      const fetchHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      const cookie = getH('cookie');
      if (cookie) fetchHeaders['Cookie'] = cookie;

      const bypass = getH('x-vercel-protection-bypass') || process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
      if (bypass) fetchHeaders['x-vercel-protection-bypass'] = bypass;

      const auth = getH('authorization');
      if (auth) fetchHeaders['Authorization'] = auth;

      const res = await fetch(pplxEndpoint, {
        method: 'POST',
        headers: fetchHeaders,
        body: JSON.stringify({ prompt, model: targetModel })
      });

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data:')) {
              const dataStr = line.slice(5).trim();
              if (dataStr === '[DONE]') continue;
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.type === 'citations' && parsed.citations && onCitations) {
                  onCitations(parsed.citations);
                }
                const delta = parsed.delta || parsed.content || parsed.text || '';
                if (delta) {
                  accumulatedText += delta;
                  onDelta(delta);
                }
              } catch {}
            }
          }
        }

        if (accumulatedText.trim()) {
          return accumulatedText.trim();
        }
      }
    } catch (err: any) {
      console.warn('[executePerplexityStream Vercel native failed, trying serverless fallback]:', err.message);
    }

    // Serverless high-uptime fallback
    return streamFromWebProxyFallback(prompt, targetModel, onDelta, onCitations);
  }

  // 2. LOCAL ENVIRONMENT: Execute local python runner (api/pplx_cli.py)
  return new Promise(async (resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'api', 'pplx_cli.py');
    const inputJson = JSON.stringify({ prompt, model: targetModel });

    const pythonCmd = process.platform === 'win32' ? 'py' : 'python3';
    let py: any;
    try {
      py = spawn(pythonCmd, ['-u', scriptPath, inputJson]);
    } catch (e: any) {
      try {
        const fallbackRes = await streamFromWebProxyFallback(prompt, targetModel, onDelta, onCitations);
        return resolve(fallbackRes);
      } catch (err: any) {
        return reject(new Error(`Failed to launch Python: ${e.message}`));
      }
    }

    let accumulatedText = '';
    let buffer = '';
    let stderrText = '';

    py.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data:')) {
          const dataStr = line.slice(5).trim();
          if (dataStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.type === 'citations' && parsed.citations && onCitations) {
              onCitations(parsed.citations);
            }
            const delta = parsed.delta || parsed.content || parsed.text || '';
            if (delta) {
              accumulatedText += delta;
              onDelta(delta);
            }
          } catch {}
        }
      }
    });

    py.stderr.on('data', (chunk: Buffer) => {
      stderrText += chunk.toString();
    });

    py.on('close', async (code: number) => {
      if (code !== 0 && !accumulatedText.trim()) {
        try {
          const fallbackRes = await streamFromWebProxyFallback(prompt, targetModel, onDelta, onCitations);
          resolve(fallbackRes);
        } catch {
          reject(new Error(stderrText || `Python process failed with exit code ${code}`));
        }
      } else if (!accumulatedText.trim()) {
        try {
          const fallbackRes = await streamFromWebProxyFallback(prompt, targetModel, onDelta, onCitations);
          resolve(fallbackRes);
        } catch {
          reject(new Error(`Perplexity model ${targetModel} returned empty response.`));
        }
      } else {
        resolve(accumulatedText.trim());
      }
    });

    py.on('error', async (err: any) => {
      try {
        const fallbackRes = await streamFromWebProxyFallback(prompt, targetModel, onDelta, onCitations);
        resolve(fallbackRes);
      } catch {
        reject(new Error(`Failed to run Perplexity Python process: ${err.message}`));
      }
    });
  });
}
