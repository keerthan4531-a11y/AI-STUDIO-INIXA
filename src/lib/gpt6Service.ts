import { spawn } from 'child_process';
import path from 'path';

/**
 * Universal GPT-6 Astra Service:
 * - High-speed zero-auth streaming gateway (Primary)
 * - Vercel Serverless /api/gpt6 Python endpoint (Secondary)
 * - Local Python CLI bridge api/gpt6_cli.py (Local dev)
 */

async function tryDirectGateway(
  prompt: string,
  onDelta: (chunk: string) => void
): Promise<string> {
  const res = await fetch('https://api.binjie.fun/api/generateStream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'https://chat9.yqcloud.top',
      'Referer': 'https://chat9.yqcloud.top/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    body: JSON.stringify({
      prompt,
      userId: `#/chat/${Date.now()}`,
      network: true,
      withoutContext: false,
      stream: true
    })
  });

  if (!res.ok) {
    throw new Error(`Direct gateway returned HTTP ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No readable stream from direct gateway');

  const decoder = new TextDecoder();
  let accumulated = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    if (chunk) {
      accumulated += chunk;
      onDelta(chunk);
    }
  }

  if (!accumulated.trim()) {
    throw new Error('Direct gateway returned empty response');
  }
  return accumulated.trim();
}

export async function executeGPT6Stream(
  prompt: string,
  onDelta: (chunk: string) => void,
  messages?: any[],
  forwardHeaders?: Headers | Record<string, string>
): Promise<string> {
  // 1. Try High-Speed Direct Gateway First (1-2s latency, 100% free)
  try {
    const result = await tryDirectGateway(prompt, onDelta);
    if (result) return result;
  } catch (err: any) {
    console.warn(`[GPT-6 Astra] Direct gateway failed: ${err.message}. Trying Serverless / Python route...`);
  }

  const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL_URL;

  // 2. VERCEL SERVERLESS ENVIRONMENT: Fetch native /api/gpt6 Python function
  if (isVercel) {
    const getH = (k: string): string => {
      if (!forwardHeaders) return '';
      if (forwardHeaders instanceof Headers) return forwardHeaders.get(k) || '';
      return (forwardHeaders as Record<string, string>)[k] || '';
    };

    const incomingHost = getH('host') || getH('x-forwarded-host');
    const host = incomingHost
      ? (incomingHost.startsWith('http') ? incomingHost : `https://${incomingHost}`)
      : (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'));

    const gpt6Endpoint = `${host}/api/gpt6`;

    const fetchHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const cookie = getH('cookie');
    if (cookie) fetchHeaders['Cookie'] = cookie;

    const bypass = getH('x-vercel-protection-bypass') || process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    if (bypass) fetchHeaders['x-vercel-protection-bypass'] = bypass;

    const auth = getH('authorization');
    if (auth) fetchHeaders['Authorization'] = auth;

    const res = await fetch(gpt6Endpoint, {
      method: 'POST',
      headers: fetchHeaders,
      body: JSON.stringify({ prompt, messages, stream: true })
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
            const delta = parsed.delta || parsed.choices?.[0]?.delta?.content || parsed.content || '';
            if (delta) {
              accumulatedText += delta;
              onDelta(delta);
            }
          } catch {}
        }
      }
    }

    if (!accumulatedText.trim()) {
      throw new Error('GPT-6 Astra did not return any output.');
    }
    return accumulatedText.trim();
  }

  // 3. LOCAL ENVIRONMENT: Execute local python runner (api/gpt6_cli.py)
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'api', 'gpt6_cli.py');
    const inputJson = JSON.stringify({ prompt, messages });

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
            const delta = parsed.delta || parsed.choices?.[0]?.delta?.content || parsed.content || '';
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
        reject(new Error('GPT-6 Astra returned empty response.'));
      } else {
        resolve(accumulatedText.trim());
      }
    });

    py.on('error', err => {
      reject(new Error(`Failed to launch Python: ${err.message}`));
    });
  });
}
