import { NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════════════
// Chat API Route 2 — G4F + Scraped Keys
// ═══════════════════════════════════════════════════════════════════
// Routes G4F models through Cloudflare Worker (Vercel-compatible).
// No Node.js proxy agents needed — the CF Worker handles IP rotation.
// ═══════════════════════════════════════════════════════════════════

// --- Free LLM API Scraper (Do not touch) ---
interface ScrapedKeyEntry { key: string; model: string; category: string; }
let cachedScrapedKeys: ScrapedKeyEntry[] = [];
let lastScrapeTime = 0;
const SCRAPE_URL = 'https://raw.githubusercontent.com/alistaitsacle/free-llm-api-keys/main/README.md';
const SCRAPE_INTERVAL = 5 * 60 * 1000; 

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
// G4F Cloudflare Worker Proxy (Vercel-Compatible)
// ═══════════════════════════════════════════════════════════════════
const G4F_WORKER_URL = 'https://g4f-bypass.haruyhari930.workers.dev';

async function callG4FWorker(body: Record<string, unknown>, model: string, stream: boolean) {
  const workerBody: Record<string, unknown> = {
    model: model,
    messages: body.messages || [],
    stream: stream,
  };

  // Pass through optional parameters
  if (body.temperature !== undefined) workerBody.temperature = body.temperature;
  if (body.max_tokens !== undefined) workerBody.max_tokens = body.max_tokens;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

  const workerRes = await fetch(`${G4F_WORKER_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': stream ? 'text/event-stream' : 'application/json',
      'User-Agent': 'Inixa-Proxy/1.0',
    },
    body: JSON.stringify(workerBody),
    signal: controller.signal,
  });

  clearTimeout(timeoutId);
  return workerRes;
}

// ═══════════════════════════════════════════════════════════════════
// Smart Router Logic
// ═══════════════════════════════════════════════════════════════════
export async function POST(req: Request) {
  try {
    const body = await req.json();
    let model = body.model || 'gpt-4o';
    const stream = body.stream || false;
    let authHeader = req.headers.get('authorization');

    console.log(`[Master Route] Routing model: "${model}"`);

    // 1. If using a specific API key (not 'g4f_...'), route to Nine Router or original scrape keys
    if (authHeader && !authHeader.includes('g4f_')) {
      const isScrapedKeyRequest = authHeader.includes('sk-');
      let targetUrl = 'http://localhost:20128/v1/chat/completions';
      
      if (isScrapedKeyRequest && model !== 'g4f/gpt-4o') {
        const now = Date.now();
        if (now - lastScrapeTime > SCRAPE_INTERVAL || cachedScrapedKeys.length === 0) {
          cachedScrapedKeys = await scrapeKeys();
          lastScrapeTime = now;
        }
        
        let matchingKeys = cachedScrapedKeys;
        if (model === 'gpt-5.5') matchingKeys = cachedScrapedKeys.filter(k => k.category === 'gpt-5.5');
        else if (model === 'claude-opus-4.7') matchingKeys = cachedScrapedKeys.filter(k => k.category === 'claude-opus-4-7');
        
        if (matchingKeys.length > 0) {
          const randomKey = matchingKeys[Math.floor(Math.random() * matchingKeys.length)];
          authHeader = `Bearer ${randomKey.key}`;
          model = randomKey.model;
          targetUrl = 'https://api.chatanywhere.tech/v1/chat/completions';
          console.log(`[Scrape Router] Using key from category ${randomKey.category}, model ${model}`);
        }
      }

      const backendRes = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify({ ...body, model })
      });

      if (!backendRes.ok) throw new Error(await backendRes.text());
      if (stream) return new Response(backendRes.body, { headers: { 'Content-Type': 'text/event-stream' } });
      return NextResponse.json(await backendRes.json());
    }

    // 2. G4F Model Routing — Via Cloudflare Worker (Vercel-compatible)
    if (model.startsWith('g4f/')) {
      const g4fModel = model.replace('g4f/', '');
      
      console.log(`[G4F-Worker] Proxying to CF Worker: model="${g4fModel}"`);

      try {
        const workerRes = await callG4FWorker(body, g4fModel, stream);

        if (workerRes.ok) {
          const provider = workerRes.headers.get('X-Provider') || 'g4f-worker';
          console.log(`[G4F-Worker] Success! Provider: ${provider}`);
          
          if (stream && workerRes.body) {
            return new Response(workerRes.body, {
              headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
              }
            });
          }
          return NextResponse.json(await workerRes.json());
        } else {
          const errorText = await workerRes.text();
          console.error(`[G4F-Worker] Error ${workerRes.status}: ${errorText.substring(0, 200)}`);
          
          if (workerRes.status >= 400 && workerRes.status < 500) {
            return new Response(errorText, { 
              status: workerRes.status, 
              headers: { 'Content-Type': 'application/json' }
            });
          }
          throw new Error(`Worker returned ${workerRes.status}: ${errorText.substring(0, 100)}`);
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          throw new Error('G4F request timed out after 60s');
        }
        throw error;
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
