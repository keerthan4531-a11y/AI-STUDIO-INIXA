/**
 * ═══════════════════════════════════════════════════════════════════════
 * INIXA Ultimate AI Gateway v2.0 — Cloudflare Worker
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Multi-provider reverse-engineered AI gateway designed to handle 1L+ users.
 * Each request exits from a different Cloudflare edge IP, effectively
 * bypassing per-IP rate limits on upstream providers.
 *
 * Architecture:
 *   Browser → Next.js App → This CF Worker → [6 AI Providers w/ auto-failover]
 *
 * Supported providers (all FREE, no API keys needed):
 *   1. Pollinations.ai   — GPT, Claude, DeepSeek, Gemini, Llama, Grok
 *   2. DuckDuckGo Chat   — GPT-4o-mini, GPT-5-mini, Claude Haiku, Llama
 *   3. Qwen (Alibaba)    — Qwen-3-235B (browser fingerprint spoofing)
 *   4. Perplexity.ai     — Turbo (free, session simulation)
 *   5. Puter.js          — GPT-4o, Claude, Gemini, DeepSeek (free cloud API)
 *   6. G4F Fallback      — For anything else
 *
 * Failover chain: Pollinations → DDG → Qwen → Perplexity → Puter → G4F
 *
 * Deploy: wrangler deploy --name inixa-ai-gateway
 * ═══════════════════════════════════════════════════════════════════════
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Expose-Headers": "X-Provider, X-Model, X-Fallback-Chain"
};

// ═══════════════════════════════════════════════════════════════════════
// PROVIDER HEALTH TRACKING (in-memory, per worker instance)
// ═══════════════════════════════════════════════════════════════════════

const providerHealth = {
  pollinations: { successes: 0, failures: 0, lastError: 0 },
  ddg:          { successes: 0, failures: 0, lastError: 0 },
  qwen:         { successes: 0, failures: 0, lastError: 0 },
  perplexity:   { successes: 0, failures: 0, lastError: 0 },
  puter:        { successes: 0, failures: 0, lastError: 0 },
  g4f:          { successes: 0, failures: 0, lastError: 0 },
};

function recordSuccess(provider) {
  if (providerHealth[provider]) providerHealth[provider].successes++;
}

function recordFailure(provider) {
  if (providerHealth[provider]) {
    providerHealth[provider].failures++;
    providerHealth[provider].lastError = Date.now();
  }
}

function getSuccessRate(provider) {
  const h = providerHealth[provider];
  if (!h) return 0;
  const total = h.successes + h.failures;
  if (total === 0) return 1; // assume healthy if untested
  return h.successes / total;
}

function isProviderHealthy(provider) {
  const h = providerHealth[provider];
  if (!h) return true;
  // If last error was < 30s ago and success rate < 30%, skip
  if (Date.now() - h.lastError < 30000 && getSuccessRate(provider) < 0.3) return false;
  return true;
}


// ═══════════════════════════════════════════════════════════════════════
// 1. POLLINATIONS PROVIDER — Direct, No API Key
// ═══════════════════════════════════════════════════════════════════════

const POLLINATIONS_API = "https://text.pollinations.ai/openai/chat/completions";
const POLLINATIONS_MODELS_API = "https://text.pollinations.ai/models";

const POLLINATIONS_MODEL_MAP = {
  "gpt-5-nano": "openai-fast",
  "gpt-5.4-nano": "openai",
  "gpt-4o": "openai-large",
  "gpt-4o-mini": "openai-fast",
  "openai": "openai",
  "openai-fast": "openai-fast",
  "openai-large": "openai-large",
  "openai-xlarge": "openai-xlarge",
  "openai-reasoning": "openai-reasoning",
  "claude": "claude-hybrid",
  "claude-hybrid": "claude-hybrid",
  "deepseek": "deepseek-chat",
  "deepseek-chat": "deepseek-chat",
  "deepseek-r1": "deepseek-r1",
  "deepseek-reasoner": "deepseek-reasoner",
  "gemini": "gemini",
  "gemini-2.5-flash": "gemini",
  "llama": "llama",
  "llama-4": "llama",
  "mistral": "mistral",
  "mistral-small": "mistral-small",
  "qwen": "qwen-coder",
  "qwen-coder": "qwen-coder",
  "grok": "grok",
  "searchgpt": "searchgpt",
  "unity": "unity",
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


// ═══════════════════════════════════════════════════════════════════════
// 2. DUCKDUCKGO CHAT PROVIDER — VQD Token Based
// ═══════════════════════════════════════════════════════════════════════

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
  if (!vqd) throw new Error("Failed to get DuckDuckGo VQD token");
  return vqd;
}

async function handleDDG(body) {
  const model = DDG_MODEL_MAP[body.model] || body.model || "gpt-4o-mini";
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

  if (!response.ok) throw new Error("DuckDuckGo returned " + response.status);

  // Parse DDG SSE and convert to OpenAI format
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
        if (parsed.message) fullContent += parsed.message;
      } catch (e) {}
    }
  }

  return new Response(JSON.stringify({
    id: "chatcmpl-ddg-" + Date.now(),
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: model,
    choices: [{ index: 0, message: { role: "assistant", content: fullContent }, finish_reason: "stop" }],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
  }), { headers: { "Content-Type": "application/json" } });
}


// ═══════════════════════════════════════════════════════════════════════
// 3. QWEN PROVIDER — Browser Fingerprint Spoofing (from G4F)
// ═══════════════════════════════════════════════════════════════════════

const QWEN_BASE_URL = "https://chat.qwen.ai";
const QWEN_TOKEN_URL = "https://sg-wum.alibaba.com/w/wu.json";
const QWEN_DEFAULT_MODEL = "qwen3-235b-a22b";
const CUSTOM_BASE64_CHARS = "DGi0YA7BemWnQjCl4_bR3f8SKIF9tUz/xhr2oEOgPpac=61ZqwTudLkM5vHyNXsVJ";

const QWEN_MODEL_MAP = {
  "qwen": "qwen3-235b-a22b",
  "qwen3": "qwen3-235b-a22b",
  "qwen-235b": "qwen3-235b-a22b",
  "qwen3-235b": "qwen3-235b-a22b",
  "qwen-coder": "qwen3-coder-plus",
  "qwen-turbo": "qwen-turbo-latest",
  "qwen-plus": "qwen-plus-latest",
  "qwen-max": "qwen-max-latest",
  "qwq": "qwq-32b",
};

let cachedMidtoken = null;
let cachedMidtokenUses = 0;

// --- LZW Compression (from G4F qwen-worker.js) ---
function lzwCompress(data, bits, charFunc) {
  if (data == null) return "";
  const dictionary = {};
  const dictToCreate = {};
  let w = "";
  let value = 0;
  let position = 0;
  let enlargeIn = 2;
  let dictSize = 3;
  let numBits = 2;
  const result = [];

  const writeBits = (val, count) => {
    for (let i = 0; i < count; i++) {
      value = (value << 1) | ((val >> i) & 1);
      if (position === bits - 1) {
        result.push(charFunc(value));
        position = 0;
        value = 0;
      } else {
        position++;
      }
    }
  };

  for (let i = 0; i < data.length; i++) {
    const c = data[i];
    if (!(c in dictionary)) {
      dictionary[c] = dictSize++;
      dictToCreate[c] = true;
    }
    const wc = w + c;
    if (wc in dictionary) {
      w = wc;
    } else {
      if (Object.prototype.hasOwnProperty.call(dictToCreate, w)) {
        const w0 = w.charCodeAt(0);
        if (w0 < 256) { writeBits(0, numBits); writeBits(w0, 8); }
        else { writeBits(1, numBits); writeBits(w0, 16); }
        delete dictToCreate[w];
      } else {
        writeBits(dictionary[w], numBits);
      }
      enlargeIn -= 1;
      if (enlargeIn === 0) { enlargeIn = 1 << numBits; numBits += 1; }
      dictionary[wc] = dictSize++;
      w = c;
    }
  }

  if (w !== "") {
    if (Object.prototype.hasOwnProperty.call(dictToCreate, w)) {
      const w0 = w.charCodeAt(0);
      if (w0 < 256) { writeBits(0, numBits); writeBits(w0, 8); }
      else { writeBits(1, numBits); writeBits(w0, 16); }
      delete dictToCreate[w];
    } else {
      writeBits(dictionary[w], numBits);
    }
    enlargeIn -= 1;
    if (enlargeIn === 0) { enlargeIn = 1 << numBits; numBits += 1; }
  }

  writeBits(2, numBits);
  while (true) {
    value <<= 1;
    if (position === bits - 1) { result.push(charFunc(value)); break; }
    position++;
  }
  return result.join("");
}

function customEncode(data) {
  if (data == null) return "";
  return lzwCompress(data, 6, i => CUSTOM_BASE64_CHARS[i]);
}

function generateDeviceId() {
  let result = "";
  const chars = "0123456789abcdef";
  for (let i = 0; i < 20; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

function generateRandomHash() {
  return Math.floor(Math.random() * 0x100000000);
}

function generateQwenCookies() {
  const deviceId = generateDeviceId();
  const currentTimestamp = Date.now();
  const fields = [
    deviceId, "websdk-2.3.15d", "1765348410850", "91", "1|15",
    "zh-CN", "-480", "16705151|12791",
    "1470|956|283|797|158|0|1470|956|1470|798|0|0",
    "5", "MacIntel", "10",
    "ANGLE (Apple, ANGLE Metal Renderer: Apple M4, Unspecified Version)|Google Inc. (Apple)",
    "30|30", "0", "28",
    `5|${generateRandomHash()}`, generateRandomHash(), generateRandomHash(),
    "1", "0", "1", "0", "P", "0", "0", "0", "416",
    "Google Inc.", "8", "-1|0|0|0|0",
    generateRandomHash(), "11", currentTimestamp,
    generateRandomHash(), "0", Math.floor(Math.random() * 91) + 10
  ];

  const raw = fields.join("^");
  const ssxmod_itna = "1-" + customEncode(raw);

  const fields2 = [
    fields[0], fields[1], fields[23], 0, "", 0, "", "", "", 0, 0,
    fields[32], fields[33], 0, 0, 0, 0, 0
  ].join("^");
  const ssxmod_itna2 = "1-" + customEncode(fields2);

  return { ssxmod_itna, ssxmod_itna2 };
}

async function fetchQwenMidtoken() {
  if (!cachedMidtoken || cachedMidtokenUses >= 5) {
    const response = await fetch(QWEN_TOKEN_URL, { method: "GET" });
    if (!response.ok) throw new Error(`Failed to fetch Qwen midtoken: ${response.status}`);
    const text = await response.text();
    const match = text.match(/(?:umx\.wu|__fycb)\('([^']+)'\)/);
    if (!match) throw new Error("Failed to parse Qwen midtoken.");
    cachedMidtoken = match[1];
    cachedMidtokenUses = 1;
  } else {
    cachedMidtokenUses++;
  }
  return cachedMidtoken;
}

function buildQwenHeaders() {
  const cookies = generateQwenCookies();
  return {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.5",
    "Origin": QWEN_BASE_URL,
    "Referer": `${QWEN_BASE_URL}/`,
    "Content-Type": "application/json",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "Connection": "keep-alive",
    "X-Requested-With": "XMLHttpRequest",
    "Cookie": `ssxmod_itna=${cookies.ssxmod_itna}; ssxmod_itna2=${cookies.ssxmod_itna2}`,
    "X-Source": "web"
  };
}

async function handleQwen(body) {
  const model = QWEN_MODEL_MAP[body.model] || body.model || QWEN_DEFAULT_MODEL;
  const messages = body.messages || [];
  const lastUserMsg = extractLastUserMessage(messages);

  const headers = buildQwenHeaders();
  try {
    const midtoken = await fetchQwenMidtoken();
    headers["bx-umidtoken"] = midtoken;
    headers["bx-v"] = "2.5.31";
  } catch (e) {
    console.error("[Qwen] midtoken fetch failed:", e.message);
    // Continue without midtoken — might still work
  }

  const chatId = crypto.randomUUID();
  const qwenBody = {
    stream: true,
    chat_id: chatId,
    content: lastUserMsg,
    model: model,
    chat_type: "t2t",
    // Send full conversation for context
    messages: messages.map(m => ({
      role: m.role === "system" ? "user" : m.role,
      content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
      chat_type: "t2t"
    }))
  };

  const response = await fetch(`${QWEN_BASE_URL}/api/v2/chats/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(qwenBody)
  });

  if (!response.ok) {
    throw new Error(`Qwen returned ${response.status}: ${await response.text().catch(() => "")}`);
  }

  // Parse Qwen's SSE stream → OpenAI format
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
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta;
        if (delta?.content) fullContent += delta.content;
      } catch (e) {}
    }
  }

  if (!fullContent) throw new Error("Qwen returned empty response");

  return new Response(JSON.stringify({
    id: "chatcmpl-qwen-" + Date.now(),
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: model,
    choices: [{ index: 0, message: { role: "assistant", content: fullContent }, finish_reason: "stop" }],
    usage: { prompt_tokens: 0, completion_tokens: Math.ceil(fullContent.length / 4), total_tokens: Math.ceil(fullContent.length / 4) }
  }), { headers: { "Content-Type": "application/json" } });
}


// ═══════════════════════════════════════════════════════════════════════
// 4. PERPLEXITY PROVIDER — Session Simulation (from G4F)
// ═══════════════════════════════════════════════════════════════════════

const PERPLEXITY_URL = "https://www.perplexity.ai";

const PERPLEXITY_MODEL_MAP = {
  "perplexity": "turbo",
  "perplexity-turbo": "turbo",
  "pplx": "turbo",
};

async function handlePerplexity(body) {
  const model = PERPLEXITY_MODEL_MAP[body.model] || "turbo"; // Free tier only supports turbo
  const messages = body.messages || [];
  const lastUserMsg = extractLastUserMessage(messages);

  const conversation = {
    frontend_uid: crypto.randomUUID(),
    frontend_context_uuid: crypto.randomUUID(),
    visitor_id: crypto.randomUUID(),
    user_id: null,
  };

  const requestId = crypto.randomUUID();

  const headers = {
    "accept": "text/event-stream",
    "accept-language": "en-US,en;q=0.9",
    "cache-control": "no-cache",
    "content-type": "application/json",
    "origin": PERPLEXITY_URL,
    "referer": `${PERPLEXITY_URL}/`,
    "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
    "x-perplexity-request-reason": "perplexity-query-state-provider",
    "x-request-id": requestId,
  };

  const perplexityBody = {
    params: {
      attachments: [],
      language: "en-US",
      timezone: "America/New_York",
      search_focus: "internet",
      sources: ["web"],
      search_recency_filter: null,
      frontend_uuid: conversation.frontend_uid,
      model_preference: model,
      is_related_query: false,
      is_sponsored: false,
      visitor_id: conversation.visitor_id,
      prompt_source: "user",
      is_incognito: false,
      time_from_first_type: 0,
      local_search_enabled: false,
      use_schematized_api: true,
      send_back_text_in_streaming_api: false,
      supported_block_use_cases: [
        "answer_modes", "media_items", "knowledge_cards", "diff_blocks"
      ],
      client_coordinates: null,
      mentions: [],
      skip_search_enabled: false,
      version: "2.18",
      frontend_context_uuid: conversation.frontend_context_uuid,
      mode: "concise",
      query_source: "home",
      dsl_query: lastUserMsg,
    },
    query_str: lastUserMsg
  };

  const response = await fetch(`${PERPLEXITY_URL}/rest/sse/perplexity_ask`, {
    method: "POST",
    headers,
    body: JSON.stringify(perplexityBody)
  });

  if (!response.ok) throw new Error(`Perplexity returned ${response.status}`);

  // Parse Perplexity's custom SSE format
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
      const jsonStr = line.slice(6);
      if (jsonStr === "[DONE]") continue;

      try {
        const jsonData = JSON.parse(jsonStr);
        for (const block of jsonData.blocks || []) {
          if (block.intended_usage === "sources_answer_mode") continue;
          if (block.intended_usage === "media_items") continue;

          for (const patch of block.diff_block?.patches || []) {
            if (patch.path === "/progress") continue;
            if (block.diff_block?.field !== "markdown_block") continue;

            let val = patch.value || "";
            val = typeof val === "object" ? val.answer || "" : val;

            if (val && typeof val === "string") {
              if (val.startsWith(fullContent)) {
                val = val.slice(fullContent.length);
              } else if (fullContent.endsWith(val)) {
                val = "";
              }
              if (val) fullContent += val;
            }
          }
        }
      } catch (e) {}
    }
  }

  if (!fullContent) throw new Error("Perplexity returned empty response");

  return new Response(JSON.stringify({
    id: "chatcmpl-pplx-" + Date.now(),
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: model,
    choices: [{ index: 0, message: { role: "assistant", content: fullContent }, finish_reason: "stop" }],
    usage: { prompt_tokens: 0, completion_tokens: Math.ceil(fullContent.length / 4), total_tokens: Math.ceil(fullContent.length / 4) }
  }), { headers: { "Content-Type": "application/json" } });
}


// ═══════════════════════════════════════════════════════════════════════
// 5. PUTER PROVIDER — Free Cloud API (from G4F)
// ═══════════════════════════════════════════════════════════════════════

const PUTER_API_ENDPOINT = "https://api.puter.com/drivers/call";
const PUTER_DEFAULT_MODEL = "google:google/gemini-3-flash-preview";

const PUTER_MODEL_MAP = {
  "puter": "google:google/gemini-3-flash-preview",
  "puter-gemini": "google:google/gemini-3-flash-preview",
  "puter-gpt4o": "gpt-4o",
  "puter-claude": "claude-3-5-sonnet-20241022",
  "puter-deepseek": "deepseek-chat",
};

async function handlePuter(body, env) {
  const model = PUTER_MODEL_MAP[body.model] || body.model || PUTER_DEFAULT_MODEL;
  const messages = body.messages || [];

  // Get Puter API key from env or use default free access
  const apiKey = env?.PUTER_API_KEY || "";

  if (!apiKey) throw new Error("Puter API key not configured. Set PUTER_API_KEY in worker env.");

  const puterRequest = {
    interface: "puter-chat-completion",
    driver: "ai-chat",
    test_mode: false,
    auth_token: apiKey,
    method: "complete",
    args: {
      messages: messages,
      model: model,
      stream: false
    }
  };

  if (body.temperature !== undefined) puterRequest.args.temperature = body.temperature;

  const response = await fetch(PUTER_API_ENDPOINT, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json;charset=UTF-8",
      "Accept": "*/*",
      "Origin": "http://docs.puter.com",
      "Referer": "http://docs.puter.com/",
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    },
    body: JSON.stringify(puterRequest)
  });

  if (!response.ok) throw new Error(`Puter returned ${response.status}`);

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const result = await response.json();
    if (result.error) throw new Error(result.error.message || JSON.stringify(result.error));

    const choice = result.choices?.[0] || result.result || {};
    const message = choice.message || {};
    const content = typeof message.content === "string"
      ? message.content
      : Array.isArray(message.content)
        ? message.content.filter(i => i.type === "text").map(i => i.text).join("")
        : "";

    return new Response(JSON.stringify({
      id: "chatcmpl-puter-" + Date.now(),
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: model,
      choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
      usage: result.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    }), { headers: { "Content-Type": "application/json" } });
  }

  // Handle SSE response (Puter sometimes returns ndjson)
  const text = await response.text();
  let fullContent = "";
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      const data = JSON.parse(line);
      if (data.text) fullContent += data.text;
      if (data.choices?.[0]?.delta?.content) fullContent += data.choices[0].delta.content;
    } catch (e) {}
  }

  return new Response(JSON.stringify({
    id: "chatcmpl-puter-" + Date.now(),
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: model,
    choices: [{ index: 0, message: { role: "assistant", content: fullContent }, finish_reason: "stop" }],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
  }), { headers: { "Content-Type": "application/json" } });
}


