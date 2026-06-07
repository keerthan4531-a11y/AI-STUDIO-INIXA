/**
 * ═══════════════════════════════════════════════════════════════════
 * INIXA Ultimate AI Gateway — Cloudflare Worker
 * ═══════════════════════════════════════════════════════════════════
 * 
 * This worker DIRECTLY hits free AI providers without going through G4F.
 * By running on Cloudflare's edge network, each request comes from
 * a different Cloudflare edge IP, effectively bypassing per-IP rate limits.
 *
 * Architecture:
 *   Browser → Vercel App → This CF Worker → Pollinations/DuckDuckGo/etc.
 *   (No G4F middleman, no SOCKS proxies, no rate limit issues)
 *
 * Supported providers:
 *   1. Pollinations.ai (text.pollinations.ai) — GPT, Claude, DeepSeek, Gemini, Llama, Grok, etc.
 *   2. DuckDuckGo Chat (duck.ai) — GPT-4o mini, Claude Haiku, Llama, Mixtral
 *   3. G4F Fallback (g4f.space) — For models not available on direct providers
 *
 * Deploy: wrangler deploy --name inixa-ai-gateway
 * ═══════════════════════════════════════════════════════════════════
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Expose-Headers": "X-Provider, X-Model"
};

// ═══════════════════════════════════════════════════════════════════
// POLLINATIONS PROVIDER — Direct, No API Key, IP-based
// ═══════════════════════════════════════════════════════════════════
const POLLINATIONS_API = "https://text.pollinations.ai/openai/chat/completions";
const POLLINATIONS_MODELS_API = "https://text.pollinations.ai/models";

// Map friendly names to Pollinations model names
const POLLINATIONS_MODEL_MAP = {
  // GPT models
  "gpt-5-nano": "openai-fast",
  "gpt-5.4-nano": "openai",
  "gpt-4o": "openai-large",
  "gpt-4o-mini": "openai-fast",
  "openai": "openai",
  "openai-fast": "openai-fast",
  "openai-large": "openai-large",
  "openai-xlarge": "openai-xlarge",
  "openai-reasoning": "openai-reasoning",
  // Claude models
  "claude": "claude-hybrid",
  "claude-hybrid": "claude-hybrid",
  // DeepSeek models
  "deepseek": "deepseek-chat",
  "deepseek-chat": "deepseek-chat",
  "deepseek-r1": "deepseek-r1",
  "deepseek-reasoner": "deepseek-reasoner",
  // Google models
  "gemini": "gemini",
  "gemini-2.5-flash": "gemini",
  // Meta models
  "llama": "llama",
  "llama-4": "llama",
  // Mistral
  "mistral": "mistral",
  "mistral-small": "mistral-small",
  // Qwen
  "qwen": "qwen-coder",
  "qwen-coder": "qwen-coder",
  // xAI
  "grok": "grok",
  // Search
  "searchgpt": "searchgpt",
  // Multi-model
  "unity": "unity",
  // Cohere
  "command-a": "command-a",
  "command-r": "command-a",
};

async function handlePollinations(body, isStream) {
  const model = POLLINATIONS_MODEL_MAP[body.model] || body.model || "openai";
  
  const requestBody = {
    model: model,
    messages: body.messages,
    stream: isStream,
  };
  if (body.temperature !== undefined) requestBody.temperature = body.temperature;
  if (body.max_tokens !== undefined) requestBody.max_tokens = body.max_tokens;

  const response = await fetch(POLLINATIONS_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    },
    body: JSON.stringify(requestBody)
  });

  return response;
}

// ═══════════════════════════════════════════════════════════════════
// DUCKDUCKGO CHAT PROVIDER — Free, session-based
// ═══════════════════════════════════════════════════════════════════

const DDG_STATUS_URL = "https://duckduckgo.com/duckchat/v1/status";
const DDG_CHAT_URL = "https://duckduckgo.com/duckchat/v1/chat";

const DDG_MODEL_MAP = {
  "gpt-4o-mini": "gpt-4o-mini",
  "gpt-5-mini": "gpt-5-mini",
  "claude-3-haiku": "claude-3-haiku-20240307",
  "claude-haiku-4-5": "claude-haiku-4-5-20251001",
  "llama-3.1-70b": "meta-llama/Llama-3.3-70B-Instruct-Turbo",
  "llama-4-scout": "meta-llama/Llama-4-Scout-17B-16E-Instruct",
  "mixtral-8x7b": "mistralai/Mixtral-8x7B-Instruct-v0.1",
  "mistral-small-4": "mistralai/Mistral-Small-24B-Instruct-2501",
  "gpt-oss-120b": "openai/gpt-oss-120b",
};

async function getDDGToken() {
  const response = await fetch(DDG_STATUS_URL, {
    method: "GET",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "application/json",
      "x-vqd-accept": "1"
    }
  });
  
  const vqd = response.headers.get("x-vqd-4");
  if (!vqd) {
    throw new Error("Failed to get DuckDuckGo VQD token");
  }
  return vqd;
}

async function handleDDG(body) {
  const model = DDG_MODEL_MAP[body.model] || body.model || "gpt-4o-mini";
  
  // Get a fresh VQD token for each request
  const vqdToken = await getDDGToken();
  
  const messages = body.messages || [];
  
  const response = await fetch(DDG_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "text/event-stream",
      "x-vqd-4": vqdToken
    },
    body: JSON.stringify({
      model: model,
      messages: messages.map(m => ({ role: m.role, content: m.content }))
    })
  });
  
  if (!response.ok) {
    throw new Error("DuckDuckGo returned " + response.status);
  }
  
  // Parse DDG SSE stream and convert to OpenAI format
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = "";
  let buffer = "";
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;
      
      try {
        const parsed = JSON.parse(data);
        if (parsed.message) {
          fullContent += parsed.message;
        }
      } catch (e) {}
    }
  }
  
  // Return OpenAI-compatible response
  return new Response(JSON.stringify({
    id: "chatcmpl-ddg-" + Date.now(),
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: model,
    choices: [{
      index: 0,
      message: { role: "assistant", content: fullContent },
      finish_reason: "stop"
    }],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
  }), {
    headers: { "Content-Type": "application/json" }
  });
}

// ═══════════════════════════════════════════════════════════════════
// G4F FALLBACK — For models not available on direct providers
// ═══════════════════════════════════════════════════════════════════
async function handleG4FFallback(body, isStream) {
  const response = await fetch("https://g4f.space/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "https://g4f.dev",
      "Referer": "https://g4f.dev/",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    },
    body: JSON.stringify(body)
  });
  return response;
}

// ═══════════════════════════════════════════════════════════════════
// SMART ROUTER — Determines best provider for each model
// ═══════════════════════════════════════════════════════════════════

function getProviderForModel(model, provider) {
  // If explicit provider requested
  if (provider === "pollinations") return "pollinations";
  if (provider === "ddg" || provider === "duckduckgo") return "ddg";
  if (provider === "g4f") return "g4f";
  
  // Auto-route based on model name
  if (model in POLLINATIONS_MODEL_MAP) return "pollinations";
  if (model in DDG_MODEL_MAP) return "ddg";
  
  // Check if it looks like a G4F server model
  if (model.startsWith("srv_")) return "g4f";
  
  // Default to pollinations (widest model support)
  return "pollinations";
}

// ═══════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // Health check
    if (path === "/" || path === "/health") {
      return addCors(Response.json({
        status: "ok",
        service: "INIXA Ultimate AI Gateway",
        providers: ["pollinations", "duckduckgo", "g4f-fallback"],
        endpoints: ["/v1/chat/completions", "/v1/models", "/pollinations", "/ddg"]
      }));
    }

    // Models endpoint
    if (path.endsWith("/models")) {
      try {
        const pollinationsModels = await fetch(POLLINATIONS_MODELS_API);
        const pollinationsData = await pollinationsModels.json();
        
        // Combine Pollinations + DDG models
        const allModels = [];
        
        // Add Pollinations models
        if (Array.isArray(pollinationsData)) {
          for (const m of pollinationsData) {
            allModels.push({
              id: m.name || m,
              object: "model",
              created: 0,
              owned_by: "pollinations"
            });
          }
        }
        
        // Add DDG models
        for (const [alias, actual] of Object.entries(DDG_MODEL_MAP)) {
          allModels.push({
            id: "ddg/" + alias,
            object: "model",
            created: 0,
            owned_by: "duckduckgo"
          });
        }
        
        return addCors(Response.json({ object: "list", data: allModels }));
      } catch (e) {
        return addCors(Response.json({ error: e.message }, { status: 500 }));
      }
    }

    // Chat completions
    if (path.endsWith("/chat/completions") && request.method === "POST") {
      try {
        const body = await request.json();
        let model = body.model || "openai";
        const isStream = body.stream || false;
        const requestedProvider = body.provider;
        
        // Handle ddg/ prefix
        if (model.startsWith("ddg/")) {
          model = model.replace("ddg/", "");
          return addCors(await handleDDG({ ...body, model }));
        }
        
        // Handle g4f/ prefix  
        if (model.startsWith("g4f/")) {
          return addCors(await handleG4FFallback(body, isStream));
        }
        
        // Determine provider
        const provider = getProviderForModel(model, requestedProvider);
        
        let response;
        let providerUsed = provider;
        
        if (provider === "pollinations") {
          response = await handlePollinations(body, isStream);
          
          // If Pollinations rate-limited, try DDG fallback
          if (response.status === 429) {
            console.log("[Gateway] Pollinations 429, trying DDG fallback...");
            try {
              response = await handleDDG(body);
              providerUsed = "ddg-fallback";
            } catch (e) {
              // Return original Pollinations error
              console.log("[Gateway] DDG fallback also failed:", e.message);
            }
          }
        } else if (provider === "ddg") {
          response = await handleDDG(body);
        } else {
          response = await handleG4FFallback(body, isStream);
        }
        
        const newResponse = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
        
        newResponse.headers.set("X-Provider", providerUsed);
        newResponse.headers.set("X-Model", model);
        newResponse.headers.set("Access-Control-Allow-Origin", "*");
        
        return newResponse;
        
      } catch (error) {
        return addCors(Response.json({
          error: { message: error.message, type: "gateway_error" }
        }, { status: 500 }));
      }
    }

    // Legacy endpoint aliases
    if (path === "/pollinations" && request.method === "POST") {
      try {
        const body = await request.json();
        const response = await handlePollinations(body, body.stream);
        return addCors(response);
      } catch (e) {
        return addCors(Response.json({ error: e.message }, { status: 500 }));
      }
    }

    if (path === "/ddg" && request.method === "POST") {
      try {
        const body = await request.json();
        const response = await handleDDG(body);
        return addCors(response);
      } catch (e) {
        return addCors(Response.json({ error: e.message }, { status: 500 }));
      }
    }

    return addCors(Response.json({ error: "Not found" }, { status: 404 }));
  }
};

function addCors(response) {
  const newHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    newHeaders.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}
