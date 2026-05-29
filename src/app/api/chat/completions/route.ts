import { NextResponse } from 'next/server';

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
    const tableRowRegex = /\|\s*`(sk-[a-zA-Z0-9_-]+)`\s*\|\s*([a-zA-Z0-9._-]+)\s*\|/g;
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

async function getAllScrapedKeys(targetModel?: string): Promise<string[]> {
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
    const modelKeys = cachedScrapedKeys.filter(e => e.model === targetModel);
    if (modelKeys.length > 0) {
      return modelKeys.map(e => e.key);
    }
  }
  // Fallback: return any random key
  return [cachedScrapedKeys[Math.floor(Math.random() * cachedScrapedKeys.length)].key];
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
    const modelKeys = cachedScrapedKeys.filter(e => e.model === targetModel);
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
    const ip = getClientIP(req);

    // ── IP Rate Limit: 50 requests per 15 minutes per IP ──
    const windowMs = 15 * 60 * 1000;
    const maxRequests = 50;
    const now = Date.now();

    cleanupStaleEntries();

    let remaining = maxRequests;
    let resetTime = now + windowMs;

    if (rateLimitMap.has(ip)) {
      const record = rateLimitMap.get(ip)!;
      if (now > record.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
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
      rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
      remaining = maxRequests - 1;
      resetTime = now + windowMs;
    }

    const body = await req.json();
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
    const CF_WORKER_URL = 'https://divine-leaf-d1cf.antigravity4531.workers.dev';
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
                  } catch {}
                }
              }
            },
            flush(controller) {
               const encoder = new TextEncoder();
               const finalChunk = { id: `chatcmpl-ddg-${Date.now()}`, object: 'chat.completion.chunk', created: Math.floor(Date.now()/1000), model: ddgModelStr, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] };
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
            } catch {}
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

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Forwarded-For': ip,
      'X-Real-IP': ip,
    };

    let proxyResponse: Response;

    // Experimental: Auto-scraped keys from free-llm-api-keys repo
    if (selectedModel.startsWith('auto/')) {
      const realModel = selectedModel.replace('auto/', '');
      const scrapedKeys = await getAllScrapedKeys(realModel);
      
      if (scrapedKeys.length > 0) {
        ROUTER_URL = 'https://aiapiv2.pekpik.com/v1/chat/completions';
        selectedModel = realModel;
        console.log(`[Auto] Racing ${scrapedKeys.length} scraped keys for model: ${realModel}`);
        
        const controllers = scrapedKeys.map(() => new AbortController());
        
        const fetchPromises = scrapedKeys.map((key, i) => {
          const reqHeaders = { ...headers, 'Authorization': `Bearer ${key}` };
          return fetch(ROUTER_URL, {
            method: 'POST',
            headers: reqHeaders,
            body: JSON.stringify({
              model: selectedModel,
              messages: formattedMessages,
              stream: stream === true,
              max_tokens: 8000,
              temperature: 0.7
            }),
            signal: controllers[i].signal
          }).then(res => {
            if (res.ok) return { res, index: i };
            throw new Error(`Status ${res.status}`);
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
        } catch (e) {
          console.error(`[Auto] All keys failed for ${realModel}`, e);
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
            const fetchPromises = cachedScrapedKeys.map(({key, model}, i) => {
              const reqHeaders = { ...headers, 'Authorization': `Bearer ${key}` };
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
                throw new Error(`Status ${res.status}`);
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
            } catch (e) {
              console.error(`[Fallback] All scraped models failed fallback for Opus`);
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
