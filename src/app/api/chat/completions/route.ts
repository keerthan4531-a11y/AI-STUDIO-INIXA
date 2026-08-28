import { NextResponse } from 'next/server';
import { refreshProxyPool, getNextProxy, getCachedWorkingProxy, setCachedWorkingProxy, getProxyPool } from '@/lib/proxyPool';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import nodeFetch from 'node-fetch';

// ═══════════════════════════════════════════════════════════════════
// Chat API Route — Forwards to 9router (decolua)
// ═══════════════════════════════════════════════════════════════════
// 9router runs at localhost:20128 (local) or deployed URL (Render).
// OpenAI-compatible endpoint: /v1/chat/completions
// No API key needed for local. For deployed: set NINE_ROUTER_API_KEY.
// IP-based rate limiting: 50 req / 15 min per user IP.
// ═══════════════════════════════════════════════════════════════════

// --- Free LLM API Scraper (Model-Aware) ---
// Parses keys from GitHub README grouped by model
interface ScrapedKeyEntry { key: string; model: string; }
let cachedScrapedKeys: ScrapedKeyEntry[] = [];
let lastScrapeTime = 0;
const SCRAPE_URL = 'https://raw.githubusercontent.com/alistaitsacle/free-llm-api-keys/main/README.md';
const SCRAPE_INTERVAL = 5 * 60 * 1000; // 5 minutes

async function scrapeKeys(): Promise<ScrapedKeyEntry[]> {
  try {
    const res = await fetch(SCRAPE_URL, { cache: 'no-store' });
    const text = await res.text();
    const entries: ScrapedKeyEntry[] = [];

    // Parse table rows: | `sk-XXX` | model-name | ... |
    const tableRowRegex = /\|\s*`(sk-[a-zA-Z0-9_-]+)`\s*\|\s*([a-zA-Z0-9._\/-]+)\s*\|/g;
    let match;
    while ((match = tableRowRegex.exec(text)) !== null) {
      entries.push({ key: match[1], model: match[2] });
    }
    return entries;
  } catch (e) {
    console.error('Failed to scrape keys:', e);
    return [];
  }
}

async function getAllScrapedKeys(targetModel?: string): Promise<ScrapedKeyEntry[]> {
  const now = Date.now();
  if (now - lastScrapeTime > SCRAPE_INTERVAL || cachedScrapedKeys.length === 0) {
    const fresh = await scrapeKeys();
    if (fresh.length > 0) {
      cachedScrapedKeys = fresh;
      lastScrapeTime = now;
      console.log(`[Scraper] Loaded ${fresh.length} keys for models: ${[...new Set(fresh.map(e => e.model))].join(', ')}`);
    }
  }

  if (cachedScrapedKeys.length === 0) return [];

  if (targetModel) {
    const modelKeys = cachedScrapedKeys.filter(e => e.model.endsWith(targetModel));
    if (modelKeys.length > 0) {
      return modelKeys;
    }
    // fallback to generic keys if specific model not found
    return cachedScrapedKeys;
  }
  
  return cachedScrapedKeys;
}

async function getScrapedKey(targetModel?: string): Promise<string> {
  const now = Date.now();
  if (now - lastScrapeTime > SCRAPE_INTERVAL || cachedScrapedKeys.length === 0) {
    const fresh = await scrapeKeys();
    if (fresh.length > 0) {
      cachedScrapedKeys = fresh;
      lastScrapeTime = now;
      console.log(`[Scraper] Loaded ${fresh.length} keys for models: ${[...new Set(fresh.map(e => e.model))].join(', ')}`);
    }
  }

  if (cachedScrapedKeys.length === 0) return '';

  // Try to find a key for the specific model first
  if (targetModel) {
    const modelKeys = cachedScrapedKeys.filter(e => e.model.endsWith(targetModel));
    if (modelKeys.length > 0) {
      return modelKeys[Math.floor(Math.random() * modelKeys.length)].key;
    }
  }
  // Fallback: return any random key
  return cachedScrapedKeys[Math.floor(Math.random() * cachedScrapedKeys.length)].key;
}

// ─── IP-Based Rate Limiter (In-Memory) ─────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Cleanup stale entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();
function cleanupStaleEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}

// Extract real client IP — Cloudflare, Nginx, Vercel support
function getClientIP(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown-ip'
  );
}
const CHART_SYSTEM_PROMPT = `You are a helpful assistant. You have the ability to render beautiful interactive charts (Bar Chart, Line Chart, Pie Chart, Scatter Plot) directly in the chat interface.

To render a chart, you MUST output a raw JSON block wrapped in a markdown code block with the "json" language specifier, having this exact schema (do not add any markdown formatting or comments inside the JSON block):
\`\`\`json
{
  "type": "bar" | "line" | "pie" | "scatter",
  "title": "A clear, descriptive title in the user's language",
  "data": [
    { "name": "Label 1", "metric1": value1, "metric2": value2 },
    { "name": "Label 2", "metric1": value3, "metric2": value4 }
  ],
  "dataKeys": ["metric1", "metric2"],
  "colors": ["#3b82f6", "#10b981"] // Use custom colors corresponding to metrics
}
\`\`\`

Rules for charts:
1. "type" can be "bar", "line", "pie", or "scatter".
2. "dataKeys" is an array of strings representing the keys in the data objects that contain numeric values to be plotted.
3. For "pie" charts, the "data" items should have a "name" key (the category label) and a value key (e.g. "value" or any key in "dataKeys").
4. For "scatter" plots, the "data" items should have a numeric key (for X-axis, which is the key not listed in dataKeys) and a numeric key in "dataKeys" (for Y-axis). E.g. data: [{ "x": 10, "y": 20 }] with dataKeys: ["y"].`;

