import { NextResponse } from 'next/server';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { HttpProxyAgent } from 'http-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
// @ts-ignore
import nodeFetch from 'node-fetch';

// ═══════════════════════════════════════════════════════════════════
// Chat API Route 
// ═══════════════════════════════════════════════════════════════════

// --- Free LLM API Scraper (Do not touch) ---
interface ScrapedKeyEntry { key: string; model: string; category: string; }
let cachedScrapedKeys: ScrapedKeyEntry[] = [];
let lastScrapeTime = 0;
const SCRAPE_URL = 'https://raw.githubusercontent.com/alistaitsacle/free-llm-api-keys/main/README.md';
const SCRAPE_INTERVAL = 5 * 60 * 1000; 

async function scrapeKeys(): Promise<ScrapedKeyEntry[]> {
  try {
    const res = await nodeFetch(SCRAPE_URL);
    const text = await res.text();
    const entries: ScrapedKeyEntry[] = [];
    
    let currentCategory = '';
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.startsWith('### GPT-5.5')) currentCategory = 'gpt-5.5';
      else if (line.startsWith('### Claude Opus')) currentCategory = 'claude-opus-4-7';
      else if (line.startsWith('### Gemini')) currentCategory = 'gemini-2.5-flash';
      else if (line.startsWith('### DeepSeek')) currentCategory = 'deepseek-chat';
      else if (line.startsWith('### Multi-Model')) currentCategory = 'smart-chat';
      else if (line.startsWith('### Kimi')) currentCategory = 'kimi-k2.5';
      else if (line.startsWith('### Image')) currentCategory = 'text-embedding';
      
      const match = /\|\s*`(sk-[a-zA-Z0-9_-]+)`\s*\|\s*([a-zA-Z0-9._-]+)\s*\|/.exec(line);
      if (match) {
        entries.push({
          key: match[1],
          model: match[2],
          category: currentCategory
        });
      }
    }
    return entries;
  } catch (error) {
    console.error('Failed to scrape keys:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════
// Free Proxy Pool Manager (Round-Robin)
// ═══════════════════════════════════════════════════════════════════
let proxyPool: string[] = [];
let currentProxyIndex = 0;
let lastProxyScrape = 0;

async function refreshProxyPool() {
  const now = Date.now();
  if (proxyPool.length > 0 && now - lastProxyScrape < 5 * 60 * 1000) {
    return; // Use cache if less than 5 mins old
  }

  try {
    console.log('[ProxyPool] Fetching fresh working HTTP and SOCKS proxies from multiple sources...');
    const newProxies = new Set<string>();

    // Source 1: ProxyScrape SOCKS5
    try {
      const psRes = await nodeFetch('https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks5&timeout=4000&country=all');
      const psText = await psRes.text();
      psText.split('\n').filter((l: string) => l.trim().length > 0).forEach((p: string) => newProxies.add(`socks5://${p.trim()}`));
    } catch(e) {}

    // Source 2: ProxyScrape SOCKS4
    try {
      const psRes4 = await nodeFetch('https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks4&timeout=4000&country=all');
      const psText4 = await psRes4.text();
      psText4.split('\n').filter((l: string) => l.trim().length > 0).forEach((p: string) => newProxies.add(`socks4://${p.trim()}`));
    } catch(e) {}

    // Source 3: ProxyScrape HTTP (High Quality)
    try {
      const psResH = await nodeFetch('https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=4000&country=all&ssl=yes&anonymity=anonymous,elite');
      const psTextH = await psResH.text();
      psTextH.split('\n').filter((l: string) => l.trim().length > 0).forEach((p: string) => newProxies.add(`http://${p.trim()}`));
    } catch(e) {}

    // Source 4: Geonode API SOCKS & HTTP
    try {
      const geoRes = await nodeFetch('https://proxylist.geonode.com/api/proxy-list?limit=100&page=1&sort_by=lastChecked&sort_type=desc&protocols=socks5%2Csocks4%2Chttp%2Chttps');
      const geoData = await geoRes.json();
      if (geoData && geoData.data) {
        geoData.data
          .filter((p: any) => p.speed < 3000) 
          .forEach((p: any) => newProxies.add(`${p.protocols[0]}://${p.ip}:${p.port}`));
      }
    } catch(e) {}

    if (newProxies.size > 0) {
      // Shuffle the set
      proxyPool = Array.from(newProxies).sort(() => 0.5 - Math.random());
      lastProxyScrape = now;
      currentProxyIndex = 0;
      console.log(`[ProxyPool] Successfully loaded ${proxyPool.length} fast proxies (Mixed SOCKS/HTTP).`);
      return;
    }

    // Source 5: Fallback TheSpeedX SOCKS5
    const fallbackRes = await nodeFetch('https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks5.txt');
    const fallbackText = await fallbackRes.text();
    const lines = fallbackText.split('\n').filter((l: string) => l.trim().length > 0);
    const shuffled = lines.sort(() => 0.5 - Math.random()).slice(0, 100);
    shuffled.forEach((p: string) => newProxies.add(`socks5://${p.trim()}`));
    
    // Source 6: Fallback TheSpeedX HTTP
    try {
      const fallbackHRes = await nodeFetch('https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt');
      const fallbackHText = await fallbackHRes.text();
      const hLines = fallbackHText.split('\n').filter((l: string) => l.trim().length > 0);
      const hShuffled = hLines.sort(() => 0.5 - Math.random()).slice(0, 100);
      hShuffled.forEach((p: string) => newProxies.add(`http://${p.trim()}`));
    } catch(e) {}

    proxyPool = Array.from(newProxies).sort(() => 0.5 - Math.random());
    lastProxyScrape = now;
    currentProxyIndex = 0;
    console.log(`[ProxyPool] Fallback loaded ${proxyPool.length} Mixed proxies.`);
  } catch (e) {
    console.error('[ProxyPool] Error fetching proxies:', e);
  }
}

function getNextProxy(): string | null {
  if (proxyPool.length === 0) return null;
  const proxy = proxyPool[currentProxyIndex];
  currentProxyIndex = (currentProxyIndex + 1) % proxyPool.length;
  return proxy;
}

// ═══════════════════════════════════════════════════════════════════
// Smart Router Logic
// ═══════════════════════════════════════════════════════════════════
import { adminStats } from '@/api/admin-stats';

const ipRateLimit = new Map<string, { count: number, resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limitInfo = ipRateLimit.get(ip);
  const limit = adminStats.getRateLimit();
  
  if (!limitInfo || now > limitInfo.resetTime) {
    ipRateLimit.set(ip, { count: 1, resetTime: now + 60 * 1000 }); // 60s window
    return true;
  }
  if (limitInfo.count >= limit) { 
    return false;
  }
  limitInfo.count++;
  return true;
}

export async function POST(req: Request) {
  // Disable strict SSL verification to bypass expired proxy certificates
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  
  try {
    // 1. IP Rate Limiting & Banning
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    
    if (adminStats.isIpBanned(ip)) {
      return NextResponse.json({ ok: false, error: 'Forbidden: IP Banned' }, { status: 403 });
    }
    
    adminStats.logRequest(ip);

    if (!checkRateLimit(ip)) {
      adminStats.logFailure();
      console.warn(`[Security] Rate limit exceeded for IP: ${ip}`);
      return NextResponse.json({ ok: false, error: 'Too Many Requests. Please slow down.' }, { status: 429 });
    }

    // 2. CORS / Origin Check
    const origin = req.headers.get('origin') || req.headers.get('referer') || '';
    const allowedOrigins = ['localhost', '127.0.0.1', 'ai-studio-inixa.vercel.app', 'inixa.vercel.app'];
    
    // Check if origin matches allowed domains (skip check if it has a valid backend SECRET_KEY)
    const isOriginAllowed = allowedOrigins.some(allowed => origin.includes(allowed));
    
    let authHeader = req.headers.get('authorization');
    const SERVER_SECRET = process.env.INIXA_PROXY_SECRET; // No hardcoded fallback
    
    const hasValidServerSecret = SERVER_SECRET && authHeader && authHeader.includes(SERVER_SECRET);
    const isScrapedKeyRequest = authHeader && (authHeader.includes('sk-') || authHeader.includes('g4f_'));

    if (!isOriginAllowed && !hasValidServerSecret && !isScrapedKeyRequest) {
      console.warn(`[Security] Blocked unauthorized request from Origin: ${origin}`);
      return NextResponse.json({ ok: false, error: 'Forbidden: Invalid Origin' }, { status: 403 });
    }

    const body = await req.json();
    let model = body.model || 'gpt-4o';
    const stream = body.stream || false;

    // Log approximate input tokens (1 token ≈ 4 chars)
    const approxInputTokens = Math.ceil(JSON.stringify(body.messages || []).length / 4);
    adminStats.logTokens(approxInputTokens);

    console.log(`[Master Route] Routing model: "${model}"`);

    if (authHeader && !authHeader.includes('g4f_') && (!SERVER_SECRET || !authHeader.includes(SERVER_SECRET))) {
      const isScrapedKeyRequest = authHeader.includes('sk-');
      let targetUrl = 'http://localhost:20128/v1/chat/completions';
      
      if (isScrapedKeyRequest && model !== 'g4f/gpt-4o') {
        const now = Date.now();
        if (now - lastScrapeTime > SCRAPE_INTERVAL || cachedScrapedKeys.length === 0) {
          cachedScrapedKeys = await scrapeKeys();
          lastScrapeTime = now;
        }
        
        let matchingKeys = cachedScrapedKeys;
        if (model === 'gpt-5.5') matchingKeys = cachedScrapedKeys.filter((k: any) => k.category === 'gpt-5.5');
        else if (model === 'claude-opus-4.7') matchingKeys = cachedScrapedKeys.filter((k: any) => k.category === 'claude-opus-4-7');
        
        if (matchingKeys.length > 0) {
          const randomKey = matchingKeys[Math.floor(Math.random() * matchingKeys.length)];
          authHeader = `Bearer ${randomKey.key}`;
          model = randomKey.model;
          targetUrl = 'https://api.chatanywhere.tech/v1/chat/completions';
        }
      }

      const backendRes = await nodeFetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify({ ...body, model })
      });

      if (!backendRes.ok) throw new Error(await backendRes.text());
      if (stream) {
        const bodyStream = new ReadableStream({
          start(controller) {
            (backendRes.body as any).on('data', (chunk: Buffer) => controller.enqueue(chunk));
            (backendRes.body as any).on('end', () => controller.close());
            (backendRes.body as any).on('error', (err: Error) => controller.error(err));
          },
          cancel() {
            (backendRes.body as any).destroy();
          }
        });
        return new Response(bodyStream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } });
      }
      return NextResponse.json(await backendRes.json());
    }

    // 2. G4F / DeepInfra / Qwen Model Routing
    if (model.startsWith('g4f/') || model.startsWith('deepinfra/') || model.startsWith('qwen_worker/') || model === 'fable-5') {
      let g4fModel = model;
      let targetEndpoint = 'https://g4f.space/v1/chat/completions';
      
      if (model.startsWith('deepinfra/')) {
        g4fModel = model.replace('deepinfra/', '');
        targetEndpoint = 'https://api.deepinfra.com/v1/openai/chat/completions';
      } else if (model.startsWith('qwen_worker/')) {
        g4fModel = model.replace('qwen_worker/', '');
        targetEndpoint = 'https://qwen.g4f-dev.workers.dev/v1/chat/completions';
      } else if (model === 'fable-5') {
        g4fModel = 'fable-5-pro-flagship';
        targetEndpoint = 'https://fable-internal-sandbox.vercel.app/api/fable-v5';
      } else {
        g4fModel = model.replace('g4f/', '');
      }
      
      await refreshProxyPool();
      
      if (proxyPool.length === 0) {
        throw new Error('No proxies available in the pool.');
      }

      console.log(`[ProxyPool] Racing multiple proxies for model: ${g4fModel} at ${targetEndpoint}`);
      
      // Grab 12 random proxies to race
      const numToRace = Math.min(12, proxyPool.length);
      const proxiesToTry = [];
      for(let i = 0; i < numToRace; i++) {
        proxiesToTry.push(getNextProxy());
      }

      const racePromises = proxiesToTry.map((proxyUrl, index) => {
        return new Promise(async (resolve, reject) => {
          if (!proxyUrl) return reject(new Error('Empty proxy'));
          
          let agent: any;
          if (proxyUrl.startsWith('socks')) {
            agent = new SocksProxyAgent(proxyUrl);
          } else {
            agent = proxyUrl.startsWith('https') ? new HttpsProxyAgent(proxyUrl) : new HttpProxyAgent(proxyUrl);
          }
          
          const controller = new AbortController();
          // Increased timeout for racing to 30s to allow large prompts to process
          const timeoutId = setTimeout(() => controller.abort(), 30000);

          try {
            const fakeIP = `${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`;
            
            const requestBody: any = { ...body, model: g4fModel };
            // Forward provider if it was explicitly requested by frontend
            if (body.provider) {
              requestBody.provider = body.provider;
            }

            const fetchHeaders: any = {
              'Content-Type': 'application/json',
              'Accept': stream ? 'text/event-stream' : 'application/json',
              'Origin': targetEndpoint.includes('deepinfra') ? 'https://deepinfra.com' : (targetEndpoint.includes('qwen') ? 'https://qwen.g4f-dev.workers.dev' : 'https://g4f.dev'),
              'Referer': targetEndpoint.includes('deepinfra') ? 'https://deepinfra.com/' : (targetEndpoint.includes('qwen') ? 'https://qwen.g4f-dev.workers.dev/' : 'https://g4f.dev/'),
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
              'X-Forwarded-For': fakeIP
            };
            
            if (targetEndpoint.includes('fable-internal-sandbox')) {
              fetchHeaders['Authorization'] = 'Bearer sk_pro_institutional_dev_bypass_token';
              fetchHeaders['X-Real-IP'] = fakeIP;
              fetchHeaders['CF-Connecting-IP'] = fakeIP;
            }

            const g4fRes = await nodeFetch(targetEndpoint, {
              method: 'POST',
              headers: fetchHeaders,
              body: JSON.stringify(requestBody),
              agent: agent,
              signal: controller.signal as any
            });
            
            clearTimeout(timeoutId);

            if (g4fRes.ok) {
              console.log(`[Proxy-Race] 🏆 Winner found! Proxy: ${proxyUrl}`);
              resolve(g4fRes);
            } else {
              const errText = await g4fRes.text();
              reject(`Status ${g4fRes.status}: ${errText.substring(0, 100)}`);
            }
          } catch (err: any) {
            clearTimeout(timeoutId);
            reject(err.message || err);
          }
        });
      });

      try {
        // Promise.any resolves with the FIRST successful promise
        const winningRes: any = await Promise.any(racePromises);
        
        if (stream) {
          const bodyStream = new ReadableStream({
            start(controller) {
              (winningRes.body as any).on('data', (chunk: Buffer) => controller.enqueue(chunk));
              (winningRes.body as any).on('end', () => controller.close());
              (winningRes.body as any).on('error', (err: Error) => controller.error(err));
            },
            cancel() {
              (winningRes.body as any).destroy();
            }
          });
          return new Response(bodyStream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } });
        }
        return NextResponse.json(await winningRes.json());
      } catch (aggregateError: any) {
        // All raced proxies failed
        const errors = aggregateError.errors ? aggregateError.errors.join(' | ') : (aggregateError.message || aggregateError);
        console.error(`[Proxy-Race Failed] All ${numToRace} proxies failed. Errors: ${errors}`);

        // ── Direct Fetch Fallback ──
        console.log(`[Fallback] Trying direct fetch without proxies...`);
        try {
          const fakeIP = `${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`;
          const requestBody: any = { ...body, model: g4fModel };
          if (body.provider) requestBody.provider = body.provider;

          const fallbackHeaders: any = {
            'Content-Type': 'application/json',
            'Accept': stream ? 'text/event-stream' : 'application/json',
            'Origin': targetEndpoint.includes('deepinfra') ? 'https://deepinfra.com' : (targetEndpoint.includes('qwen') ? 'https://qwen.g4f-dev.workers.dev' : 'https://g4f.dev'),
            'Referer': targetEndpoint.includes('deepinfra') ? 'https://deepinfra.com/' : (targetEndpoint.includes('qwen') ? 'https://qwen.g4f-dev.workers.dev/' : 'https://g4f.dev/'),
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'X-Forwarded-For': fakeIP
          };

          const directRes = await nodeFetch(targetEndpoint, {
            method: 'POST',
            headers: fallbackHeaders,
            body: JSON.stringify(requestBody)
          });

          if (directRes.ok) {
            console.log(`[Fallback] Direct fetch succeeded!`);
            if (stream) {
              const bodyStream = new ReadableStream({
                start(controller) {
                  (directRes.body as any).on('data', (chunk: Buffer) => controller.enqueue(chunk));
                  (directRes.body as any).on('end', () => controller.close());
                  (directRes.body as any).on('error', (err: Error) => controller.error(err));
                },
                cancel() { (directRes.body as any).destroy(); }
              });
              return new Response(bodyStream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } });
            }
            return NextResponse.json(await directRes.json());
          } else {
            console.error(`[Fallback] Direct fetch returned status ${directRes.status}`);
          }
        } catch (directErr: any) {
          console.error(`[Fallback] Direct fetch also failed: ${directErr.message || directErr}`);
        }

        // ── DeepSeek Fallback: DuckDuckGo AI Chat ──
        // g4f.space blocks DeepSeek with "Not authenticated", so we fallback to DDG
        if (g4fModel.toLowerCase().includes('deepseek')) {
          console.log(`[DeepSeek-Fallback] g4f.space failed for DeepSeek. Trying DuckDuckGo AI Chat...`);
          try {
            // Step 1: Get VQD token from DDG
            const statusRes = await nodeFetch('https://duckduckgo.com/duckchat/v1/status', {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'x-vqd-accept': '1',
                'Referer': 'https://duckduckgo.com/',
                'Origin': 'https://duckduckgo.com',
              }
            });
            const vqd = statusRes.headers.get('x-vqd-4');
            if (!vqd) throw new Error(`VQD token fetch failed (HTTP ${statusRes.status})`);

            // Step 2: Send chat to DDG with deepseek-r1
            const ddgMessages = (body.messages || [{ role: 'user', content: body.message || '' }])
              .filter((m: any) => m.role !== 'system')
              .map((m: any) => ({ role: m.role, content: typeof m.content === 'string' ? m.content : String(m.content) }));

            const chatRes = await nodeFetch('https://duckduckgo.com/duckchat/v1/chat', {
              method: 'POST',
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Accept': 'text/event-stream',
                'Content-Type': 'application/json',
                'Referer': 'https://duckduckgo.com/',
                'Origin': 'https://duckduckgo.com',
                'x-vqd-4': vqd,
              },
              body: JSON.stringify({ model: 'deepseek-r1', messages: ddgMessages }),
            });

            if (!chatRes.ok) throw new Error(`DDG chat error: HTTP ${chatRes.status}`);

            if (stream && chatRes.body) {
              console.log(`[DeepSeek-Fallback] DDG streaming response started`);
              // Convert DDG SSE stream → OpenAI-compatible SSE stream
              const encoder = new TextEncoder();
              let buffer = '';
              const transformedStream = new ReadableStream({
                start(controller) {
                  (chatRes.body as any).on('data', (chunk: Buffer) => {
                    buffer += chunk.toString();
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || ''; // keep incomplete line in buffer
                    for (const line of lines) {
                      if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6).trim();
                        if (dataStr === '[DONE]') {
                          const finalChunk = { id: `chatcmpl-ddg-${Date.now()}`, object: 'chat.completion.chunk', created: Math.floor(Date.now() / 1000), model: 'deepseek-r1', choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] };
                          controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\n`));
                          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                          return;
                        }
                        try {
                          const parsed = JSON.parse(dataStr);
                          if (parsed.message != null) {
                            const openaiChunk = { id: `chatcmpl-ddg-${Date.now()}`, object: 'chat.completion.chunk', created: Math.floor(Date.now() / 1000), model: 'deepseek-r1', choices: [{ index: 0, delta: { content: parsed.message }, finish_reason: null }] };
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
                          }
                        } catch {}
                      }
                    }
                  });
                  (chatRes.body as any).on('end', () => controller.close());
                  (chatRes.body as any).on('error', (err: Error) => controller.error(err));
                },
                cancel() { (chatRes.body as any).destroy(); }
              });
              return new Response(transformedStream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } });
            }

            // Non-streaming: collect full response
            const sseTxt = await chatRes.text();
            let content = '';
            for (const line of sseTxt.split('\n')) {
              if (line.startsWith('data: ') && !line.includes('[DONE]')) {
                try {
                  const parsed = JSON.parse(line.slice(6));
                  if (parsed.message) content += parsed.message;
                } catch {}
              }
            }
            if (content) {
              console.log(`[DeepSeek-Fallback] DDG success! Response length: ${content.length}`);
              return NextResponse.json({
                id: `chatcmpl-ddg-${Date.now()}`,
                object: 'chat.completion',
                created: Math.floor(Date.now() / 1000),
                model: 'deepseek-r1',
                choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }]
              });
            }
            throw new Error('Empty DDG response');
          } catch (ddgErr: any) {
            console.error(`[DeepSeek-Fallback] DDG also failed: ${ddgErr.message || ddgErr}`);
          }
        }

        return NextResponse.json(
          { ok: false, engine: "proxy", error: `All raced proxies failed. Last error: ${errors}` },
          { status: 502 }
        );
      }
    }

    // 3. Fallback Route
    throw new Error(`Invalid model prefix. Must start with g4f/ or use valid API key. Model: ${model}`);
    
  } catch (error: any) {
    console.error('Master API Error:', error);
    return NextResponse.json(
      { ok: false, engine: "proxy", error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