// ═══════════════════════════════════════════════════════════════════════
// 6. G4F FALLBACK — Last resort
// ═══════════════════════════════════════════════════════════════════════

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


// ═══════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════

function extractLastUserMessage(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return "";
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (!msg || msg.role !== "user") continue;
    if (typeof msg.content === "string") return msg.content;
    if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === "text" && typeof part.text === "string") return part.text;
      }
    }
    return String(msg.content ?? "");
  }
  return "";
}


// ═══════════════════════════════════════════════════════════════════════
// SMART ROUTER — Provider Selection + Fallback Chain
// ═══════════════════════════════════════════════════════════════════════

function getProviderForModel(model, requestedProvider) {
  // Explicit provider requested
  if (requestedProvider === "pollinations") return "pollinations";
  if (requestedProvider === "ddg" || requestedProvider === "duckduckgo") return "ddg";
  if (requestedProvider === "qwen") return "qwen";
  if (requestedProvider === "perplexity" || requestedProvider === "pplx") return "perplexity";
  if (requestedProvider === "puter") return "puter";
  if (requestedProvider === "g4f") return "g4f";

  // Auto-route by model name
  if (model in POLLINATIONS_MODEL_MAP) return "pollinations";
  if (model in DDG_MODEL_MAP) return "ddg";
  if (model in QWEN_MODEL_MAP || model.startsWith("qwen")) return "qwen";
  if (model in PERPLEXITY_MODEL_MAP || model === "turbo") return "perplexity";
  if (model in PUTER_MODEL_MAP || model.startsWith("puter")) return "puter";
  if (model.startsWith("srv_")) return "g4f";

  // Default fallback
  return "pollinations";
}

