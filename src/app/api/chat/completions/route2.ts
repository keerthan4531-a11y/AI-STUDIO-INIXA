import { NextResponse } from 'next/server';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { HttpProxyAgent } from 'http-proxy-agent';

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
// Free Proxy Pool Manager (Round-Robin)
// ═══════════════════════════════════════════════════════════════════
let proxyPool: string[] = [];
let currentProxyIndex = 0;
let lastProxyScrape = 0;

async function refreshProxyPool() {
  const now = Date.now();
  if (proxyPool.length > 0 && now - lastProxyScrape < 10 * 60 * 1000) {
    return; // Use cache if less than 10 mins old and we have proxies
  }

  try {
    console.log('[ProxyPool] Fetching fresh working proxies...');
    // We use Geonode API to get freshly checked HTTP/HTTPS proxies (fast ones only)
    const res = await fetch('https://proxylist.geonode.com/api/proxy-list?limit=100&page=1&sort_by=lastChecked&sort_type=desc&protocols=http%2Chttps', { cache: 'no-store' });
    const data = await res.json();
    
    if (data && data.data) {
      // Filter proxies that are reasonably fast
      const workingProxies = data.data
        .filter((p: any) => p.speed < 2000) // Less than 2000ms response time
        .map((p: any) => `http://${p.ip}:${p.port}`);
      
      if (workingProxies.length > 0) {
        proxyPool = workingProxies;
        lastProxyScrape = now;
        currentProxyIndex = 0;
        console.log(`[ProxyPool] Successfully loaded ${proxyPool.length} fast proxies.`);
        return;
      }
    }

    // Fallback scraper if geonode fails
    const fallbackRes = await fetch('https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt', { cache: 'no-store' });
    const fallbackText = await fallbackRes.text();
    const lines = fallbackText.split('\n').filter(l => l.trim().length > 0);
    // Shuffle and pick 100
    const shuffled = lines.sort(() => 0.5 - Math.random()).slice(0, 100);
    proxyPool = shuffled.map(p => `http://${p.trim()}`);
    lastProxyScrape = now;
    currentProxyIndex = 0;
    console.log(`[ProxyPool] Fallback loaded ${proxyPool.length} proxies.`);
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

    // 2. G4F Model Routing
    if (model.startsWith('g4f/')) {
      const g4fModel = model.replace('g4f/', '');
      
      // Ensure proxy pool is populated
      await refreshProxyPool();
      
      // We will try up to 3 different proxies for the G4F request
      const maxRetries = 3;
      let lastError = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const proxyUrl = getNextProxy();
        if (!proxyUrl) {
          throw new Error('No proxies available in the pool.');
        }

        console.log(`[G4F-ProxyPool] Attempt ${attempt}/${maxRetries} using Proxy: ${proxyUrl}`);
        const agent = proxyUrl.startsWith('https') ? new HttpsProxyAgent(proxyUrl) : new HttpProxyAgent(proxyUrl);
        
        let targetEndpoint = 'https://g4f.space/v1/chat/completions';
        let requestModel = g4fModel;

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout for proxy

          const g4fRes = await fetch(targetEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': stream ? 'text/event-stream' : 'application/json',
              'Origin': 'https://g4f.dev',
              'Referer': 'https://g4f.dev/',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
              // Spoof X-Forwarded-For just in case
              'X-Forwarded-For': `${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`
            },
            body: JSON.stringify({ ...body, model: requestModel }),
            // @ts-ignore - custom agent
            agent: agent,
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);

          if (g4fRes.ok) {
            console.log(`[G4F-ProxyPool] Success on attempt ${attempt}!`);
            if (stream) {
              return new Response(g4fRes.body, { headers: { 'Content-Type': 'text/event-stream' } });
            }
            return NextResponse.json(await g4fRes.json());
          } else {
            const errorText = await g4fRes.text();
            lastError = `Status ${g4fRes.status}: ${errorText.substring(0, 100)}`;
            console.log(`[Proxy Failed] ${lastError}`);
            if (g4fRes.status !== 429) {
              // If it's a 400 Bad Request or something else, don't retry, just return
              return new Response(errorText, { status: g4fRes.status, headers: { 'Content-Type': 'application/json' }});
            }
          }
        } catch (error: any) {
          lastError = error.message;
          console.log(`[Proxy Error] ${error.message}`);
        }
      }

      throw new Error(`All ${maxRetries} proxies failed. Last error: ${lastError}`);
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
