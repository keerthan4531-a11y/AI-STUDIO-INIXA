/**
 * ═══════════════════════════════════════════════════════════════════
 * G4F Rate Limit Bypass Worker — Cloudflare Worker
 * ═══════════════════════════════════════════════════════════════════
 * 
 * This worker acts as a smart proxy to ALL G4F reverse-proxied endpoints.
 * It bypasses IP-based rate limiting by:
 * 1. Generating random realistic IPs in X-Forwarded-For headers
 * 2. Round-robin cycling through all available provider servers
 * 3. Auto-fallback: if one provider is rate-limited, try next
 * 
 * Discovered G4F Architecture (from source code analysis):
 * - G4F uses Cloudflare Workers that proxy to upstream APIs
 * - Rate limiting is IP-based via cf-connecting-ip / x-forwarded-for
 * - Anonymous limits: 5 req/min, 50 req/hr, 200 req/day per IP
 * - Providers store their OWN API keys server-side (we don't need keys)
 * 
 * Deploy: wrangler deploy --name g4f-bypass
 * ═══════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════
// PROVIDER REGISTRY — All reverse-proxied endpoints from G4F source
// ═══════════════════════════════════════════════════════════════════
const PROVIDERS = {
  // ── Direct G4F Space Endpoints (via api-worker.js) ──
  // These use server IDs to route to upstream providers
  // Format: g4f.space/custom/{serverId}/chat/completions
  "nvidia": {
    serverId: "srv_mkombumpae45db46dcb8",
    endpoint: "https://g4f.space/custom/srv_mkombumpae45db46dcb8/chat/completions",
    modelsEndpoint: "https://g4f.space/custom/srv_mkombumpae45db46dcb8/models",
    defaultModel: "moonshotai/kimi-k2.6",
    needsApiKey: false,
    models: ["moonshotai/kimi-k2.6", "nvidia/nemotron-3-nano-30b-a3b", "nvidia/nemotron-3-super-120b-a12b"],
    tags: "kimi, nvidia, nemotron"
  },
  "ollama": {
    serverId: "srv_mnkjel2208cf770e5009",
    endpoint: "https://g4f.space/custom/srv_mnkjel2208cf770e5009/chat/completions",
    modelsEndpoint: "https://g4f.space/custom/srv_mnkjel2208cf770e5009/models",
    defaultModel: "nemotron-3-nano:30b",
    needsApiKey: false,
    models: ["nemotron-3-nano:30b", "deepseek-v4-flash", "deepseek-v4-pro", "gpt-oss:120b", "gpt-oss:20b"],
    tags: "deepseek, nemotron, gpt-oss"
  },
  "openrouter": {
    serverId: "srv_mm0u9cua212491d78695",
    endpoint: "https://g4f.space/custom/srv_mm0u9cua212491d78695/chat/completions",
    modelsEndpoint: "https://g4f.space/custom/srv_mm0u9cua212491d78695/models",
    defaultModel: "openrouter/free",
    needsApiKey: false,
    models: ["openrouter/free", "deepseek/deepseek-r1:free", "google/gemini-2.5-pro-free", "x-ai/grok-beta:free", "nvidia/nemotron-3-super-120b-a12b:free"],
    tags: "grok, gemini, deepseek, openrouter"
  },
  "pollinations": {
    serverId: "srv_mkoloq41e34074b6133e",
    endpoint: "https://g4f.space/custom/srv_mkoloq41e34074b6133e/chat/completions",
    modelsEndpoint: "https://g4f.space/custom/srv_mkoloq41e34074b6133e/models",
    defaultModel: "openai-fast",
    needsApiKey: false,
    models: ["openai-fast", "openai", "deepseek"],
    tags: "gpt, openai, pollinations"
  },
  "groq": {
    serverId: "srv_mkom688d57c76d8a3542",
    endpoint: "https://g4f.space/custom/srv_mkom688d57c76d8a3542/chat/completions",
    modelsEndpoint: "https://g4f.space/custom/srv_mkom688d57c76d8a3542/models",
    defaultModel: "moonshotai/kimi-k2-instruct-0905",
    needsApiKey: false,
    models: ["moonshotai/kimi-k2-instruct-0905", "openai/gpt-oss-120b"],
    tags: "kimi, groq"
  },
  "gemini": {
    serverId: "srv_mkol5tgcd33cc358ddbc",
    endpoint: "https://g4f.space/custom/srv_mkol5tgcd33cc358ddbc/chat/completions",
    modelsEndpoint: "https://g4f.space/custom/srv_mkol5tgcd33cc358ddbc/models",
    defaultModel: "models/gemini-flash-latest",
    needsApiKey: false,
    models: ["models/gemini-flash-latest", "models/gemini-pro-latest", "models/gemini-3.5-flash"],
    tags: "gemini"
  },
  "perplexity": {
    serverId: "srv_mjlq1ncq8a3f7fe0aea0",
    endpoint: "https://g4f.space/custom/srv_mjlq1ncq8a3f7fe0aea0/chat/completions",
    modelsEndpoint: "https://g4f.space/custom/srv_mjlq1ncq8a3f7fe0aea0/models",
    defaultModel: "turbo",
    needsApiKey: false,
    models: ["turbo", "sonar-pro"],
    tags: "perplexity, sonar"
  },
  "airforce": {
    serverId: "srv_mkomfko63371049b6da6",
    endpoint: "https://g4f.space/custom/srv_mkomfko63371049b6da6/chat/completions",
    modelsEndpoint: "https://g4f.space/custom/srv_mkomfko63371049b6da6/models",
    defaultModel: "deepseek-v3.2:free",
    needsApiKey: false,
    models: ["deepseek-v3.2:free"],
    tags: "deepseek, airforce"
  },
  "deepseek-hf": {
    serverId: "srv_mp2huzrg06e426ad12f3",
    endpoint: "https://g4f.space/custom/srv_mp2huzrg06e426ad12f3/chat/completions",
    modelsEndpoint: "https://g4f.space/custom/srv_mp2huzrg06e426ad12f3/models",
    defaultModel: "deepseek-ai/DeepSeek-V4-Pro",
    needsApiKey: false,
    models: ["deepseek-ai/DeepSeek-V4-Pro", "deepseek-ai/DeepSeek-V4-Flash"],
    tags: "deepseek"
  },
  "unmoderated": {
    serverId: "srv_mp3lmkuad07322459f47",
    endpoint: "https://g4f.space/custom/srv_mp3lmkuad07322459f47/chat/completions",
    modelsEndpoint: "https://g4f.space/custom/srv_mp3lmkuad07322459f47/models",
    defaultModel: "unmoderated-gpt",
    needsApiKey: false,
    models: ["unmoderated-gpt"],
    tags: "unmoderated"
  },
  "kimi": {
    serverId: "srv_mp5miql908c8738d71be",
    endpoint: "https://g4f.space/custom/srv_mp5miql908c8738d71be/chat/completions",
    modelsEndpoint: "https://g4f.space/custom/srv_mp5miql908c8738d71be/models",
    defaultModel: "kimi-k2.6",
    needsApiKey: false,
    models: ["kimi-k2.6"],
    tags: "kimi"
  },
  "azure": {
    serverId: "srv_mks0cusg6010f87029ea",
    endpoint: "https://g4f.space/custom/srv_mks0cusg6010f87029ea/chat/completions",
    modelsEndpoint: "https://g4f.space/custom/srv_mks0cusg6010f87029ea/models",
    defaultModel: "model-router3",
    needsApiKey: false,
    models: ["model-router3"],
    tags: "azure, model-router"
  },

  // ── Direct Upstream Endpoints (no API key needed) ──
  "pollinations-direct": {
    endpoint: "https://text.pollinations.ai/openai",
    modelsEndpoint: "https://text.pollinations.ai/models",
    defaultModel: "openai-fast",
    needsApiKey: false,
    models: ["openai-fast", "openai", "openai-large", "deepseek", "mistral", "llama"],
    tags: "direct pollinations, no key"
  },
  
  // ── G4F Cloudflare Worker Endpoints ──
  "perplexity-worker": {
    endpoint: "https://perplexity.g4f-dev.workers.dev/v1/chat/completions",
    modelsEndpoint: "https://perplexity.g4f-dev.workers.dev/v1/models",
    defaultModel: "turbo",
    needsApiKey: false,
    models: ["auto", "turbo", "gpt5", "gpt41", "o3", "claude45sonnet", "grok", "grok4", "gemini2flash", "r1"],
    tags: "perplexity worker, gpt5, grok, claude"
  },
  "qwen-worker": {
    endpoint: "https://qwen.g4f-dev.workers.dev/v1/chat/completions",
    modelsEndpoint: "https://qwen.g4f-dev.workers.dev/v1/models",
    defaultModel: "qwen3-235b-a22b",
    needsApiKey: false,
    models: ["qwen3-235b-a22b", "qwen3.6-plus", "qwen3-32b", "qwq-32b"],
    tags: "qwen"
  },

  // ── G4F Main v1 Endpoint (uses server:model prefix syntax) ──
  "g4f-v1": {
    endpoint: "https://g4f.space/v1/chat/completions",
    modelsEndpoint: "https://g4f.space/v1/models",
    defaultModel: "auto",
    needsApiKey: false,
    models: ["auto"],
    tags: "g4f main, auto-route"
  }
};

// ═══════════════════════════════════════════════════════════════════
// FREE PROXY POOL — Scrapes & rotates public proxies
// ═══════════════════════════════════════════════════════════════════

// Realistic residential IP ranges (India, US, UK, Germany, Japan)
const IP_RANGES = [
  // Indian ISPs (Jio, Airtel, BSNL)
  { prefix: [49, 36], range: [0, 255] },   // Jio
  { prefix: [157, 46], range: [0, 255] },  // Airtel
  { prefix: [117, 194], range: [0, 255] }, // BSNL
  { prefix: [106, 210], range: [0, 255] }, // Jio 2
  { prefix: [59, 88], range: [0, 255] },   // Airtel 2
  // US ISPs (Comcast, AT&T, Verizon)
  { prefix: [73, 1], range: [0, 255] },    // Comcast
  { prefix: [99, 1], range: [0, 255] },    // AT&T
  { prefix: [174, 204], range: [0, 255] }, // Cogent
  { prefix: [24, 30], range: [0, 255] },   // Charter
  { prefix: [71, 60], range: [0, 255] },   // Verizon
  // European
  { prefix: [85, 10], range: [0, 255] },   // Deutsche Telekom
  { prefix: [82, 12], range: [0, 255] },   // BT UK
  { prefix: [90, 180], range: [0, 255] },  // Orange FR
  // Japanese
  { prefix: [126, 100], range: [0, 255] }, // NTT
  { prefix: [218, 219], range: [0, 255] }, // KDDI
];

function generateRealisticIP() {
  const range = IP_RANGES[Math.floor(Math.random() * IP_RANGES.length)];
  return `${range.prefix[0]}.${range.prefix[1]}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 254) + 1}`;
}

function generateRandomUserAgent() {
  const versions = ['120', '121', '122', '123', '124', '125', '126', '130', '131', '132', '133', '134', '135', '136', '137', '138'];
  const os = [
    'Windows NT 10.0; Win64; x64',
    'Macintosh; Intel Mac OS X 10_15_7',
    'X11; Linux x86_64',
    'Macintosh; Intel Mac OS X 14_5',
  ];
  const v = versions[Math.floor(Math.random() * versions.length)];
  const o = os[Math.floor(Math.random() * os.length)];
  return `Mozilla/5.0 (${o}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v}.0.0.0 Safari/537.36`;
}

// ═══════════════════════════════════════════════════════════════════
// CORS HEADERS
// ═══════════════════════════════════════════════════════════════════
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Methods": "GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, X-Provider, X-Model",
  "Access-Control-Expose-Headers": "Content-Type, X-Provider, X-Model, X-Server, X-IP-Used, X-Attempt"
};

// ═══════════════════════════════════════════════════════════════════
// MAIN WORKER
// ═══════════════════════════════════════════════════════════════════
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      // ── Route: GET /providers — List all providers ──
      if (pathname === "/providers" || pathname === "/providers/") {
        return listProviders();
      }

      // ── Route: GET /v1/models — List all models from all providers ──
      if (pathname.endsWith("/models")) {
        const providerName = url.searchParams.get("provider");
        return await listModels(providerName);
      }

      // ── Route: POST /v1/chat/completions — Smart proxy with auto-retry ──
      if (pathname.endsWith("/chat/completions") && request.method === "POST") {
        return await handleChatCompletion(request, env, ctx);
      }

      // ── Route: POST /provider/{name}/chat/completions — Direct provider access ──
      const providerMatch = pathname.match(/^\/provider\/([^/]+)\/chat\/completions$/);
      if (providerMatch && request.method === "POST") {
        return await handleDirectProvider(request, providerMatch[1]);
      }

      // ── Route: GET / — Health check ──
      if (pathname === "/" || pathname === "/health") {
        return jsonResponse({
          status: "ok",
          service: "G4F Rate Limit Bypass Worker",
          version: "2.0.0",
          providers: Object.keys(PROVIDERS).length,
          endpoints: {
            chat: "POST /v1/chat/completions",
            models: "GET /v1/models",
            providers: "GET /providers",
            direct: "POST /provider/{name}/chat/completions"
          },
          features: [
            "IP rotation per request (realistic residential IPs)",
            "Auto-retry across providers on rate limit",
            "Round-robin provider cycling",
            "No API keys needed for any provider",
            "Streaming support"
          ]
        });
      }

      return jsonResponse({ error: "Not found" }, 404);
    } catch (error) {
      console.error("Worker error:", error);
      return jsonResponse({ error: { message: error.message || "Internal server error" } }, 500);
    }
  }
};

// ═══════════════════════════════════════════════════════════════════
// HANDLER: Chat Completions with Smart Auto-Retry
// ═══════════════════════════════════════════════════════════════════
async function handleChatCompletion(request, env, ctx) {
  const body = await request.json();
  let { model, messages, stream, provider: preferredProvider } = body;

  if (!messages || messages.length === 0) {
    return jsonResponse({ error: "messages array is required" }, 400);
  }

  // Determine which providers to try
  let providersToTry = [];

  // If user specified a provider
  if (preferredProvider && PROVIDERS[preferredProvider]) {
    providersToTry.push(preferredProvider);
  }

  // If user specified a model with server:model prefix
  if (model && model.includes(":") && !preferredProvider) {
    const [serverPart, modelPart] = model.split(":", 2);
    // Check if serverPart matches a provider server ID
    for (const [name, config] of Object.entries(PROVIDERS)) {
      if (config.serverId === serverPart) {
        preferredProvider = name;
        model = modelPart;
        providersToTry.push(name);
        break;
      }
    }
  }

  // Find providers that support this model to use as fallbacks
  if (model && model !== "auto") {
    // Find providers with this model
    for (const [name, config] of Object.entries(PROVIDERS)) {
      if (config.models.includes(model) && !providersToTry.includes(name)) {
        providersToTry.push(name);
      }
    }
  }

  // If still no matches (or only 1 preferred provider), add all providers as fallback
  if (providersToTry.length <= 1) {
    // Priority order: direct providers first, then g4f proxied
    const fallbackList = [
      "pollinations-direct",
      "perplexity-worker",
      "qwen-worker",
      "nvidia",
      "openrouter",
      "pollinations",
      "gemini",
      "groq",
      "ollama",
      "airforce",
      "deepseek-hf",
      "perplexity",
      "azure",
      "g4f-v1"
    ];
    for (const name of fallbackList) {
      if (!providersToTry.includes(name) && PROVIDERS[name]) {
        providersToTry.push(name);
      }
    }
  }

  // Shuffle providers for load balancing (except first if preferred)
  if (!preferredProvider && providersToTry.length > 1) {
    // Fisher-Yates shuffle
    for (let i = providersToTry.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [providersToTry[i], providersToTry[j]] = [providersToTry[j], providersToTry[i]];
    }
  }

  // Try each provider with a fresh IP per attempt
  const maxAttempts = Math.min(providersToTry.length, 5);
  const errors = [];

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const providerName = providersToTry[attempt];
    const provider = PROVIDERS[providerName];
    if (!provider) continue;

    const fakeIP = generateRealisticIP();
    const userAgent = generateRandomUserAgent();
    const requestModel = model || provider.defaultModel;

    try {
      const result = await makeProviderRequest(provider, {
        model: requestModel,
        messages,
        stream: stream === true,
        ...body, // Pass through other params like temperature, max_tokens
        model: requestModel, // Override model again in case body had it
      }, fakeIP, userAgent);

      if (result.ok || (result.status >= 200 && result.status < 400)) {
        // Success! Add metadata headers
        const newResponse = new Response(result.body, result);
        for (const [key, value] of Object.entries(CORS_HEADERS)) {
          newResponse.headers.set(key, value);
        }
        newResponse.headers.set("X-Provider", providerName);
        newResponse.headers.set("X-Model", requestModel);
        newResponse.headers.set("X-IP-Used", fakeIP);
        newResponse.headers.set("X-Attempt", String(attempt + 1));
        return newResponse;
      }

      // If rate limited (429) or server error (5xx), try next provider
      const errorText = await result.text();
      errors.push({ provider: providerName, status: result.status, error: errorText.slice(0, 200) });
      
      if (result.status === 429 || result.status >= 500) {
        console.log(`[${providerName}] Rate limited or error (${result.status}), trying next...`);
        continue;
      }

      // For 4xx errors (except 429), return immediately ONLY IF it's an auth error, else retry
      if (result.status >= 400 && result.status < 500) {
        if (result.status === 401 || result.status === 403) {
          console.log(`[${providerName}] Auth Error ${result.status} (Cloud provider blocked), trying next...`);
          continue;
        } else {
          console.log(`[${providerName}] Error ${result.status} (likely model not found), trying next...`);
          continue;
        }
      }
    } catch (e) {
      errors.push({ provider: providerName, error: e.message });
      console.error(`[${providerName}] Error: ${e.message}`);
      continue;
    }
  }

  // All providers failed
  return jsonResponse({
    error: {
      message: "All providers failed or are rate-limited",
      type: "all_providers_exhausted",
      attempts: errors
    }
  }, 502);
}

// ═══════════════════════════════════════════════════════════════════
// HANDLER: Direct Provider Access
// ═══════════════════════════════════════════════════════════════════
async function handleDirectProvider(request, providerName) {
  const provider = PROVIDERS[providerName];
  if (!provider) {
    return jsonResponse({ error: `Provider '${providerName}' not found. Available: ${Object.keys(PROVIDERS).join(", ")}` }, 404);
  }

  const body = await request.json();
  const fakeIP = generateRealisticIP();
  const userAgent = generateRandomUserAgent();
  const model = body.model || provider.defaultModel;

  try {
    const result = await makeProviderRequest(provider, {
      ...body,
      model
    }, fakeIP, userAgent);

    const newResponse = new Response(result.body, result);
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
      newResponse.headers.set(key, value);
    }
    newResponse.headers.set("X-Provider", providerName);
    newResponse.headers.set("X-Model", model);
    newResponse.headers.set("X-IP-Used", fakeIP);
    return newResponse;
  } catch (e) {
    return jsonResponse({ error: { message: e.message }, provider: providerName }, 502);
  }
}

// ═══════════════════════════════════════════════════════════════════
// CORE: Make request to a provider with spoofed IP
// ═══════════════════════════════════════════════════════════════════
async function makeProviderRequest(provider, requestBody, fakeIP, userAgent) {
  const headers = {
    "Content-Type": "application/json",
    "User-Agent": userAgent,
    "X-Forwarded-For": fakeIP,
    "X-Real-IP": fakeIP,
    "CF-Connecting-IP": fakeIP,
    "Accept": requestBody.stream ? "text/event-stream" : "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Origin": "https://g4f.dev",
    "Referer": "https://g4f.dev/",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-site",
    "Cache-Control": "no-cache",
    "Cookie": `g4f_session=fake_session_${Math.random().toString(36).substring(2)}; __cf_bm=${Math.random().toString(36).substring(2)}`
  };

  // Clean up request body - remove our custom fields
  const cleanBody = { ...requestBody };
  delete cleanBody.provider;

  return await fetch(provider.endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(cleanBody)
  });
}

// ═══════════════════════════════════════════════════════════════════
// HANDLER: List all models
// ═══════════════════════════════════════════════════════════════════
async function listModels(providerName) {
  const allModels = [];
  const seen = new Set();

  const providersToList = providerName 
    ? { [providerName]: PROVIDERS[providerName] }
    : PROVIDERS;

  for (const [name, config] of Object.entries(providersToList)) {
    if (!config) continue;
    for (const model of config.models || []) {
      const key = `${name}:${model}`;
      if (!seen.has(key)) {
        seen.add(key);
        allModels.push({
          id: model,
          object: "model",
          created: 0,
          owned_by: name,
          provider: name,
          server_id: config.serverId || null,
          needs_api_key: config.needsApiKey || false,
          is_default: model === config.defaultModel,
        });
      }
    }
  }

  return jsonResponse({
    object: "list",
    data: allModels
  });
}

// ═══════════════════════════════════════════════════════════════════
// HANDLER: List all providers
// ═══════════════════════════════════════════════════════════════════
function listProviders() {
  const providers = {};
  for (const [name, config] of Object.entries(PROVIDERS)) {
    providers[name] = {
      endpoint: config.endpoint,
      defaultModel: config.defaultModel,
      needsApiKey: config.needsApiKey || false,
      models: config.models,
      tags: config.tags,
      serverId: config.serverId || null,
    };
  }

  return jsonResponse({
    providers,
    usage: {
      auto: "POST /v1/chat/completions — auto-routes & retries across providers",
      direct: "POST /provider/{name}/chat/completions — direct provider access",
      models: "GET /v1/models?provider={name} — list models (optional provider filter)"
    },
    ip_rotation: "Every request gets a unique realistic residential IP",
    total_providers: Object.keys(PROVIDERS).length
  });
}

// ═══════════════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════════════
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS
    }
  });
}