// Full fallback chain order
const FALLBACK_CHAIN = ["pollinations", "ddg", "qwen", "perplexity", "g4f"];

async function callProviderWithFallback(body, isStream, requestedProvider, env) {
  const primaryProvider = getProviderForModel(body.model || "openai", requestedProvider);

  // Build ordered provider list: primary first, then remaining from chain
  const providerOrder = [primaryProvider, ...FALLBACK_CHAIN.filter(p => p !== primaryProvider)];
  const fallbackLog = [];

  for (const provider of providerOrder) {
    // Skip unhealthy providers (unless it's the last one)
    if (!isProviderHealthy(provider) && provider !== providerOrder[providerOrder.length - 1]) {
      fallbackLog.push(`${provider}:skipped-unhealthy`);
      continue;
    }

    try {
      let response;
      switch (provider) {
        case "pollinations":
          response = await handlePollinations(body, isStream);
          break;
        case "ddg":
          response = await handleDDG(body);
          break;
        case "qwen":
          response = await handleQwen(body);
          break;
        case "perplexity":
          response = await handlePerplexity(body);
          break;
        case "puter":
          response = await handlePuter(body, env);
          break;
        case "g4f":
          response = await handleG4FFallback(body, isStream);
          break;
        default:
          continue;
      }

      // Check if provider returned an error
      if (response.status === 429 || response.status >= 500) {
        recordFailure(provider);
        fallbackLog.push(`${provider}:${response.status}`);
        console.log(`[Gateway] ${provider} returned ${response.status}, trying next...`);
        continue;
      }

      recordSuccess(provider);

      // Create new response with provider metadata
      const newResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
      newResponse.headers.set("X-Provider", provider);
      newResponse.headers.set("X-Model", body.model || "auto");
      newResponse.headers.set("Access-Control-Allow-Origin", "*");
      if (fallbackLog.length > 0) {
        newResponse.headers.set("X-Fallback-Chain", fallbackLog.join(" → ") + ` → ${provider}:ok`);
      }

      return newResponse;
    } catch (error) {
      recordFailure(provider);
      fallbackLog.push(`${provider}:error(${error.message.slice(0, 50)})`);
      console.log(`[Gateway] ${provider} error:`, error.message, "trying next...");
      continue;
    }
  }

  // All providers failed
  return Response.json({
    error: {
      message: "All providers failed. Chain: " + fallbackLog.join(" → "),
      type: "gateway_all_providers_failed",
      fallback_chain: fallbackLog,
    }
  }, { status: 503 });
}


