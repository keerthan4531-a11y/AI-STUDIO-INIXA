import { spawn } from 'child_process';
import path from 'path';

/**
 * Universal Perplexity Service:
 * - On Vercel: hits the native Python serverless endpoint /api/pplx (powered by curl_cffi)
 * - In Local Dev: spawns local Python bridge (api/pplx_cli.py) via py/python
 * - Strictly NO fallback: true errors are streamed directly to the UI
 */

export const PPLX_MODELS = [
  { id: 'pplx-turbo', modelId: 'turbo', name: 'Perplexity Turbo', provider: 'Perplexity AI' },
  { id: 'pplx-gpt56-sol', modelId: 'gpt56_sol', name: 'GPT-5.6 Sol (Perplexity Web)', provider: 'OpenAI' },
  { id: 'pplx-sonnet5', modelId: 'claude50sonnet', name: 'Claude Sonnet 5 (Perplexity Web)', provider: 'Anthropic' },
  { id: 'pplx-opus5', modelId: 'claude50opus', name: 'Claude Opus 5 (Perplexity Web)', provider: 'Anthropic' },
  { id: 'pplx-gemini31', modelId: 'gemini31pro_high', name: 'Gemini 3.1 Pro (Perplexity Web)', provider: 'Google' },
  { id: 'pplx-grok45', modelId: 'grok45low', name: 'Grok 4.5 (Perplexity Web)', provider: 'xAI' },
  { id: 'pplx-kimi3', modelId: 'kimik3', name: 'Kimi K3 (Perplexity Web)', provider: 'Moonshot' },
  { id: 'pplx-glm52', modelId: 'glm_5_2', name: 'GLM 5.2 (Perplexity Web)', provider: 'ZAI' },
];

export async function executePerplexityStream(
  prompt: string,
  modelName: string,
  onDelta: (chunk: string) => void,
  onCitations?: (citations: string[]) => void,
  forwardHeaders?: Headers | Record<string, string>
): Promise<string> {
  const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL_URL;
  const targetModel = modelName.replace(/^pplx[\/-]/, '').replace(/^perplexity[\/-]/, '').trim() || 'turbo';

  // 1. VERCEL SERVERLESS ENVIRONMENT: Fetch native /api/pplx Python function
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

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText.slice(0, 300)}`);
    }

    const reader = res.body!.getReader();
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

    if (!accumulatedText.trim()) {
      throw new Error(`Perplexity model ${targetModel} did not return any output.`);
    }
    return accumulatedText.trim();
  }

  // 2. LOCAL ENVIRONMENT: Execute local python runner (api/pplx_cli.py)
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'api', 'pplx_cli.py');
    const inputJson = JSON.stringify({ prompt, model: targetModel });

    // Determine python command: 'py' (Windows standard) or 'python3' / 'python'
    const pythonCmd = process.platform === 'win32' ? 'py' : 'python3';
    const py = spawn(pythonCmd, ['-u', scriptPath, inputJson]);

    let accumulatedText = '';
    let buffer = '';
    let stderrText = '';

    py.stdout.on('data', chunk => {
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

    py.stderr.on('data', chunk => {
      stderrText += chunk.toString();
    });

    py.on('close', code => {
      if (code !== 0 && !accumulatedText.trim()) {
        reject(new Error(stderrText || `Python process failed with exit code ${code}`));
      } else if (!accumulatedText.trim()) {
        reject(new Error(`Perplexity model ${targetModel} returned empty response.`));
      } else {
        resolve(accumulatedText.trim());
      }
    });

    py.on('error', err => {
      reject(new Error(`Failed to launch Python: ${err.message}`));
    });
  });
}