export async function POST(req: Request) {
  try {
    const rawBodyText = await req.text();
    let body;
    try {
      body = JSON.parse(rawBodyText);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const deviceId = req.headers.get('X-Device-Id') || 'unknown-device';

    // 2. CORS / Origin Check
    const origin = req.headers.get("origin") || req.headers.get("referer") || "";
    const allowedOrigins = [
      "localhost",
      "127.0.0.1",
      "ai-studio-inixa.vercel.app",
      "inixa.vercel.app",
      "vercel.app",
    ];

    const isOriginAllowed = !origin || allowedOrigins.some((allowed) => origin.includes(allowed));
    let authHeader = req.headers.get("authorization");
    const SERVER_SECRET = process.env.INIXA_PROXY_SECRET;

    const hasValidServerSecret = SERVER_SECRET && authHeader && authHeader.includes(SERVER_SECRET);

    if (!isOriginAllowed && !hasValidServerSecret) {
      console.warn(`[Security] Blocked unauthorized request from Origin: ${origin}`);
      return NextResponse.json({ error: "Forbidden: Invalid Origin" }, { status: 403 });
    }

    const ip = getClientIP(req);
    const rateLimitKey = `${ip}-${deviceId}`;

    // ── IP Rate Limit: 50 requests per 15 minutes per IP/Device ──
    const windowMs = 15 * 60 * 1000;
    const maxRequests = 50;
    const now = Date.now();

    cleanupStaleEntries();

    let remaining = maxRequests;
    let resetTime = now + windowMs;

    if (rateLimitMap.has(rateLimitKey)) {
      const record = rateLimitMap.get(rateLimitKey)!;
      if (now > record.resetTime) {
        rateLimitMap.set(rateLimitKey, { count: 1, resetTime: now + windowMs });
        remaining = maxRequests - 1;
        resetTime = now + windowMs;
      } else {
        if (record.count >= maxRequests) {
          return NextResponse.json(
            {
              error: 'Rate limit exceeded. Try again later.',
              retryAfter: Math.ceil((record.resetTime - now) / 1000)
            },
            {
              status: 429,
              headers: {
                'X-RateLimit-Limit': String(maxRequests),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': String(Math.ceil(record.resetTime / 1000)),
                'Retry-After': String(Math.ceil((record.resetTime - now) / 1000)),
              }
            }
          );
        }
        record.count++;
        remaining = maxRequests - record.count;
        resetTime = record.resetTime;
      }
    } else {
      rateLimitMap.set(rateLimitKey, { count: 1, resetTime: now + windowMs });
      remaining = maxRequests - 1;
      resetTime = now + windowMs;
    }

    const { messages, model, message, stream } = body;

    // Support both formats:
    // 1. { messages: [...], model: "..." } — full conversation
    // 2. { message: "...", model: "..." } — single message (legacy)
    const chatMessages = messages || [{ role: 'user', content: message }];
    let selectedModel = model || 'gemini-2.5-flash';

    if (!chatMessages || chatMessages.length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Prepend or inject the CHART_SYSTEM_PROMPT to help LLM render correct charts
    const hasSystemMsg = chatMessages.some((m: any) => m.role === 'system');
    const formattedMessages = hasSystemMsg
      ? chatMessages.map((m: any) => m.role === 'system' ? { ...m, content: CHART_SYSTEM_PROMPT + "\n\n" + m.content } : m)
      : [{ role: 'system', content: CHART_SYSTEM_PROMPT }, ...chatMessages];

    // ── Forward to Cloudflare Worker (UNIVERSAL PROXY) ──
    const CF_WORKER_URL = process.env.CF_WORKER_URL || 'https://ultimate-ai-worker.haruyhari930.workers.dev';
    let ROUTER_URL = `${CF_WORKER_URL}/v1/chat/completions`;
    let ROUTER_API_KEY = '';

    console.log(`[Route] Original selectedModel = "${selectedModel}"`);

    // ── Fallback for deprecated Pollinations models ──
    // Pollinations recently restricted anonymous API access to ONLY 'openai-fast' (GPT-OSS).
    // Any other model selected on Pollinations will either fail or return GPT.
    // We reroute these to equivalent working free endpoints.
    if (selectedModel.startsWith('poll/')) {
      if (selectedModel.includes('deepseek')) {
        selectedModel = 'auto/deepseek-chat';
        console.log(`[Fallback] Rerouted Pollinations DeepSeek to auto/deepseek-chat`);
      } else if (selectedModel.includes('sonar') || selectedModel.includes('grok')) {
        selectedModel = 'ddg/gpt-4o-mini';
        console.log(`[Fallback] Rerouted Pollinations model to ddg/gpt-4o-mini`);
      }
    }

    console.log(`[Route] Final selectedModel = "${selectedModel}"`);

    // ── Route: Chinese Reverse Proxies (Local & Configured) ──
    const isChineseProxyModel = [
      'qwen-free/', 'kimi-free/', 'glm-free/', 'step-free/',
      'spark-free/', 'metaso-free/', 'parallel-chat/', 'coze/'
    ].some(prefix => selectedModel.startsWith(prefix));

    if (isChineseProxyModel) {
      let targetUrl = '';
      let actualModel = '';
      let authHeader = '';

      if (selectedModel.startsWith('qwen-free/')) {
        actualModel = selectedModel.replace('qwen-free/', '');
        if (actualModel === 'qwen-max') actualModel = 'qwen-max';
        else if (actualModel === 'qwen-plus') actualModel = 'qwen-plus';
        else if (actualModel === 'qwen-3.6-plus') actualModel = 'qwen-plus';

        targetUrl = `${process.env.QWEN_FREE_API_URL || 'http://localhost:8000'}/v1/chat/completions`;
      } else if (selectedModel.startsWith('kimi-free/')) {
        actualModel = selectedModel.replace('kimi-free/', '');
        if (actualModel === 'kimi-k3') actualModel = 'kimi-k3';
        else if (actualModel === 'kimi-k2.6') actualModel = 'kimi-k2.6';

        targetUrl = `${process.env.KIMI_FREE_API_URL || 'http://localhost:8001'}/v1/chat/completions`;
      } else if (selectedModel.startsWith('glm-free/')) {
        actualModel = selectedModel.replace('glm-free/', '');
        if (actualModel === 'glm-5') actualModel = 'glm-5';
        else if (actualModel === 'glm-4-plus') actualModel = 'glm-4-plus';

        targetUrl = `${process.env.GLM_FREE_API_URL || 'http://localhost:8002'}/v1/chat/completions`;
      } else if (selectedModel.startsWith('step-free/')) {
        actualModel = selectedModel.replace('step-free/', '');
        if (actualModel === 'step-2') actualModel = 'step-2';

        targetUrl = `${process.env.STEP_FREE_API_URL || 'http://localhost:8003'}/v1/chat/completions`;
      } else if (selectedModel.startsWith('spark-free/')) {
        actualModel = selectedModel.replace('spark-free/', '');
        if (actualModel === 'spark-desk-v4.5') actualModel = 'spark-desk-v4.5';

        targetUrl = `${process.env.SPARK_FREE_API_URL || 'http://localhost:8004'}/v1/chat/completions`;
      } else if (selectedModel.startsWith('metaso-free/')) {
        actualModel = selectedModel.replace('metaso-free/', '');
        if (actualModel === 'metaso-search') actualModel = 'metaso-search';

        targetUrl = `${process.env.METASO_FREE_API_URL || 'http://localhost:8005'}/v1/chat/completions`;
      } else if (selectedModel.startsWith('parallel-chat/')) {
        actualModel = selectedModel.replace('parallel-chat/', '');
        targetUrl = `${process.env.PARALLEL_CHAT_URL || 'http://localhost:8006'}/v1/chat/completions`;
      } else if (selectedModel.startsWith('coze/')) {
        actualModel = selectedModel.replace('coze/', '');
        targetUrl = `${process.env.COZE_PROXY_URL || 'http://localhost:8007'}/v1/chat/completions`;
      }

      console.log(`[Chinese Proxy Route] Routing model "${selectedModel}" (actual: "${actualModel}") strictly to local URL: "${targetUrl}"`);

      try {
        const reqHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Forwarded-For': ip,
          'X-Real-IP': ip,
        };
        if (authHeader) {
          reqHeaders['Authorization'] = authHeader;
        }

        const proxyRes = await fetch(targetUrl, {
          method: 'POST',
          headers: reqHeaders,
          body: JSON.stringify({
            model: actualModel,
            messages: formattedMessages,
            stream: stream === true,
            max_tokens: 8000,
            temperature: 0.7
          }),
        });

        if (proxyRes.ok) {
          console.log(`[Chinese Proxy] Connection succeeded to local server ${targetUrl}`);
          if (stream === true && proxyRes.body) {
            return new Response(proxyRes.body as any, {
              headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-RateLimit-Limit': String(maxRequests),
                'X-RateLimit-Remaining': String(remaining),
                'X-RateLimit-Reset': String(Math.ceil(resetTime / 1000)),
              },
            });
          }
          const data = await proxyRes.json();
          return NextResponse.json(data, {
            headers: {
              'X-RateLimit-Limit': String(maxRequests),
              'X-RateLimit-Remaining': String(remaining),
              'X-RateLimit-Reset': String(Math.ceil(resetTime / 1000)),
            }
          });
        } else {
          throw new Error(`Upstream API returned status ${proxyRes.status}`);
        }
      } catch (err: any) {
        console.error(`[Chinese Proxy Connection Error] Failed to reach local proxy at ${targetUrl}: ${err.message || err}`);
        return NextResponse.json(
          { error: `Chinese Proxy Connection Failed: Cannot reach local proxy at ${targetUrl}. Please ensure your local reverse proxy server is running.` },
          { status: 502 }
        );
      }
    }

    // ── Route: DDG engine (Direct DuckDuckGo AI Chat) ──
    // DDG blocks VQD from Cloudflare Workers, so we MUST call directly from Next.js server
    if (selectedModel.startsWith('ddg/')) {
      const ddgModelStr = selectedModel.replace('ddg/', '');
      console.log(`[DDG] Routing to DuckDuckGo with model: ${ddgModelStr}`);
      try {
        // Step 1: Get VQD token
        const statusRes = await fetch('https://duckduckgo.com/duckchat/v1/status', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://duckduckgo.com/',
            'Origin': 'https://duckduckgo.com',
            'x-vqd-accept': '1',
            'Cache-Control': 'no-store',
            'X-Forwarded-For': ip,
            'X-Real-IP': ip,
          }
        });

        const vqd = statusRes.headers.get('x-vqd-4');
        if (!vqd) {
          throw new Error(`VQD token fetch failed (HTTP ${statusRes.status})`);
        }

        // Step 2: Send chat request
        // Only send simple role/content messages (no system prompts for DDG)
        const ddgMessages = formattedMessages
          .filter((m: any) => m.role !== 'system')
          .map((m: any) => ({ role: m.role, content: typeof m.content === 'string' ? m.content : String(m.content) }));

        const chatRes = await fetch('https://duckduckgo.com/duckchat/v1/chat', {
          method: 'POST',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept': 'text/event-stream',
            'Accept-Language': 'en-US,en;q=0.9',
            'Content-Type': 'application/json',
            'Referer': 'https://duckduckgo.com/',
            'Origin': 'https://duckduckgo.com',
            'x-vqd-4': vqd,
            'X-Forwarded-For': ip,
            'X-Real-IP': ip,
          },
          body: JSON.stringify({ model: ddgModelStr, messages: ddgMessages }),
        });

        if (!chatRes.ok) {
          throw new Error(`DDG chat error: HTTP ${chatRes.status}`);
        }

        if (stream === true && chatRes.body) {
          console.log(`[DDG] Streaming response started`);

          // Convert DDG stream format to OpenAI stream format
          const transformStream = new TransformStream({
            transform(chunk, controller) {
              const decoder = new TextDecoder();
              const encoder = new TextEncoder();
              const text = decoder.decode(chunk);
              const lines = text.split('\n');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const dataStr = line.slice(6).trim();
                  if (dataStr === '[DONE]') {
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    continue;
                  }
                  try {
                    const parsed = JSON.parse(dataStr);
                    if (parsed.message != null) {
                      const openaiChunk = {
                        id: `chatcmpl-ddg-${Date.now()}`,
                        object: 'chat.completion.chunk',
                        created: Math.floor(Date.now() / 1000),
                        model: ddgModelStr,
                        choices: [{ index: 0, delta: { content: parsed.message }, finish_reason: null }],
                      };
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
                    }
                  } catch { }
                }
              }
            },
            flush(controller) {
              const encoder = new TextEncoder();
              const finalChunk = { id: `chatcmpl-ddg-${Date.now()}`, object: 'chat.completion.chunk', created: Math.floor(Date.now() / 1000), model: ddgModelStr, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\n`));
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            }
          });

          return new Response(chatRes.body.pipeThrough(transformStream), {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
              'X-RateLimit-Limit': String(maxRequests),
              'X-RateLimit-Remaining': String(remaining),
              'X-RateLimit-Reset': String(Math.ceil(resetTime / 1000)),
            },
          });
        }

        // Step 3: Parse SSE response for non-streaming mode
        const sseTxt = await chatRes.text();
        let content = '';
        for (const line of sseTxt.split('\n')) {
          if (line.startsWith('data: ') && !line.includes('[DONE]')) {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.message) content += parsed.message;
            } catch { }
          }
        }

        if (content) {
          console.log(`[DDG] Success! Response length: ${content.length}`);
          return NextResponse.json(
            { reply: content },
            { headers: { 'X-RateLimit-Limit': String(maxRequests), 'X-RateLimit-Remaining': String(remaining), 'X-RateLimit-Reset': String(Math.ceil(resetTime / 1000)) } }
          );
        }

        throw new Error('Empty response from DDG');
      } catch (e: any) {
        console.warn(`[DDG Fallback] DDG failed: ${e.message || e}. Falling back to Cloudflare Worker proxy...`);

        if (selectedModel.toLowerCase().includes('gpt')) {
          return NextResponse.json(
            { error: `GPT model failed: ${e.message || e}`, reply: `⚠️ GPT Error: The model failed to respond. No fallback available.` },
            { status: 502, headers: { 'X-RateLimit-Limit': String(maxRequests), 'X-RateLimit-Remaining': String(remaining), 'X-RateLimit-Reset': String(Math.ceil(resetTime / 1000)) } }
          );
        }

        // Determine the best fallback model based on the requested model string
        let fallbackModel = 'gemini/gemini-2.5-flash'; // stable default fallback
        if (ddgModelStr.includes('llama')) {
          fallbackModel = 'sb/Meta-Llama-3.3-70B-Instruct';
        } else if (ddgModelStr.includes('mistral') || ddgModelStr.includes('mixtral')) {
          fallbackModel = 'sb/Meta-Llama-3.3-70B-Instruct';
        }

        console.log(`[DDG Fallback] Rerouted request model from "${selectedModel}" to "${fallbackModel}"`);
        selectedModel = fallbackModel;
      }
    }


    // ── Route: Pollinations engine (Direct Server-Side API) ──
    if (selectedModel.startsWith('poll/')) {
      const pollModelStr = selectedModel.replace('poll/', '');
      console.log(`[Pollinations] Routing to text.pollinations.ai with model: ${pollModelStr}`);
      try {
        const pollRes = await fetch('https://text.pollinations.ai/openai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'openai', // The legacy endpoint only accepts 'openai', 'openai-large', etc.
            messages: formattedMessages,
            stream: stream === true,
          }),
        });

        if (!pollRes.ok) {
          const errText = await pollRes.text();
          console.error('[Pollinations] API error:', pollRes.status, errText);
          return NextResponse.json(
            { error: `Pollinations API error: ${errText.slice(0, 200)}`, reply: `⚠️ Pollinations API error (${pollRes.status}). The endpoint may be temporarily unavailable.` },
            { status: 502, headers: { 'X-RateLimit-Remaining': String(remaining) } }
          );
        }

        if (stream === true && pollRes.body) {
          console.log(`[Pollinations] Streaming response started`);
          return new Response(pollRes.body, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
              'X-RateLimit-Limit': String(maxRequests),
              'X-RateLimit-Remaining': String(remaining),
              'X-RateLimit-Reset': String(Math.ceil(resetTime / 1000)),
            },
          });
        }

        const data = await pollRes.json();
        const content = data.choices?.[0]?.message?.content || data.content || '';

        if (content) {
          console.log(`[Pollinations] Success! Response length: ${content.length}`);
          return NextResponse.json(
            { reply: content },
            { headers: { 'X-RateLimit-Limit': String(maxRequests), 'X-RateLimit-Remaining': String(remaining), 'X-RateLimit-Reset': String(Math.ceil(resetTime / 1000)) } }
          );
        }

        return NextResponse.json(
          { error: 'Empty Pollinations response', reply: '⚠️ Pollinations returned empty response. Please try again.' },
          { status: 502 }
        );
      } catch (e) {
        console.error('[Pollinations] API fetch error:', e);
        return NextResponse.json({ error: 'Failed to reach Pollinations', reply: '⚠️ Could not connect to Pollinations AI. Please try a different model.' }, { status: 500 });
      }
    }

    // ── Route: G4F / Qwen / OverChat (Local forward to /api/chat/g4f) ──
    if (selectedModel.startsWith('g4f/') || selectedModel.startsWith('overchat/') || selectedModel.startsWith('qwen_worker/')) {
       console.log(`[Route] Forwarding to /api/chat/g4f for model: ${selectedModel}`);
       
       const protocol = req.headers.get('x-forwarded-proto') || 'http';
       const host = req.headers.get('host') || '127.0.0.1:3000';
       const g4fUrl = `${protocol}://${host}/api/chat/g4f`;

       try {
         const g4fRes = await fetch(g4fUrl, {
           method: 'POST',
           headers: {
              'Content-Type': 'application/json',
              'x-forwarded-for': ip,
              'x-real-ip': ip,
              'authorization': 'Bearer g4f_internal_forward',
              'origin': `http://${host}`,
              'referer': `http://${host}/`
           },
           body: JSON.stringify({ ...body, model: selectedModel })
         });

         if (stream === true && g4fRes.ok) {
           const upstreamContentType = g4fRes.headers.get('content-type') || 'text/event-stream';
           return new Response(g4fRes.body, {
             status: g4fRes.status,
             headers: {
               'Content-Type': upstreamContentType,
               'Cache-Control': 'no-cache',
               'Connection': 'keep-alive',
               'X-RateLimit-Limit': String(maxRequests),
               'X-RateLimit-Remaining': String(remaining),
               'X-RateLimit-Reset': String(Math.ceil(resetTime / 1000)),
             },
           });
         }

         const g4fData = await g4fRes.json();
         return NextResponse.json(g4fData, {
             status: g4fRes.status,
             headers: {
               'X-RateLimit-Limit': String(maxRequests),
               'X-RateLimit-Remaining': String(remaining),
               'X-RateLimit-Reset': String(Math.ceil(resetTime / 1000)),
             }
         });
       } catch (error: any) {
         console.error('[G4F Forward] Error:', error);
         return NextResponse.json({ error: 'Failed to forward to G4F route' }, { status: 500 });
       }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Forwarded-For': ip,
      'X-Real-IP': ip,
    };

    let proxyResponse: Response = new Response(JSON.stringify({ error: { message: "Internal route unhandled" } }), { status: 500 });

    // Direct Microsoft Copilot native routing (via Cloudflare Worker)
    if (selectedModel.startsWith('ms-copilot/')) {
      const copilotModel = selectedModel.replace('ms-copilot/', '');
      console.log(`[Copilot Route] Routing via Cloudflare Worker for model: ${copilotModel}`);
      proxyResponse = await fetch(`${CF_WORKER_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: copilotModel,
          messages: formattedMessages,
          stream: stream === true,
        }),
      });
    }
    // Direct Meta AI native routing (via Cloudflare Worker)
    else if (selectedModel.startsWith('meta-ai/')) {
      const metaModel = selectedModel.replace('meta-ai/', '');
      console.log(`[Meta Route] Routing via Cloudflare Worker for model: ${metaModel}`);
      proxyResponse = await fetch(`${CF_WORKER_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: metaModel,
          messages: formattedMessages,
          stream: stream === true,
        }),
      });
    }
    // Direct Baidu Ernie AI routing (via Cloudflare Worker)
    else if (selectedModel.startsWith('ernie/')) {
      const ernieModel = selectedModel.replace('ernie/', '');
      console.log(`[Ernie Route] Routing via Cloudflare Worker for model: ${ernieModel}`);
      proxyResponse = await fetch(`${CF_WORKER_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: ernieModel,
          messages: formattedMessages,
          stream: stream === true,
        }),
      });
    }
    // Direct MiniToolAI routing (Automated Python Bridge with Direct Fallback)
    else if (selectedModel.startsWith('minitool/')) {
      const minitoolModel = selectedModel.replace('minitool/', '');
      console.log(`[MiniTool Route] Routing for model: ${minitoolModel}`);

      const candidateUrls = [
        process.env.PYTHON_BRIDGE_URL,
        'http://localhost:8000',
        'https://ai-studio-inixa.onrender.com'
      ].filter(Boolean) as string[];

      let pySuccess = false;

      // 1. Try Automated Python Bridge (Local or Render Cloud 24/7)
      for (const bridgeUrl of candidateUrls) {
        try {
          const pyRes = await fetch(`${bridgeUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: minitoolModel,
              messages: formattedMessages,
              stream: stream === true,
            }),
            signal: AbortSignal.timeout(35000),
          });

          if (pyRes.ok) {
            console.log(`[MiniTool Route] Successfully served via Python Bridge (${bridgeUrl})!`);
            proxyResponse = pyRes;
            pySuccess = true;
            break;
          } else {
            console.warn(`[MiniTool Route] Python bridge (${bridgeUrl}) returned ${pyRes.status}`);
          }
        } catch (e: any) {
          console.log(`[MiniTool Route] Bridge ${bridgeUrl} unavailable: ${e.message}`);
        }
      }

      // 2. Fallback to direct session fetch if Python Bridge is not active
      if (!pySuccess) {
        const mtCookie = process.env.MINITOOL_COOKIE || 'PHPSESSID=5e03fd540d5d7d05a03af22469ec2c41; cf_clearance=QmWOKfypgzEJBHRWZ4E.9gxPMjvGTtmRgSEla_Chb28-1787908237-1.2.1.1-zsjD6L4Anxrk0NG7ctMjlPYe41.zHiTv4VkFb.Uxr7GQ4rQliCGdM1QHptnnNhYvPwanKOjADF6Oww6Ry9VE1.eaSG5BXlxa1HCHG_ycaFXJMYx3_33FM.3jcIaIhki22iCBQ4VIZcbH0PRGf5mEQzidz3zYao1nRwUPPdlhV5za212_eud2KILxft7PZaylRNjrIg0T6VMN_08s0c8_nRPQHyptmaDU98qonw.dEfNESqL8CvG6zfpcmYOFAUVPkGU.khWGAWW1iUy96Q6MmExtl4oC7JXLVXfLepvDrPRp_M_upqad61Ccm.947l4FEV9xFxQD1BSzt5MVHdnSEGmI4Q5hFW5FrTC1AX1ERWHSRY02f85f.qz6U40qyyQ0L4XLWXsk3U_zmbIENh4TVaBwKj9CfAFO_hAELoBwjcz8qw54Vlr4Ok2OhlgZ_BpiWRvzG1DrLMYYtmb9IXVGcWgvY3_7uuld7caDoRbG7c2sPL8xc77gGzgxUU1YpJskRbiWy4gmGe_8JytWm5c2pw; uDevice=notapple; _ga=GA1.1.588016467.1787908240; _ga_TDY3XB0LQQ=GS2.1.s1787908236$o1$g1$t1787908245$j55$l0$h1764203097';
        const mtUtoken = process.env.MINITOOL_UTOKEN || 'ddf626bb3fa5c45da0c1fc05ab63de17bd43b4eed2866dcd7a76fe1132bcbc32';
        const mtSafety = process.env.MINITOOL_SAFETY || 'f149e4c58d7eda024a836e850d80d21443b1a457915b8e08ad4f72627f111c53';

        const userMsgs = chatMessages.filter((m: any) => m.role === 'user');
        const botMsgs = chatMessages.filter((m: any) => m.role === 'assistant');
        const lastMsg = userMsgs.length > 0 ? (typeof userMsgs[userMsgs.length-1].content === 'string' ? userMsgs[userMsgs.length-1].content : JSON.stringify(userMsgs[userMsgs.length-1].content)) : '';
        const prevU1 = userMsgs.length >= 2 ? userMsgs[userMsgs.length-2]?.content || '' : '';
        const prevB1 = botMsgs.length >= 1 ? botMsgs[botMsgs.length-1]?.content || '' : '';
        const prevU2 = userMsgs.length >= 3 ? userMsgs[userMsgs.length-3]?.content || '' : '';
        const prevB2 = botMsgs.length >= 2 ? botMsgs[botMsgs.length-2]?.content || '' : '';

        try {
          const form = new URLSearchParams({
            messagebase64img1: '',
            messagebase64img0: '',
            safety_identifier: mtSafety,
            select_model: minitoolModel,
            temperature: '0.7',
            utoken: mtUtoken,
            message: lastMsg,
            umes1a: typeof prevU1 === 'string' ? prevU1 : JSON.stringify(prevU1),
            umes1stimg1a: '', umes2ndimg1a: '',
            bres1a: typeof prevB1 === 'string' ? prevB1 : JSON.stringify(prevB1),
            umes2a: typeof prevU2 === 'string' ? prevU2 : JSON.stringify(prevU2),
            umes1stimg2a: '', umes2ndimg2a: '',
            bres2a: typeof prevB2 === 'string' ? prevB2 : JSON.stringify(prevB2),
            cft: 'direct',
          });

          const postRes = await fetch('https://minitoolai.com/gpt-ai/chatgpt_stream.php', {
            method: 'POST',
            headers: {
              'Origin': 'https://minitoolai.com',
              'Referer': 'https://minitoolai.com/gpt-ai/',
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              'X-Requested-With': 'XMLHttpRequest',
              'Cookie': mtCookie,
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
            },
            body: form.toString()
          });

          const streamToken = await postRes.text();
          if (!streamToken || streamToken === 'refresh' || streamToken.length < 5) {
            throw new Error(`MiniTool session invalid or expired (token: ${streamToken})`);
          }

        const sseRes = await fetch(`https://minitoolai.com/gpt-ai/chatgpt_stream.php?streamtoken=${streamToken}`, {
          headers: {
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Cookie': mtCookie,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
            'Referer': 'https://minitoolai.com/gpt-ai/'
          }
        });

        if (!sseRes.ok) {
          throw new Error(`MiniTool SSE fetch failed with status ${sseRes.status}`);
        }

        // Transform MiniTool SSE stream into standard OpenAI chunk stream
        const transformStream = new TransformStream({
          transform(chunk, controller) {
            const text = new TextDecoder().decode(chunk);
            const lines = text.split('\n');
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('data:')) {
                const jsonStr = trimmed.slice(5).trim();
                if (!jsonStr) continue;
                try {
                  const data = JSON.parse(jsonStr);
                  if (data.type === 'response.output_text.delta' && data.delta) {
                    const openaiChunk = {
                      id: `chatcmpl-mt-${Date.now()}`,
                      object: 'chat.completion.chunk',
                      created: Math.floor(Date.now() / 1000),
                      model: selectedModel,
                      choices: [{ index: 0, delta: { content: data.delta }, finish_reason: null }]
                    };
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
                  } else if (data.type === 'response.completed') {
                    const stopChunk = {
                      id: `chatcmpl-mt-${Date.now()}`,
                      object: 'chat.completion.chunk',
                      created: Math.floor(Date.now() / 1000),
                      model: selectedModel,
                      choices: [{ index: 0, delta: {}, finish_reason: 'stop' }]
                    };
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(stopChunk)}\n\n`));
                    controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
                  }
                } catch(e) {}
              }
            }
          }
        });

        proxyResponse = new Response(sseRes.body!.pipeThrough(transformStream), {
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          }
        });
      } catch (e: any) {
        console.error(`[MiniTool Route] Connection error: ${e.message}`);
        proxyResponse = new Response(JSON.stringify({ error: { message: `MiniTool connection error: ${e.message}` } }), { status: 502, headers: { 'Content-Type': 'application/json' } });
      }
    }
  }
    // Direct OxAlpha routing (Strict direct - no fallback)
    else if (selectedModel.startsWith('oxalpha/')) {
      const oxModel = selectedModel.replace('oxalpha/', '');
      console.log(`[OxAlpha Route] Direct OxAlpha execution for model: ${oxModel}`);

      // Filter and clean messages (OxAlpha only allows user & assistant)
      let cleanMessages = chatMessages.map((m: any) => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
      }));
      const systemParts = cleanMessages.filter((m: any) => m.role === 'system').map((m: any) => m.content);
      cleanMessages = cleanMessages.filter((m: any) => m.role !== 'system');
      if (systemParts.length > 0 && cleanMessages.length > 0) {
        const firstUserIdx = cleanMessages.findIndex((m: any) => m.role === 'user');
        if (firstUserIdx !== -1) {
          cleanMessages[firstUserIdx] = {
            role: 'user',
            content: systemParts.join('\n') + '\n\n' + cleanMessages[firstUserIdx].content
          };
        } else {
          cleanMessages.unshift({ role: 'user', content: systemParts.join('\n') });
        }
      }

      const oxCookies = process.env.OXALPHA_COOKIE || 'XSRF-TOKEN=eyJpdiI6ImdLaDJhWlVZSXNKN1lXR3ZrY1dET0E9PSIsInZhbHVlIjoianpwRzdwRzIxK0t2MUdtYnh3NHRsa0hMMGF3RFE1eDJZckJFMUh6RUxWbUNvVjVJZ2xpT2syWFV2cmtWNFArdXErWkI4Wmd1dzIveUhueFlOSDRJbllFWkJJc3dPMkVTOVpLSm1nZnVkY0NLMjc4RDZ6QlRVN3NPRWZPYXJvT0IiLCJtYWMiOiIzZWVhMGM0YzcxNjAxMzhiNTc0YTI4MWE0NDRjYTg3ODY0M2MwNjU4YTE5YWYyZDA3YWIxOTE5NDUxNzZkOWMyIiwidGFnIjoiIn0%3D; ox_alpha_session=eyJpdiI6IlJDTCs5QnowY0p5anQzK0dPaWZReVE9PSIsInZhbHVlIjoiYnhCeW5jNGNRYmVId0pIT3dmc0tTMmFGSFFKUWlBM2R1NnNrZmFXNkhkNDFRQ21Ha3dTYTZBdXlwYnRoWW94NmZqa1dlYUorSXBBWG56SmV2UWgrY0JpWjZYZnhKcHBXcUJIQXd3SGlTYm9CZ3VmQklTWE45WTdMT2JIU3NoQVIiLCJtYWMiOiIyZTAxMjI4ZDM5ZTMyODMxMjUyMzQ3OWNiZDk4ZTU1YjFlYTcxNWMyMTQ4ZWEyNjE1NWJlNzQ4OGMxZDk4YTFlIiwidGFnIjoiIn0%3D; _ga=GA1.1.2066746023.1787904545; _ga_CX9YVRPWDX=GS2.1.s1787904544$o1$g1$t1787906463$j43$l0$h0';
      const oxCsrf = process.env.OXALPHA_CSRF || 'ssaVZTBaFa2USH3GbBxQXFYKQOJuwx36zwvqVmPB';

      try {
        proxyResponse = await fetch('https://oxalpha.com/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Origin': 'https://oxalpha.com',
            'Referer': 'https://oxalpha.com/chat',
            'X-CSRF-TOKEN': oxCsrf,
            'Cookie': oxCookies,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36'
          },
          body: JSON.stringify({
            model: 'z-ai/glm-5.3-flash',
            messages: cleanMessages
          })
        });
      } catch (e: any) {
        console.error(`[OxAlpha Route] Direct OxAlpha connection failed: ${e.message}`);
        proxyResponse = new Response(JSON.stringify({ error: { message: `OxAlpha connection error: ${e.message}` } }), { status: 502, headers: { 'Content-Type': 'application/json' } });
      }
    }
    // Direct Google Gemini API routing
    else if (selectedModel.startsWith('gemini/')) {
      const geminiModel = selectedModel.replace('gemini/', '');
      const geminiApiKey = process.env.GEMINI_API_KEY;
      
      console.log(`[Gemini Route] Direct API routing to Google for model: ${geminiModel}`);
      
      const geminiHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (geminiApiKey) {
        geminiHeaders['Authorization'] = `Bearer ${geminiApiKey}`;
      }
      
      proxyResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
        method: 'POST',
        headers: geminiHeaders,
        body: JSON.stringify({
          model: geminiModel,
          messages: formattedMessages,
          stream: stream === true,
          max_tokens: 8000,
          temperature: 0.7
        }),
      });
    }
    // Experimental: Auto-scraped keys from free-llm-api-keys repo
    else if (selectedModel.startsWith('auto/')) {
      const realModel = selectedModel.replace('auto/', '');
      const scrapedKeys = await getAllScrapedKeys(realModel);

      if (scrapedKeys.length > 0) {
        ROUTER_URL = 'https://aiapiv2.pekpik.com/v1/chat/completions';
        selectedModel = realModel;
        console.log(`[Auto] Racing ${scrapedKeys.length} scraped keys for model: ${realModel}`);

        await refreshProxyPool();
        const controllers = scrapedKeys.map(() => new AbortController());

        const fetchPromises = scrapedKeys.map((entry, i) => {
          return new Promise<any>(async (resolve, reject) => {
             const reqHeaders = { 
              'Content-Type': 'application/json', 
              'Authorization': `Bearer ${entry.key}`,
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'application/json'
             };
             const bodyStr = JSON.stringify({
                model: entry.model,
                messages: formattedMessages,
                stream: stream === true,
                max_tokens: 8000,
                temperature: 0.7
             });

             try {
                const directRes = await fetch(ROUTER_URL, {
                  method: 'POST',
                  headers: reqHeaders,
                  body: bodyStr,
                  signal: controllers[i].signal
                });
                if (directRes.ok) return resolve({ res: directRes, index: i });
             } catch(e) {}

             const proxyPool = getProxyPool();
             if (proxyPool.length === 0) {
               return reject(new Error('Direct fetch failed and no proxies available.'));
             }
             
             const numToRace = Math.min(5, proxyPool.length);
             const proxiesToTry = [];
             const cached = getCachedWorkingProxy();
             if (cached) proxiesToTry.push(cached);
             for(let p=0; p<numToRace; p++) proxiesToTry.push(getNextProxy());

             const racePromises = proxiesToTry.map((proxyUrl) => {
                return new Promise<any>(async (resProxy, rejProxy) => {
                   if (!proxyUrl) return rejProxy(new Error('Empty proxy'));
                   let agent: any;
                   if (proxyUrl.startsWith('socks')) agent = new SocksProxyAgent(proxyUrl);
                   else agent = proxyUrl.startsWith('https') ? new HttpsProxyAgent(proxyUrl) : new HttpProxyAgent(proxyUrl);
                   
                   const proxyFakeIP = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
                   
                   try {
                     const pRes = await nodeFetch(ROUTER_URL, {
                       method: 'POST',
                       headers: { ...reqHeaders, 'X-Forwarded-For': proxyFakeIP },
                       body: bodyStr,
                       agent: agent
                     });
                     if (pRes.ok) {
                        setCachedWorkingProxy(proxyUrl);
                        resProxy(pRes);
                     } else {
                        rejProxy(new Error(`Proxy ${proxyUrl} returned ${pRes.status}`));
                     }
                   } catch(e) {
                     rejProxy(e);
                   }
                });
             });

             try {
               const winnerPRes = await Promise.any(racePromises);
               resolve({ res: winnerPRes, index: i, isNodeFetch: true });
             } catch(e) {
               reject(new Error('All proxies failed for key index ' + i));
             }
          });
        });

        try {
          const winner = await Promise.any(fetchPromises);
          proxyResponse = winner.res;
          // Abort losers
          controllers.forEach((c, i) => {
            if (i !== winner.index) {
              c.abort();
            }
          });
          console.log(`[Auto] Race won by key index ${winner.index}!`);
          
          if (winner.isNodeFetch) {
             const handleStreamingResponse = async (res: any) => {
               if (stream) {
                 const bodyStream = new ReadableStream({
                   start(controller) {
                     res.body.on('data', (chunk: Buffer) => controller.enqueue(chunk));
                     res.body.on('end', () => controller.close());
                     res.body.on('error', (err: Error) => controller.error(err));
                   },
                   cancel() { res.body.destroy(); }
                 });
                 return new Response(bodyStream, {
                   headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' }
                 });
               }
               return NextResponse.json(await res.json());
             };
             return await handleStreamingResponse(proxyResponse);
          }
        } catch (e: any) {
          const errMsg = e.errors ? e.errors.join(' | ') : (e.message || e);
          console.error(`[Auto] All keys failed for ${realModel}: ${errMsg}`);
          require('fs').appendFileSync('auto-error.log', `[${new Date().toISOString()}] ${realModel} error: ${errMsg}\n`);
          proxyResponse = new Response(JSON.stringify({ error: { message: "All API keys failed to respond" } }), { status: 502 });
        }
      } else {
        return NextResponse.json({ error: 'No scraped keys available. GitHub repo might be down or keys exhausted.' }, { status: 500 });
      }
    } else {
      // Normal flow
      if (ROUTER_API_KEY) {
        headers['Authorization'] = `Bearer ${ROUTER_API_KEY}`;
      }
      proxyResponse = await fetch(ROUTER_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: selectedModel,
          messages: formattedMessages,
          stream: stream === true,
          max_tokens: 8000,
          temperature: 0.7
        }),
      });
    }

    if (!proxyResponse.ok) {
      if (selectedModel === 'claude-opus-4-7') {
        console.log(`[Fallback] Opus failed with ${proxyResponse.status}. Racing all available working models...`);

        if (cachedScrapedKeys.length === 0) {
          await getAllScrapedKeys('dummy'); // Populate cache
        }

        if (cachedScrapedKeys.length > 0) {
          const controllers = cachedScrapedKeys.map(() => new AbortController());
          const fetchPromises = cachedScrapedKeys.map(({ key, model }, i) => {
            const reqHeaders = { 
              'Content-Type': 'application/json', 
              'Authorization': `Bearer ${key}`,
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'application/json'
            };
            return fetch('https://aiapiv2.pekpik.com/v1/chat/completions', {
              method: 'POST',
              headers: reqHeaders,
              body: JSON.stringify({
                model: model,
                messages: formattedMessages,
                stream: stream === true,
                max_tokens: 8000,
                temperature: 0.7
              }),
              signal: controllers[i].signal
            }).then(res => {
              if (res.ok) return { res, index: i, model };
              throw `Status ${res.status}`;
            });
          });

          try {
            const winner = await Promise.any(fetchPromises);
            proxyResponse = winner.res;
            selectedModel = winner.model;
            controllers.forEach((c, i) => {
              if (i !== winner.index) c.abort();
            });
            console.log(`[Fallback] Race won by model ${winner.model} with key index ${winner.index}!`);
          } catch (e: any) {
            const errMsg = e.errors ? e.errors.join(' | ') : (e.message || e);
            console.error(`[Fallback] All scraped models failed fallback for Opus: ${errMsg}`);
          }
        }
      }
    }

    if (!proxyResponse.ok) {
      const errorText = await proxyResponse.text();
      console.error('Cloudflare Proxy error:', proxyResponse.status, errorText);

      // Parse error details from Cloudflare Proxy
      let errorMessage = 'AI provider error. ';
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson?.error?.message) {
          errorMessage += errorJson.error.message;
        }
      } catch {
        errorMessage += errorText.slice(0, 200);
      }

      // Return 502 (Bad Gateway) — the upstream provider failed, not our route
      // Return 502 (Bad Gateway) — the upstream provider failed, not our route
      return NextResponse.json(
        { error: errorMessage, reply: `⚠️ ${errorMessage}\n\nPlease check your Cloudflare Worker logs.` },
        {
          status: 502,
          headers: {
            'X-RateLimit-Limit': String(maxRequests),
            'X-RateLimit-Remaining': String(remaining),
            'X-RateLimit-Reset': String(Math.ceil(resetTime / 1000)),
          }
        }
      );
    }

    // If streaming was requested, pass the stream directly to the client
    if (stream === true) {
      return new Response(proxyResponse.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-RateLimit-Limit': String(maxRequests),
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(Math.ceil(resetTime / 1000)),
        },
      });
    }

    const contentType = proxyResponse.headers.get('content-type') || '';
    if (contentType.includes('text/event-stream')) {
      const text = await proxyResponse.text();
      let replyContent = '';
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const data = JSON.parse(jsonStr);
            const delta = data.choices?.[0]?.delta?.content || data.choices?.[0]?.text || '';
            if (delta) replyContent += delta;
          } catch(e) {}
        }
      }
      return NextResponse.json(
        { reply: replyContent || 'Response complete' },
        {
          headers: {
            'X-RateLimit-Limit': String(maxRequests),
            'X-RateLimit-Remaining': String(remaining),
            'X-RateLimit-Reset': String(Math.ceil(resetTime / 1000)),
          }
        }
      );
    }

    const proxyData = await proxyResponse.json();

    const reply = proxyData.choices?.[0]?.message?.content
      || proxyData.content
      || proxyData.reply
      || 'No response from Cloudflare Proxy';

    return NextResponse.json(
      { reply },
      {
        headers: {
          'X-RateLimit-Limit': String(maxRequests),
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(Math.ceil(resetTime / 1000)),
        }
      }
    );

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to Cloudflare Proxy.' },
      { status: 500 }
    );
  }
}
