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
interface ScrapedKeyEntry { key: string; model: string; category: string; }
let cachedScrapedKeys: ScrapedKeyEntry[] = [];
let lastScrapeTime = 0;
const SCRAPE_URL = 'https://raw.githubusercontent.com/alistaitsacle/free-llm-api-keys/main/README.md';
const SCRAPE_INTERVAL = 5 * 60 * 1000; // 5 minutes

async function scrapeKeys(): Promise<ScrapedKeyEntry[]> {
  try {
    const res = await fetch(SCRAPE_URL, { cache: 'no-store' });
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
          category: currentCategory || match[2], 
          key: match[1], 
          model: match[2] 
        });
      }
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
      console.log(`[Scraper] Loaded ${fresh.length} keys for categories: ${[...new Set(fresh.map(e => e.category))].join(', ')}`);
    }
  }
  
  if (cachedScrapedKeys.length === 0) return [];
  
  if (targetModel) {
    const modelKeys = cachedScrapedKeys.filter(e => e.category === targetModel);
    if (modelKeys.length > 0) {
      return modelKeys;
    }
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
    }
  }
  
  if (cachedScrapedKeys.length === 0) return '';
  
  if (targetModel) {
    const modelKeys = cachedScrapedKeys.filter(e => e.category === targetModel);
    if (modelKeys.length > 0) {
      return modelKeys[Math.floor(Math.random() * modelKeys.length)].key;
    }
  }
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

    // ── Route: DDG engine (Via Cloudflare Worker) ──
    // The user's Cloudflare Worker has advanced IP-based retry logic for DDG.
    // We will forward the request to the Worker's /v1/chat/completions endpoint.
    if (selectedModel.startsWith('ddg/')) {
      // Set to normal flow so it goes to ROUTER_URL
      console.log(`[Route] Forwarding DDG model ${selectedModel} to Cloudflare Worker`);
      ROUTER_URL = `${CF_WORKER_URL}/v1/chat/completions`;
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
        console.log(`[Auto] Racing ${scrapedKeys.length} scraped keys for category: ${realModel}`);
        
        const controllers = scrapedKeys.map(() => new AbortController());
        
        const fetchPromises = scrapedKeys.map((entry, i) => {
          const reqHeaders = { ...headers, 'Authorization': `Bearer ${entry.key}` };
          return fetch(ROUTER_URL, {
            method: 'POST',
            headers: reqHeaders,
            body: JSON.stringify({
              model: entry.model,
              messages: formattedMessages,
              stream: stream === true,
              max_tokens: 8000,
              temperature: 0.7
            }),
            signal: controllers[i].signal
          }).then(res => {
            if (res.ok) return { res, index: i, entry };
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
          console.log(`[Auto] Race won by key index ${winner.index} with model ${winner.entry.model}!`);
        } catch (e) {
          console.error(`[Auto] All keys failed for category ${realModel}`);
          
          // Fallback logic specifically for Opus
          if (realModel === 'claude-opus-4-7') {
             console.log('[Fallback] Opus all keys failed, falling back to DeepSeek, Smart Chat, Kimi, GPT-5.5...');
             const fallbackCategories = ['deepseek-chat', 'smart-chat', 'kimi-k2.5', 'gpt-5.5'];
             const fallbackKeys = cachedScrapedKeys.filter(k => fallbackCategories.includes(k.category));
             
             if (fallbackKeys.length > 0) {
                 const fallbackControllers = fallbackKeys.map(() => new AbortController());
                 const fallbackPromises = fallbackKeys.map((entry, i) => {
                    const reqHeaders = { ...headers, 'Authorization': `Bearer ${entry.key}` };
                    return fetch(ROUTER_URL, {
                      method: 'POST',
                      headers: reqHeaders,
                      body: JSON.stringify({
                        model: entry.model,
                        messages: formattedMessages,
                        stream: stream === true,
                        max_tokens: 8000,
                        temperature: 0.7
                      }),
                      signal: fallbackControllers[i].signal
                    }).then(res => {
                      if (res.ok) return { res, index: i, entry };
                      throw new Error(`Status ${res.status}`);
                    });
                 });
                 
                 try {
                     const fallbackWinner = await Promise.any(fallbackPromises);
                     proxyResponse = fallbackWinner.res;
                     fallbackControllers.forEach((c, i) => { if (i !== fallbackWinner.index) c.abort(); });
                     console.log(`[Fallback] Race won by category ${fallbackWinner.entry.category} (model ${fallbackWinner.entry.model})!`);
                 } catch (fallbackErr) {
                     proxyResponse = new Response(JSON.stringify({ error: { message: "All fallback API keys failed to respond" } }), { status: 502 });
                 }
             } else {
                 proxyResponse = new Response(JSON.stringify({ error: { message: "No fallback API keys available" } }), { status: 502 });
             }
          } else {
             proxyResponse = new Response(JSON.stringify({ error: { message: "All API keys failed to respond" } }), { status: 502 });
          }
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
