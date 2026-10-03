import { NextRequest } from 'next/server';
import { refreshProxyPool, getNextProxy, getCachedWorkingProxy, setCachedWorkingProxy, getProxyPool } from '@/lib/proxyPool';
import nodeFetch from 'node-fetch';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

export const runtime = 'nodejs';
export const maxDuration = 60;

const KILO_GATEWAY = 'https://api.kilo.ai/api/gateway/chat/completions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let model = body.model || 'liquid/lfm-2.5-2.6b:free';
    if (model.startsWith('kilo/')) {
      model = model.replace(/^kilo\//, '');
    }

    if (!model.endsWith(':free') && !model.endsWith('/free')) {
      if (!model.includes('ling-3.1-flash')) {
        model = `${model}:free`;
      }
    }

    let messages = body.messages || [];
    if (messages.length === 0) {
      const prompt = body.prompt || body.query || '';
      if (!prompt) {
        return new Response(JSON.stringify({ error: 'Prompt or messages are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      messages = [{ role: 'user', content: prompt }];
    }

    const stream = body.stream !== false;
    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    };
    if (stream) {
      reqHeaders['Accept'] = 'text/event-stream';
    }

    const reqBodyStr = JSON.stringify({
      model,
      messages: messages.filter((m: any) => m && m.content),
      stream,
      max_tokens: body.max_tokens || 2048,
      temperature: body.temperature || 0.7
    });

    let kiloRes: any = null;
    let kiloLastError: any = null;

    // Step 1: Direct attempt
    try {
      const directRes = await fetch(KILO_GATEWAY, {
        method: 'POST',
        headers: reqHeaders,
        body: reqBodyStr
      });

      if (directRes.ok) {
        kiloRes = directRes;
      } else if (directRes.status === 429) {
        console.warn(`[Kilo Route] Direct IP 429 rate-limited for ${model}. Activating rotating proxy pool...`);
        kiloLastError = new Error(`HTTP 429 Rate limited on direct IP`);
      } else {
        const errText = await directRes.text();
        kiloLastError = new Error(`HTTP ${directRes.status}: ${errText.slice(0, 200)}`);
      }
    } catch (e: any) {
      kiloLastError = e;
    }

    // Step 2: Unlimited Proxy Rotation if rate-limited or direct connection failed
    if (!kiloRes) {
      await refreshProxyPool();
      const pool = getProxyPool();

      if (pool && pool.length > 0) {
        const proxiesToTry: string[] = [];
        const cached = getCachedWorkingProxy();
        if (cached) proxiesToTry.push(cached);

        const maxTries = Math.min(8, pool.length);
        for (let p = 0; p < maxTries; p++) {
          const nextP = getNextProxy();
          if (nextP && !proxiesToTry.includes(nextP)) proxiesToTry.push(nextP);
        }

        for (const proxyUrl of proxiesToTry) {
          try {
            let agent: any;
            if (proxyUrl.startsWith('socks')) agent = new SocksProxyAgent(proxyUrl);
            else agent = proxyUrl.startsWith('https') ? new HttpsProxyAgent(proxyUrl) : new HttpProxyAgent(proxyUrl);

            const pRes: any = await nodeFetch(KILO_GATEWAY, {
              method: 'POST',
              headers: reqHeaders,
              body: reqBodyStr,
              agent,
              timeout: 15000
            });

            if (pRes.ok) {
              setCachedWorkingProxy(proxyUrl);
              console.log(`[Kilo Route] Successfully bypassed rate-limit via proxy: ${proxyUrl}`);
              kiloRes = pRes;
              break;
            } else if (pRes.status === 429) {
              console.warn(`[Kilo Route] Proxy ${proxyUrl} hit 429, trying next...`);
            }
          } catch {
            // Next proxy
          }
        }
      }
    }

    if (!kiloRes || !kiloRes.ok) {
      const errMsg = kiloLastError?.message || 'Kilo Gateway rate limit reached and proxy pool exhausted';
      console.error(`[Kilo Route Error] ${errMsg}`);
      return new Response(JSON.stringify({
        error: `[Kilo Gateway Error - ${model}]: ${errMsg}`
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Stream SSE forwarder with reasoning and node stream support
    if (stream) {
      if (kiloRes.body?.getReader) {
        return new Response(kiloRes.body, {
          headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          }
        });
      } else if (kiloRes.body?.on) {
        const bodyStream = new ReadableStream({
          start(controller: ReadableStreamDefaultController) {
            kiloRes.body.on('data', (chunk: Buffer) => controller.enqueue(chunk));
            kiloRes.body.on('end', () => controller.close());
            kiloRes.body.on('error', (err: Error) => controller.error(err));
          },
          cancel() {
            kiloRes.body.destroy();
          }
        });
        return new Response(bodyStream, {
          headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          }
        });
      }
    }

    const data = await kiloRes.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({
      error: `[Kilo Gateway Error]: ${err.message || 'Unknown network error'}`
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