// ═══════════════════════════════════════════════════════════════════════
// RESPONSE CACHING (Cloudflare Cache API)
// ═══════════════════════════════════════════════════════════════════════

async function getCachedResponse(cacheKey) {
  try {
    const cacheRequest = new Request(`https://inixa-cache.internal/${cacheKey}`);
    return await caches.default.match(cacheRequest);
  } catch (e) {
    return null;
  }
}

async function setCachedResponse(cacheKey, response, ttlSeconds = 300) {
  try {
    if (!response.ok) return;
    const cacheRequest = new Request(`https://inixa-cache.internal/${cacheKey}`);
    const toCache = response.clone();
    toCache.headers.set("Cache-Control", `public, max-age=${ttlSeconds}`);
    toCache.headers.set("X-Cache", "HIT");
    await caches.default.put(cacheRequest, toCache);
  } catch (e) {
    console.error("[Cache] Write error:", e.message);
  }
}


// ═══════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // Health check + provider status
    if (path === "/" || path === "/health") {
      const healthData = {};
      for (const [name, h] of Object.entries(providerHealth)) {
        healthData[name] = {
          success_rate: getSuccessRate(name).toFixed(2),
          total_requests: h.successes + h.failures,
          healthy: isProviderHealthy(name)
        };
      }
      return addCors(Response.json({
        status: "ok",
        service: "INIXA Ultimate AI Gateway v2.0",
        version: "2.0.0",
        providers: ["pollinations", "duckduckgo", "qwen", "perplexity", "puter", "g4f"],
        provider_health: healthData,
        endpoints: ["/v1/chat/completions", "/v1/models"],
        fallback_chain: "pollinations → ddg → qwen → perplexity → g4f"
      }));
    }

    // Models endpoint — aggregate from all providers
    if (path.endsWith("/models")) {
      try {
        const allModels = [];

        // Pollinations models (live fetch)
        try {
          const pollinationsModels = await fetch(POLLINATIONS_MODELS_API);
          const pollinationsData = await pollinationsModels.json();
          if (Array.isArray(pollinationsData)) {
            for (const m of pollinationsData) {
              allModels.push({ id: m.name || m, object: "model", created: 0, owned_by: "pollinations" });
            }
          }
        } catch (e) {}

        // DDG models (static)
        for (const alias of Object.keys(DDG_MODEL_MAP)) {
          allModels.push({ id: "ddg/" + alias, object: "model", created: 0, owned_by: "duckduckgo" });
        }

        // Qwen models (static)
        for (const alias of Object.keys(QWEN_MODEL_MAP)) {
          allModels.push({ id: "qwen/" + alias, object: "model", created: 0, owned_by: "qwen-alibaba" });
        }

        // Perplexity models (static — free tier)
        allModels.push({ id: "perplexity/turbo", object: "model", created: 0, owned_by: "perplexity" });

        // Puter models (static subset)
        for (const alias of Object.keys(PUTER_MODEL_MAP)) {
          allModels.push({ id: alias, object: "model", created: 0, owned_by: "puter" });
        }

        return addCors(Response.json({ object: "list", data: allModels }));
      } catch (e) {
        return addCors(Response.json({ error: e.message }, { status: 500 }));
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // CHAT COMPLETIONS — Smart routing with automatic failover
    // ═══════════════════════════════════════════════════════════════════
    if (path.endsWith("/chat/completions") && request.method === "POST") {
      try {
        const body = await request.json();
        let model = body.model || "openai";
        const isStream = body.stream || false;
        const requestedProvider = body.provider;

        // Handle provider-prefix models (e.g., "ddg/gpt-4o-mini", "qwen/qwen3")
        if (model.startsWith("ddg/")) {
          body.model = model.replace("ddg/", "");
          return addCors(await callProviderWithFallback(body, isStream, "ddg", env));
        }
        if (model.startsWith("qwen/")) {
          body.model = model.replace("qwen/", "");
          return addCors(await callProviderWithFallback(body, isStream, "qwen", env));
        }
        if (model.startsWith("perplexity/") || model.startsWith("pplx/")) {
          body.model = model.replace(/^(perplexity|pplx)\//, "");
          return addCors(await callProviderWithFallback(body, isStream, "perplexity", env));
        }
        if (model.startsWith("puter/")) {
          body.model = model.replace("puter/", "");
          return addCors(await callProviderWithFallback(body, isStream, "puter", env));
        }
        if (model.startsWith("g4f/")) {
          return addCors(await handleG4FFallback(body, isStream));
        }

        // Smart routing with automatic failover
        const response = await callProviderWithFallback(body, isStream, requestedProvider, env);
        return addCors(response);

      } catch (error) {
        return addCors(Response.json({
          error: { message: error.message, type: "gateway_error" }
        }, { status: 500 }));
      }
    }

    // Legacy direct provider endpoints
    if (path === "/pollinations" && request.method === "POST") {
      try {
        const body = await request.json();
        return addCors(await handlePollinations(body, body.stream));
      } catch (e) {
        return addCors(Response.json({ error: e.message }, { status: 500 }));
      }
    }

    if (path === "/ddg" && request.method === "POST") {
      try {
        const body = await request.json();
        return addCors(await handleDDG(body));
      } catch (e) {
        return addCors(Response.json({ error: e.message }, { status: 500 }));
      }
    }

    if (path === "/qwen" && request.method === "POST") {
      try {
        const body = await request.json();
        return addCors(await handleQwen(body));
      } catch (e) {
        return addCors(Response.json({ error: e.message }, { status: 500 }));
      }
    }

    if (path === "/perplexity" && request.method === "POST") {
      try {
        const body = await request.json();
        return addCors(await handlePerplexity(body));
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
