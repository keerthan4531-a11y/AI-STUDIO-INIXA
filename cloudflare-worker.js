// ═══════════════════════════════════════════════════════════════
// INIXA OS — AI Cloudflare Worker v6.0 (UNIVERSAL PROXY)
// Adds direct proxying for Gemini, Groq, SambaNova, and OpenRouter
// ═══════════════════════════════════════════════════════════════

// ── User API Keys for Round-Robin Routing (Configured via Environment Variables) ──
const GEMINI_KEYS = [];
const GROQ_KEYS = [];
const SAMBANOVA_KEYS = [];
const OPENROUTER_KEYS = [];

function getKeys(envVal, fallback = []) {
  if (!envVal) return fallback;
  try {
    if (typeof envVal === 'string') {
      if (envVal.startsWith('[')) {
        return JSON.parse(envVal);
      }
      return envVal.split(',').map(k => k.trim()).filter(Boolean);
    }
    if (Array.isArray(envVal)) return envVal;
    return fallback;
  } catch {
    return fallback;
  }
}

function getRandomKey(keys) {
  if (!keys || keys.length === 0) return "";
  return keys[Math.floor(Math.random() * keys.length)];
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Provider, X-Real-IP, CF-Connecting-IP',
  'Access-Control-Max-Age': '86400',
};

// Browser-like headers to avoid bot detection
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function errorResponse(engine, message, details = {}, status = 500) {
  return jsonResponse({ ok: false, engine, error: message, details }, status);
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Sleep for retry backoff
// ═══════════════════════════════════════════════════════════════
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Extract content from various response formats
// ═══════════════════════════════════════════════════════════════
function extractContent(text) {
  if (!text || text.length < 2) return null;

  // Try OpenAI JSON format
  try {
    if (text.trim().startsWith('{')) {
      const data = JSON.parse(text);
      const content = data?.choices?.[0]?.message?.content || data?.content || data?.result;
      if (content && !content.includes('IMPORTANT NOTICE') && !content.includes('deprecated')) {
        return content;
      }
    }
  } catch { }

  // Raw text (non-HTML, non-error)
  if (!text.startsWith('<') && !text.startsWith('{') &&
    !text.includes('IMPORTANT NOTICE') && !text.includes('deprecated') &&
    !text.includes('<!DOCTYPE') && !text.includes('Queue full') &&
    text.length > 3) {
    return text;
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Build per-user headers (THE KEY to unlimited per-user)
// Each user's real mobile/device IP is forwarded so Pollinations
// sees unique IPs → each user gets their own rate limit bucket
// ═══════════════════════════════════════════════════════════════
function userHeaders(userIP) {
  return {
    ...BROWSER_HEADERS,
    'Content-Type': 'application/json',
    'X-Forwarded-For': userIP,
    'X-Real-IP': userIP,
  };
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Scrape Web Results (DuckDuckGo Search)
// ═══════════════════════════════════════════════════════════════
async function searchWeb(query, userIP) {
  try {
    const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(searchUrl, {
      headers: { ...BROWSER_HEADERS, 'X-Forwarded-For': userIP }
    });
    const html = await res.text();

    // Robust block-based scraping for DDG
    const results = [];
    const blocks = html.split('class="result ');

    for (const block of blocks.slice(1)) {
      if (results.length >= 5) break;

      const linkMatch = block.match(/href="([^"]+)"/i);
      const titleMatch = block.match(/class="result__a"[^>]*>([\s\S]*?)<\/a>/i);
      const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/div>/i);

      if (linkMatch && titleMatch) {
        let link = linkMatch[1];
        let title = titleMatch[1].replace(/<[^>]*>?/gm, '').trim();
        let snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]*>?/gm, '').trim() : "";

        // Clean link
        if (link.startsWith('//')) link = 'https:' + link;
        if (link.includes('uddg=')) {
          try {
            const urlPart = link.split('uddg=')[1].split('&')[0];
            link = decodeURIComponent(urlPart);
          } catch { }
        }

        if (!link.includes('duckduckgo.com') && title) {
          results.push({ title, link, snippet });
        }
      }
    }
    console.log(`[Worker Search] Found ${results.length} links for: ${query}`);
    return results;
  } catch (e) {
    console.error(`[Worker Search Error]`, e);
    return [];
  }
}

export default {
  async fetch(request, env, ctx) {
    // Resolve keys from env or fallback arrays
    const geminiKeys = getKeys(env.GEMINI_KEYS, GEMINI_KEYS);
    const groqKeys = getKeys(env.GROQ_KEYS, GROQ_KEYS);
    const sambanovaKeys = getKeys(env.SAMBANOVA_KEYS, SAMBANOVA_KEYS);
    const openrouterKeys = getKeys(env.OPENROUTER_KEYS, OPENROUTER_KEYS);

    // 1. CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // 2. Extract REAL user IP (checks forwarded headers first for server proxying, then Cloudflare connection IP)
    const userIP = request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
      || request.headers.get('X-Real-IP')
      || request.headers.get('CF-Connecting-IP')
      || '1.1.1.1';

    const url = new URL(request.url);
    const path = url.pathname;

    // Parse body for POST requests (only if it's JSON)
    let body = {};
    const contentType = request.headers.get('content-type') || '';
    if (request.method === 'POST' && contentType.includes('application/json')) {
      try { 
        // Clone request so the original body stream isn't completely consumed if we need it later
        const clonedReq = request.clone();
        body = await clonedReq.json(); 
      } catch (e) { body = {}; }
    }

    try {
      // ─────────────────────────────────────────────────────────
      // ROUTE: /v1/chat/completions (UNIVERSAL API PROXY)
      // ─────────────────────────────────────────────────────────
      if (path === '/v1/chat/completions') {
        let requestedModel = body.model || 'gemini/gemini-2.5-flash';
        let targetUrl = '';
        let targetAuth = '';
        let targetModel = requestedModel;

        // ── DDG models via universal endpoint (handled internally) ──
        if (requestedModel.startsWith('ddg/')) {
          // DDG model aliases → actual model IDs
          const DDG_MODEL_MAP = {
            'gpt-4o-mini': 'gpt-4o-mini',
            'claude-3-haiku': 'claude-3-haiku-20240307',
            'claude-3-haiku-20240307': 'claude-3-haiku-20240307',
            'llama': 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
            'mixtral': 'mistralai/Mistral-Small-24B-Instruct-2501',
            'o3-mini': 'o3-mini',
          };
          const ddgRawModel = requestedModel.replace('ddg/', '');
          const ddgModel = DDG_MODEL_MAP[ddgRawModel] || ddgRawModel;
          const ddgMessages = body.messages || [];
          const ddgStream = body.stream === true;

          // Get fresh VQD
          const ddgStatusRes = await fetch('https://duckduckgo.com/duckchat/v1/status', {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
              'Accept': '*/*',
              'Accept-Language': 'en-US,en;q=0.9',
              'Referer': 'https://duckduckgo.com/',
              'Origin': 'https://duckduckgo.com',
              'x-vqd-accept': '1',
              'Cache-Control': 'no-store',
            }
          });
          const ddgVqd = ddgStatusRes.headers.get('x-vqd-4');
          if (!ddgVqd) {
            return errorResponse('ddg', 'Failed to get VQD token', {}, 502);
          }

          const ddgChatRes = await fetch('https://duckduckgo.com/duckchat/v1/chat', {
            method: 'POST',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
              'Accept': 'text/event-stream',
              'Accept-Language': 'en-US,en;q=0.9',
              'Content-Type': 'application/json',
              'Referer': 'https://duckduckgo.com/',
              'Origin': 'https://duckduckgo.com',
              'x-vqd-4': ddgVqd,
            },
            body: JSON.stringify({ model: ddgModel, messages: ddgMessages }),
          });

          if (!ddgChatRes.ok) {
            return errorResponse('ddg', `DDG chat failed: HTTP ${ddgChatRes.status}`, {}, ddgChatRes.status);
          }

          if (ddgStream) {
            // Stream: Convert DDG SSE → OpenAI SSE and passthrough
            const { readable, writable } = new TransformStream();
            const writer = writable.getWriter();
            const encoder = new TextEncoder();

            ctx.waitUntil((async () => {
              try {
                const reader = ddgChatRes.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  buffer += decoder.decode(value, { stream: true });
                  const lines = buffer.split('\n');
                  buffer = lines.pop() || '';
                  for (const line of lines) {
                    if (line.startsWith('data: ')) {
                      const d = line.slice(6).trim();
                      if (d === '[DONE]') { await writer.write(encoder.encode('data: [DONE]\n\n')); continue; }
                      try {
                        const p = JSON.parse(d);
                        if (p.message != null) {
                          const chunk = { id: `chatcmpl-ddg-${Date.now()}`, object: 'chat.completion.chunk', created: Math.floor(Date.now()/1000), model: ddgModel, choices: [{ index: 0, delta: { content: p.message }, finish_reason: null }] };
                          await writer.write(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
                        }
                      } catch {}
                    }
                  }
                }
                const finalChunk = { id: `chatcmpl-ddg-${Date.now()}`, object: 'chat.completion.chunk', created: Math.floor(Date.now()/1000), model: ddgModel, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] };
                await writer.write(encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\n`));
                await writer.write(encoder.encode('data: [DONE]\n\n'));
              } catch (e) { console.error('[DDG/v1 Stream Error]', e); }
              finally { await writer.close(); }
            })());

            return new Response(readable, { headers: { ...CORS_HEADERS, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } });
          } else {
            // Non-stream: Parse SSE and return OpenAI format
            const sseText = await ddgChatRes.text();
            let content = '';
            for (const line of sseText.split('\n')) {
              if (line.startsWith('data: ')) {
                const d = line.slice(6).trim();
                if (d === '[DONE]') break;
                try { const p = JSON.parse(d); if (p.message != null) content += p.message; } catch {}
              }
            }
            return jsonResponse({
              id: `chatcmpl-ddg-${Date.now()}`, object: 'chat.completion', created: Math.floor(Date.now()/1000), model: ddgModel,
              choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
              usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
            });
          }
        }

        if (requestedModel.startsWith('gemini/')) {
          targetUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
          targetAuth = `Bearer ${getRandomKey(geminiKeys)}`;
          targetModel = requestedModel.replace('gemini/', '');
        } else if (requestedModel.startsWith('groq/')) {
          targetUrl = 'https://api.groq.com/openai/v1/chat/completions';
          targetAuth = `Bearer ${getRandomKey(groqKeys)}`;
          targetModel = requestedModel.replace('groq/', '');
        } else if (requestedModel.startsWith('sb/')) {
          targetUrl = 'https://api.sambanova.ai/v1/chat/completions';
          targetAuth = `Bearer ${getRandomKey(sambanovaKeys)}`;
          targetModel = requestedModel.replace('sb/', '');
        } else if (requestedModel.startsWith('or/')) {
          targetUrl = 'https://openrouter.ai/api/v1/chat/completions';
          targetAuth = `Bearer ${getRandomKey(openrouterKeys)}`;
          targetModel = requestedModel.replace('or/', '');
        } else {
          return errorResponse('proxy', 'Invalid model prefix. Must start with gemini/, groq/, sb/, or/, or ddg/', { model: requestedModel }, 400);
        }

        // Forward the exact same JSON body, but with the stripped targetModel
        const proxyBody = {
          ...body,
          model: targetModel
        };

        const proxyHeaders = new Headers();
        proxyHeaders.set('Content-Type', 'application/json');
        proxyHeaders.set('Authorization', targetAuth);

        // OpenRouter specific headers
        if (requestedModel.startsWith('or/')) {
          proxyHeaders.set('HTTP-Referer', 'https://github.com/inixa');
          proxyHeaders.set('X-Title', 'Inixa Proxy');
        }

        const proxyRes = await fetch(targetUrl, {
          method: 'POST',
          headers: proxyHeaders,
          body: JSON.stringify(proxyBody)
        });

        // Forward streaming response perfectly
        const responseHeaders = new Headers(proxyRes.headers);
        responseHeaders.set('Access-Control-Allow-Origin', '*');

        return new Response(proxyRes.body, {
          status: proxyRes.status,
          headers: responseHeaders
        });
      }

      // ─────────────────────────────────────────────────────────
      // ROUTE: /v1/audio/transcriptions (WHISPER STT PROXY)
      // ─────────────────────────────────────────────────────────
      if (path === '/v1/audio/transcriptions') {
        const targetUrl = 'https://api.groq.com/openai/v1/audio/transcriptions';
        const targetAuth = `Bearer ${getRandomKey(groqKeys)}`;

        // We must forward the original FormData (multipart) exactly as received
        const proxyHeaders = new Headers(request.headers);
        // Remove 'Host' header to prevent issues
        proxyHeaders.delete('Host');
        proxyHeaders.set('Authorization', targetAuth);
        
        // We cannot use the consumed `request` because `request.json()` might have been called.
        // Wait, request.json() throws but consumes the body. 
        // We need to fix the global body parser to clone the request first.
        // But for now, we'll just rely on the fixed body parsing.
        
        const proxyRes = await fetch(targetUrl, {
          method: 'POST',
          headers: proxyHeaders,
          body: request.clone().body
        });

        const responseHeaders = new Headers(proxyRes.headers);
        responseHeaders.set('Access-Control-Allow-Origin', '*');

        return new Response(proxyRes.body, {
          status: proxyRes.status,
          headers: responseHeaders
        });
      }

      // ─────────────────────────────────────────────────────────
      // ROUTE: /api/generate-image (Unlimited IP-Based Proxy)
      // ─────────────────────────────────────────────────────────
      if (path === '/api/generate-image') {
        const prompt = body.prompt || 'A beautiful futuristic city';
        const model = body.model || 'flux';
        const width = body.width || 1024;
        const height = body.height || 1024;
        const seed = body.seed || Math.floor(Math.random() * 99999);
        
        const targetUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${seed}&model=${model}&nologo=true`;
        
        try {
          const proxyRes = await fetch(targetUrl, {
            headers: {
              ...BROWSER_HEADERS,
              'X-Forwarded-For': userIP
            }
          });
          
          if (!proxyRes.ok) {
            const errText = await proxyRes.text().catch(() => '');
            throw new Error(`Image generation upstream failed (${proxyRes.status}): ${errText}`);
          }

          const responseHeaders = new Headers(CORS_HEADERS);
          responseHeaders.set('Content-Type', proxyRes.headers.get('Content-Type') || 'image/jpeg');
          
          return new Response(proxyRes.body, { headers: responseHeaders });
        } catch (e) {
          return errorResponse('image-gen', 'Failed to generate image: ' + e.message, {}, 500);
        }
      }

      // ─────────────────────────────────────────────────────────
      // ROUTE: /health
      // ─────────────────────────────────────────────────────────
      if (path === '/' || path.startsWith('/health')) {
        return jsonResponse({
          ok: true,
          status: 'Online',
          version: '6.0.0',
          engines: {
            universal: { route: '/v1/chat/completions', prefixes: ['gemini/', 'groq/', 'sb/', 'or/', 'ddg/'] },
            ddg: { route: '/ddg', models: ['gpt-4o-mini', 'claude-3-haiku', 'llama', 'mixtral', 'o3-mini'] },
            pollinations: '/pollinations',
            image: '/api/generate-image',
            audio: '/v1/audio/transcriptions',
            search: '/web-search',
          },
          client_ip: userIP,
          note: 'Per-user IP forwarding active. DDG proxy with VQD token management and retry logic.',
        });
      }

      // ─────────────────────────────────────────────────────────
      // ROUTE: /pollinations (Text Generation)
      // 3-Tier Fallback System:
      //   Tier 1: gen.pollinations.ai (new API, needs key)
      //   Tier 2: text.pollinations.ai/openai (legacy, openai-fast only)
      //   Tier 3: text.pollinations.ai GET (simple prompt)
      // ALL tiers forward user's real IP for per-user rate limiting
      // ─────────────────────────────────────────────────────────
      if (path.startsWith('/pollinations')) {
        const model = body.model || 'openai';
        const messages = body.messages || [];
        const seed = body.seed || Math.floor(Math.random() * 999999);

        // Build prompt for GET fallback
        const systemMsg = messages.find(m => m.role === 'system')?.content || '';
        const userMsg = messages.filter(m => m.role === 'user').pop()?.content || '';
        const prompt = systemMsg ? `${systemMsg}\n\nUser: ${userMsg}` : userMsg;

        let content = null;
        let usedTier = '';

        // ── TIER 1: Pollinations (New API with API Key) ──
        const apiKey = env?.POLLINATIONS_KEY || null;
        if (apiKey) {
          try {
            const res = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
              method: 'POST',
              headers: {
                ...userHeaders(userIP),
                'Authorization': `Bearer ${apiKey}`,
              },
              body: JSON.stringify({ model, messages, stream: false, seed }),
            });

            if (res.ok) {
              const text = await res.text();
              content = extractContent(text);
              if (content) usedTier = 'gen_api';
            }
          } catch { }
        }

        // ── TIER 2: NEXRA (Premium Fallback) ──
        if (!content && (model.includes('gpt-4') || model.includes('gemini') || model.includes('claude'))) {
          try {
            const nexraModel = model.includes('gpt-4') ? 'gpt-4' : (model.includes('gemini') ? 'gemini-pro' : 'gpt-4');
            const res = await fetch('https://nexra.aryahcr.cc/api/chat/gpt', {
              method: 'POST',
              headers: { ...userHeaders(userIP), 'Referer': 'https://nexra.aryahcr.cc/' },
              body: JSON.stringify({ messages, model: nexraModel, markdown: true }),
            });
            if (res.ok) {
              const data = await res.json().catch(() => null);
              content = data?.gpt || data?.message;
              if (content) usedTier = `nexra_premium (${nexraModel})`;
            }
          } catch { }
        }

        // ── TIER 3: DUCKDUCKGO (Stable Fallback) ──
        if (!content && (model.includes('claude') || model.includes('gpt-4') || model.includes('openai'))) {
          try {
            const ddgModel = model.includes('claude') ? 'claude-3-haiku-20240307' : 'gpt-4o-mini';
            const statusRes = await fetch('https://duckduckgo.com/duckchat/v1/status', {
              headers: { 
                ...userHeaders(userIP), 
                'x-vqd-accept': '1',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Referer': 'https://duckduckgo.com/',
                'Origin': 'https://duckduckgo.com',
              }
            });
            const vqd = statusRes.headers.get('x-vqd-4');
            if (vqd) {
              const res = await fetch('https://duckduckgo.com/duckchat/v1/chat', {
                method: 'POST',
                headers: { 
                  ...userHeaders(userIP), 
                  'x-vqd-4': vqd,
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                  'Referer': 'https://duckduckgo.com/',
                  'Origin': 'https://duckduckgo.com',
                },
                body: JSON.stringify({ model: ddgModel, messages })
              });
              const txt = await res.text();
              let ddgContent = '';
              for (const line of txt.split('\n')) {
                if (line.startsWith('data: ')) {
                  const dataStr = line.slice(6).trim();
                  if (dataStr === '[DONE]') break;
                  try {
                    const parsed = JSON.parse(dataStr);
                    if (parsed.message != null) {
                      ddgContent += parsed.message;
                    }
                  } catch {}
                }
              }
              if (ddgContent) {
                content = ddgContent;
                usedTier = `ddg_stable (${ddgModel})`;
              }
            }
          } catch { }
        }

        // ── TIER 4: text.pollinations.ai (Legacy, Anonymous) ──
        if (!content) {
          try {
            const res = await fetch('https://text.pollinations.ai/openai', {
              method: 'POST',
              headers: userHeaders(userIP),
              body: JSON.stringify({ model: 'openai-fast', messages, stream: false, seed }),
            });
            if (res.ok) {
              const text = await res.text();
              content = extractContent(text);
              if (content) usedTier = 'legacy_openai';
            }
          } catch { }
        }

        // ── TIER 5: text.pollinations.ai GET (Simple prompt, Anonymous) ──
        if (!content && prompt) {
          try {
            const getUrl = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai-fast&seed=${seed}`;
            const res = await fetch(getUrl, { headers: userHeaders(userIP) });
            if (res.ok) {
              const text = await res.text();
              if (text && text.length > 3 && !text.includes('<!DOCTYPE')) {
                content = text;
                usedTier = 'legacy_get';
              }
            }
          } catch { }
        }

        if (content) {
          return jsonResponse({
            ok: true,
            content: content.trim(),
            engine: 'pollinations',
            model,
            tier: usedTier,
            forwarded_ip: userIP
          });
        }

        return errorResponse('pollinations', 'All 5 tiers failed', {
          phase: 'all_tiers_exhausted',
          requested_model: model,
          user_ip: userIP,
          tip: 'Set POLLINATIONS_KEY env variable for unlimited gen.pollinations.ai access'
        });
      }

      // ── ROUTES REMOVED: /airforce and /liaobots (Due to unreliability) ──

      // ─────────────────────────────────────────────────────────
      // ROUTE: /super (9router / OmniRoute / jsputer-proxy)
      // The Ultimate "No-Auth" Proxy Forwarder with Per-User IP
      // ─────────────────────────────────────────────────────────
      if (path.startsWith('/super') || path.startsWith('/9router')) {
        const model = body.model || 'gpt-4o';
        // 2. டார்கெட் ஏஐ ப்ராக்ஸி எண்ட்-பாயிண்ட் (உதாரணமாக 9router அல்லது Pawan)
        const targetGateway = env?.SUPER_PROXY_URL || 'https://api.pawan.krd/v1/chat/completions';

        try {
          // Clone and inject headers for per-user IP forwarding
          const newHeaders = new Headers();
          newHeaders.set('Content-Type', 'application/json');
          newHeaders.set('X-Forwarded-For', userIP);
          newHeaders.set('X-Real-IP', userIP);
          newHeaders.set('CF-Connecting-IP', userIP);

          const res = await fetch(targetGateway, {
            method: 'POST',
            headers: newHeaders,
            body: JSON.stringify({
              model: model,
              messages: body.messages || [],
              stream: false
            })
          });

          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const text = await res.text();
          let content = null;
          try {
            const data = JSON.parse(text);
            content = data?.choices?.[0]?.message?.content || data?.content || data?.message;
          } catch {
            content = text;
          }

          if (content) return jsonResponse({ ok: true, content, engine: 'super_proxy', model, forwarded_ip: userIP });
          throw new Error('Empty response');
        } catch (e) {
          return errorResponse('super_proxy', e.message, { phase: 'fetch_super_proxy' });
        }
      }

      // ─────────────────────────────────────────────────────────
      // ROUTE: /nexra (Arya HCR)
      // ─────────────────────────────────────────────────────────
      if (path.startsWith('/nexra')) {
        const model = body.model || 'gpt-4';
        try {
          const res = await fetch('https://nexra.aryahcr.cc/api/chat/gpt', {
            method: 'POST',
            headers: {
              ...userHeaders(userIP),
              'Referer': 'https://nexra.aryahcr.cc/',
              'Origin': 'https://nexra.aryahcr.cc'
            },
            body: JSON.stringify({
              messages: body.messages || [],
              model: model,
              markdown: true,
            }),
          });

          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const text = await res.text();
          let content = null;
          try {
            const data = JSON.parse(text);
            content = data?.gpt || data?.message || data?.response;
          } catch {
            content = text;
          }

          if (content) return jsonResponse({ ok: true, content, engine: 'nexra', model, forwarded_ip: userIP });
          throw new Error('Empty response');
        } catch (e) {
          return errorResponse('nexra', e.message, { phase: 'fetch_nexra' });
        }
      }

      // ─────────────────────────────────────────────────────────
      // ROUTE: /deepai / notegpt / g4f (Fallback Tier)
      // ─────────────────────────────────────────────────────────
      if (path.startsWith('/deepai') || path.startsWith('/notegpt') || path.startsWith('/g4f')) {
        try {
          const res = await fetch('https://text.pollinations.ai/openai', {
            method: 'POST',
            headers: userHeaders(userIP),
            body: JSON.stringify({ model: 'openai-fast', messages: body.messages || [], stream: false })
          });
          const text = await res.text();
          const content = extractContent(text);
          if (content) return jsonResponse({ ok: true, content, engine: 'fallback_engine', forwarded_ip: userIP });
          throw new Error('Empty');
        } catch (e) {
          return errorResponse('fallback', e.message, { phase: 'fetch_fallback' });
        }
      }

      // ─────────────────────────────────────────────────────────
      // ROUTE: /ddg (DuckDuckGo AI Chat — Bulletproof Proxy)
      // Features:
      //   - Proper VQD token management (fetch + refresh)
      //   - SSE stream parsing with correct message concatenation
      //   - Retry logic on 418/429 errors (up to 3 retries)
      //   - Browser-like headers to avoid bot detection
      //   - Supports streaming (stream=true) and non-streaming
      //   - Per-user IP forwarding for individual rate limits
      //   - Models: gpt-4o-mini, claude-3-haiku, llama, mixtral, o3-mini
      // ─────────────────────────────────────────────────────────
      if (path.startsWith('/ddg')) {
        // DDG model aliases → actual model IDs
        const DDG_MODELS = {
          'gpt-4o-mini': 'gpt-4o-mini',
          'claude-3-haiku': 'claude-3-haiku-20240307',
          'claude-3-haiku-20240307': 'claude-3-haiku-20240307',
          'llama': 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
          'meta-llama/Llama-3.3-70B-Instruct-Turbo': 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
          'mixtral': 'mistralai/Mistral-Small-24B-Instruct-2501',
          'mistralai/Mistral-Small-24B-Instruct-2501': 'mistralai/Mistral-Small-24B-Instruct-2501',
          'o3-mini': 'o3-mini',
        };

        const rawModel = body.model || 'gpt-4o-mini';
        const ddgModel = DDG_MODELS[rawModel] || 'gpt-4o-mini';
        const messages = body.messages || [];
        const wantStream = body.stream === true;
        const MAX_RETRIES = 3;

        // Helper: Get fresh VQD token
        async function getVQD() {
          const statusRes = await fetch('https://duckduckgo.com/duckchat/v1/status', {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
              'Accept': '*/*',
              'Accept-Language': 'en-US,en;q=0.9',
              'Referer': 'https://duckduckgo.com/',
              'Origin': 'https://duckduckgo.com',
              'x-vqd-accept': '1',
              'Cache-Control': 'no-store',
            }
          });
          
          if (!statusRes.ok) {
            throw new Error(`VQD status fetch failed: HTTP ${statusRes.status}`);
          }
          
          const vqd = statusRes.headers.get('x-vqd-4');
          if (!vqd) {
            throw new Error('VQD token not found in status response headers');
          }
          return vqd;
        }

        // Helper: Send chat request to DDG
        async function ddgChat(vqd) {
          const chatPayload = {
            model: ddgModel,
            messages: messages,
          };

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
            },
            body: JSON.stringify(chatPayload),
          });

          return chatRes;
        }

        // Helper: Parse SSE text into full content
        function parseSSE(sseText) {
          let content = '';
          for (const line of sseText.split('\n')) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') break;
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.message !== undefined && parsed.message !== null) {
                  content += parsed.message;
                }
              } catch { }
            }
          }
          return content;
        }

        // Main retry loop
        let lastError = '';
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
          try {
            // Step 1: Get fresh VQD token for each attempt
            const vqd = await getVQD();

            // Step 2: Send chat request
            const chatRes = await ddgChat(vqd);

            // Handle rate-limit / challenge errors with retry
            if (chatRes.status === 418 || chatRes.status === 429) {
              lastError = `HTTP ${chatRes.status} (attempt ${attempt + 1}/${MAX_RETRIES})`;
              console.log(`[DDG] ${lastError}, retrying...`);
              if (attempt < MAX_RETRIES - 1) {
                await sleep(500 * (attempt + 1)); // Exponential backoff: 500ms, 1000ms, 1500ms
                continue;
              }
              break;
            }

            if (!chatRes.ok) {
              lastError = `HTTP ${chatRes.status}: ${chatRes.statusText}`;
              break;
            }

            // Step 3: Handle response
            if (wantStream) {
              // STREAMING MODE: Pass through SSE stream directly
              // Convert DDG SSE format → OpenAI-compatible SSE format
              const { readable, writable } = new TransformStream();
              const writer = writable.getWriter();
              const encoder = new TextEncoder();

              // Process in background
              ctx.waitUntil((async () => {
                try {
                  const reader = chatRes.body.getReader();
                  const decoder = new TextDecoder();
                  let buffer = '';
                  let chunkIndex = 0;

                  while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                      if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6).trim();
                        if (dataStr === '[DONE]') {
                          await writer.write(encoder.encode('data: [DONE]\n\n'));
                          continue;
                        }
                        try {
                          const parsed = JSON.parse(dataStr);
                          if (parsed.message !== undefined && parsed.message !== null) {
                            // Convert to OpenAI SSE format
                            const openaiChunk = {
                              id: `chatcmpl-ddg-${Date.now()}`,
                              object: 'chat.completion.chunk',
                              created: Math.floor(Date.now() / 1000),
                              model: ddgModel,
                              choices: [{
                                index: 0,
                                delta: { content: parsed.message },
                                finish_reason: null,
                              }],
                            };
                            await writer.write(encoder.encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
                          }
                        } catch { }
                      }
                    }
                  }

                  // Send final chunk with finish_reason
                  const finalChunk = {
                    id: `chatcmpl-ddg-${Date.now()}`,
                    object: 'chat.completion.chunk',
                    created: Math.floor(Date.now() / 1000),
                    model: ddgModel,
                    choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
                  };
                  await writer.write(encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\n`));
                  await writer.write(encoder.encode('data: [DONE]\n\n'));
                } catch (e) {
                  console.error('[DDG Stream Error]', e);
                } finally {
                  await writer.close();
                }
              })());

              return new Response(readable, {
                headers: {
                  ...CORS_HEADERS,
                  'Content-Type': 'text/event-stream',
                  'Cache-Control': 'no-cache',
                  'Connection': 'keep-alive',
                },
              });
            } else {
              // NON-STREAMING MODE: Collect full response
              const sseText = await chatRes.text();
              const content = parseSSE(sseText);

              if (content) {
                // Return in OpenAI-compatible format
                return jsonResponse({
                  ok: true,
                  id: `chatcmpl-ddg-${Date.now()}`,
                  object: 'chat.completion',
                  created: Math.floor(Date.now() / 1000),
                  model: ddgModel,
                  choices: [{
                    index: 0,
                    message: { role: 'assistant', content: content },
                    finish_reason: 'stop',
                  }],
                  usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
                  engine: 'ddg',
                  forwarded_ip: userIP,
                });
              }

              lastError = 'Empty response after SSE parsing';
              if (attempt < MAX_RETRIES - 1) {
                await sleep(300);
                continue;
              }
            }
          } catch (e) {
            lastError = e.message || String(e);
            console.error(`[DDG] Attempt ${attempt + 1} error:`, lastError);
            if (attempt < MAX_RETRIES - 1) {
              await sleep(500 * (attempt + 1));
              continue;
            }
          }
        }

        // All retries exhausted
        return errorResponse('ddg', `All ${MAX_RETRIES} attempts failed: ${lastError}`, {
          phase: 'fetch_ddg',
          model: ddgModel,
          user_ip: userIP,
          available_models: Object.keys(DDG_MODELS),
        });
      }

      // ─────────────────────────────────────────────────────────
      // ROUTE: /web-search (Real-time Link Scraper)
      // ─────────────────────────────────────────────────────────
      if (path.startsWith('/web-search')) {
        const query = body.query || body.messages?.[body.messages.length - 1]?.content || '';
        if (!query) return errorResponse('search', 'Query is required');
        const results = await searchWeb(query, userIP);
        return jsonResponse({ ok: true, results, forwarded_ip: userIP });
      }

      return jsonResponse({ ok: false, error: 'Route not found', client_ip: userIP }, 404);

    } catch (err) {
      return errorResponse('worker_fatal', String(err));
    }
  }
};
