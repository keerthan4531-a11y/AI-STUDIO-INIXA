/**
 * G4F Baidu ERNIE Worker
 *
 * Cloudflare Worker providing OpenAI-compatible chat completions
 * using Baidu's ERNIE 5.1 via chat.baidu.com (no login/cookie required).
 *
 * How it works:
 * 1. Fetches a fresh session (token + lid) from the Baidu HTML page
 * 2. Constructs the chat_token: base64(token|MD5(query)|timestamp|lid)-lid-3
 * 3. Sends the chat request to Baidu's SSE endpoint
 * 4. Parses SSE chunks and returns OpenAI-compatible format
 *
 * Endpoints:
 * - POST /v1/chat/completions
 * - GET /v1/models
 * - GET /health
 */

const BAIDU_BASE = "https://chat.baidu.com";
const BAIDU_CHAT_URL = `${BAIDU_BASE}/aichat/api/conversation`;
const BAIDU_SESSION_URL = `${BAIDU_BASE}/search?enter_type=sidebar_dialog`;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Methods": "GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
  "Access-Control-Expose-Headers": "Content-Type, X-Provider, X-Model"
};

const AVAILABLE_MODELS = [
  { id: "ernie-5.1", name: "ERNIE 5.1", modelName: "ERINE-5.1" },
  { id: "ernie-smart", name: "ERNIE Smart Mode", modelName: "smartMode" }
];

// ─── Session Cache ───────────────────────────────────────────────
let cachedSession = null;
let cachedSessionTime = 0;
const SESSION_TTL = 90 * 1000; // 90 seconds (tokens expire fast)

// ─── MD5 Implementation (pure JS for Cloudflare Workers) ─────────
function md5(string) {
  function md5cycle(x, k) {
    let a = x[0], b = x[1], c = x[2], d = x[3];

    a = ff(a, b, c, d, k[0], 7, -680876936);
    d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819);
    b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897);
    d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341);
    b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416);
    d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063);
    b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682);
    d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290);
    b = ff(b, c, d, a, k[15], 22, 1236535329);

    a = gg(a, b, c, d, k[1], 5, -165796510);
    d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713);
    b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691);
    d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335);
    b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438);
    d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961);
    b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467);
    d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473);
    b = gg(b, c, d, a, k[12], 20, -1926607734);

    a = hh(a, b, c, d, k[5], 4, -378558);
    d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562);
    b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060);
    d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632);
    b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174);
    d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979);
    b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487);
    d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16, 530742520);
    b = hh(b, c, d, a, k[2], 23, -995338651);

    a = ii(a, b, c, d, k[0], 6, -198630844);
    d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905);
    b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571);
    d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523);
    b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359);
    d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380);
    b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070);
    d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15, 718787259);
    b = ii(b, c, d, a, k[9], 21, -343485551);

    x[0] = add32(a, x[0]);
    x[1] = add32(b, x[1]);
    x[2] = add32(c, x[2]);
    x[3] = add32(d, x[3]);
  }

  function cmn(q, a, b, x, s, t) {
    a = add32(add32(a, q), add32(x, t));
    return add32((a << s) | (a >>> (32 - s)), b);
  }

  function ff(a, b, c, d, x, s, t) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
  function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
  function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
  function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | (~d)), a, b, x, s, t); }

  function md5blk(s) {
    const md5blks = [];
    for (let i = 0; i < 64; i += 4) {
      md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) +
        (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
    }
    return md5blks;
  }

  function add32(a, b) {
    return (a + b) & 0xFFFFFFFF;
  }

  function rhex(n) {
    const hexChr = '0123456789abcdef';
    let s = '';
    for (let j = 0; j < 4; j++) {
      s += hexChr.charAt((n >> (j * 8 + 4)) & 0x0F) + hexChr.charAt((n >> (j * 8)) & 0x0F);
    }
    return s;
  }

  function hex(x) {
    return x.map(rhex).join('');
  }

  function md5str(s) {
    // Convert to UTF-8
    const txt = unescape(encodeURIComponent(s));
    const n = txt.length;
    const state = [1732584193, -271733879, -1732584194, 271733878];
    let i;
    for (i = 64; i <= n; i += 64) {
      md5cycle(state, md5blk(txt.substring(i - 64, i)));
    }
    let tail = txt.substring(i - 64);
    const tailLen = tail.length;
    const tailArr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (i = 0; i < tailLen; i++) {
      tailArr[i >> 2] |= tail.charCodeAt(i) << ((i % 4) << 3);
    }
    tailArr[i >> 2] |= 0x80 << ((i % 4) << 3);
    if (i > 55) {
      md5cycle(state, tailArr);
      for (i = 0; i < 16; i++) tailArr[i] = 0;
    }
    tailArr[14] = n * 8;
    md5cycle(state, tailArr);
    return hex(state);
  }

  return md5str(string);
}

// ─── Session Fetcher ─────────────────────────────────────────────
async function fetchSession() {
  const now = Date.now();
  if (cachedSession && (now - cachedSessionTime) < SESSION_TTL) {
    return cachedSession;
  }

  console.log("[BaiduWorker] Fetching fresh session from Baidu HTML...");

  const response = await fetch(BAIDU_SESSION_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Baidu session page: ${response.status}`);
  }

  const html = await response.text();
  const match = html.match(/<script\s+type="application\/json"\s+name="aiTabFrameBaseData">(.*?)<\/script>/s);
  if (!match) {
    throw new Error("Failed to find aiTabFrameBaseData in Baidu HTML");
  }

  const data = JSON.parse(match[1]);
  if (!data.token || !data.lid) {
    throw new Error("Missing token or lid in aiTabFrameBaseData");
  }

  // Extract cookies from response headers
  const setCookies = response.headers.getAll?.("set-cookie") || [];
  let cookieStr = "";
  for (const sc of setCookies) {
    const pair = sc.split(";")[0].trim();
    if (pair) cookieStr += (cookieStr ? "; " : "") + pair;
  }
  // Also try the raw header
  if (!cookieStr) {
    const rawCookie = response.headers.get("set-cookie");
    if (rawCookie) {
      const parts = rawCookie.split(/,(?=[^;]*=)/);
      for (const part of parts) {
        const pair = part.split(";")[0].trim();
        if (pair) cookieStr += (cookieStr ? "; " : "") + pair;
      }
    }
  }

  cachedSession = {
    token: data.token,
    lid: data.lid,
    cookies: cookieStr,
    chatParams: data.chatParams || {},
    usableModel: data.usableModel || []
  };
  cachedSessionTime = now;

  console.log(`[BaiduWorker] Got session: token=${data.token}, lid=${data.lid}`);
  return cachedSession;
}

// ─── Chat Token Builder ─────────────────────────────────────────
function buildChatToken(token, query, lid) {
  const timestamp = Date.now();
  const queryHash = md5(query);
  const raw = `${token}|${queryHash}|${timestamp}|${lid}`;
  const b64 = btoa(raw);
  return `${b64}-${lid}-3`;
}

// ─── Request Builder ─────────────────────────────────────────────
function buildBaiduRequest(query, session, modelName) {
  const chatToken = buildChatToken(session.token, query, session.lid);

  const body = {
    message: {
      inputMethod: "chat_search",
      isRebuild: false,
      content: {
        query: "",
        agentInfo: {
          agent_id: [""],
          params: '{"agt_rk":1,"agt_sess_cnt":1}'
        },
        agentInfoList: [],
        qtype: 0
      },
      searchInfo: {
        srcid: "",
        order: "",
        tplname: "",
        dqaKey: "",
        re_rank: "1",
        ori_lid: "",
        sa: "bkb",
        enter_type: "sidebar_dialog",
        chatParams: {
          setype: "csaitab",
          chat_samples: "WISE_NEW_CSAITAB",
          chat_token: chatToken,
          scene: ""
        },
        isPrivateChat: false,
        usedModel: {
          modelName: modelName,
          modelFunction: {
            deepSearch: "0",
            thinkMode: "0"
          }
        },
        landingPageSwitch: "",
        landingPage: "aitab",
        ecomFrom: "",
        hasLocPermission: "",
        isInnovate: 2,
        applid: "",
        a_lid: "",
        showMindMap: false,
        deepDecisionInfo: {
          isDeepDecision: 0
        }
      },
      from: "",
      source: "pc_csaitab",
      query: [
        {
          type: "TEXT",
          data: {
            text: {
              query: query,
              extData: "{}",
              text_type: ""
            }
          }
        }
      ],
      anti_ext: {
        inputT: null,
        ck1: Math.floor(Math.random() * 30000) + 1000,
        ck9: Math.floor(Math.random() * 2000) + 500,
        ck10: Math.floor(Math.random() * 2000) + 500
      }
    },
    setype: "csaitab",
    rank: 1
  };

  const encodedQuery = encodeURIComponent(query);
  const antiExtStr = encodeURIComponent(JSON.stringify(body.message.anti_ext));
  const xChatMessage = `query:${encodedQuery},anti_ext:${antiExtStr},enter_type:sidebar_dialog,re_rank:1,modelName:${modelName},sa:bkb`;

  const headers = {
    "Accept": "text/event-stream",
    "Accept-Language": "en-US,en;q=0.9",
    "Content-Type": "application/json",
    "isdeepseek": "1",
    "landingpageswitch": "",
    "personifiedswitch": "0",
    "source": "pc_csaitab",
    "x-chat-message": xChatMessage,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0",
    "Referer": "https://chat.baidu.com/search?enter_type=sidebar_dialog&internal=1",
    "Origin": "https://chat.baidu.com",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin"
  };

  if (session.cookies) {
    headers["Cookie"] = session.cookies;
  }

  return { body, headers };
}

// ─── SSE Parser ──────────────────────────────────────────────────
function parseBaiduSSE(line) {
  const trimmed = line.trim();
  if (!trimmed || !trimmed.startsWith("data:")) return null;

  const dataStr = trimmed.slice(5).trim();
  if (!dataStr) return null;

  try {
    return JSON.parse(dataStr);
  } catch (e) {
    return null;
  }
}

function extractTextFromBaiduEvent(data) {
  if (!data || !data.data?.message) return { text: "", isFinished: false, isError: false };

  const msg = data.data.message;
  const meta = msg.metaData || {};
  const content = msg.content || {};

  // Check for error in hints
  if (content.hints?.parts?.[0]?.type === "tokenFail") {
    return {
      text: "",
      isFinished: true,
      isError: true,
      errorText: content.hints.parts[0].text || "Token validation failed"
    };
  }

  // Extract generated text
  // Baidu sends text in generator.data.value for "markdown-yiyan" component chunks
  let text = "";
  const gen = content.generator;
  if (gen) {
    // Primary: streamed markdown content in data.value (component: "markdown-yiyan")
    if (gen.data?.value !== undefined && gen.data?.value !== null) {
      text = gen.data.value;
    }
    // Fallback: direct text field (older format or some edge cases)
    else if (gen.text) {
      text = gen.text;
    }
  }
  
  // Also check hints for text content
  if (!text && content.hints?.parts) {
    for (const part of content.hints.parts) {
      if (part.text && part.type !== "tokenFail") {
        text += part.text;
      }
    }
  }

  const isFinished = meta.endTurn === true || (gen?.isFinished === true && !gen?.component);
  const state = meta.state || "";

  return { text, isFinished, state, isError: false };
}

// ─── Model Resolution ────────────────────────────────────────────
function resolveModelName(model) {
  if (!model) return "ERINE-5.1";
  const lower = model.toLowerCase();
  if (lower.includes("smart")) return "smartMode";
  if (lower.includes("ernie") || lower.includes("erine")) return "ERINE-5.1";
  return "ERINE-5.1";
}

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

// ─── Handlers ────────────────────────────────────────────────────
function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
  });
}

async function handleModels() {
  return jsonResponse({
    object: "list",
    data: AVAILABLE_MODELS.map(m => ({
      id: m.id,
      object: "model",
      created: 1700000000,
      owned_by: "baidu",
      name: m.name,
      provider: "baidu"
    }))
  });
}

async function handleChatCompletions(request, retryCount = 0) {
  if (request.method !== "POST") {
    return jsonResponse({ error: { message: "Method not allowed" } }, 405);
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return jsonResponse({ error: { message: "Invalid JSON body" } }, 400);
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const query = extractLastUserMessage(messages);
  if (!query) {
    return jsonResponse({ error: { message: "No user message found" } }, 400);
  }

  const model = body.model || "ernie-5.1";
  const stream = Boolean(body.stream);
  const modelName = resolveModelName(model);

  // Fetch fresh session (force refresh on retry)
  if (retryCount > 0) {
    cachedSession = null;
    cachedSessionTime = 0;
  }
  
  let session;
  try {
    session = await fetchSession();
  } catch (e) {
    console.error("[BaiduWorker] Session fetch error:", e);
    return jsonResponse({ error: { message: `Session error: ${e.message}` } }, 502);
  }

  // Build and send request
  const { body: reqBody, headers: reqHeaders } = buildBaiduRequest(query, session, modelName);

  let baiduResponse;
  try {
    baiduResponse = await fetch(BAIDU_CHAT_URL, {
      method: "POST",
      headers: reqHeaders,
      body: JSON.stringify(reqBody)
    });
  } catch (e) {
    console.error("[BaiduWorker] Fetch error:", e);
    cachedSession = null;
    cachedSessionTime = 0;
    return jsonResponse({ error: { message: `Connection error: ${e.message}` } }, 502);
  }

  if (!baiduResponse.ok) {
    const text = await baiduResponse.text();
    return jsonResponse({
      error: { message: `Baidu API error: ${baiduResponse.status}`, details: text }
    }, 502);
  }

  const streamId = `chatcmpl-baidu-${crypto.randomUUID().substring(0, 8)}`;
  const created = Math.floor(Date.now() / 1000);

  if (stream) {
    return handleStreamResponse(baiduResponse, streamId, created, model, query, retryCount);
  }

  return handleNonStreamResponse(baiduResponse, streamId, created, model, query, retryCount);
}

// ─── Stream Response ─────────────────────────────────────────────
function handleStreamResponse(baiduResponse, streamId, created, model, query, retryCount) {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  (async () => {
    const reader = baiduResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let sentRole = false;
    let gotTokenFail = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          const lines = part.split("\n");
          for (const line of lines) {
            const data = parseBaiduSSE(line);
            if (!data) continue;

            const extracted = extractTextFromBaiduEvent(data);

            if (extracted.isError) {
              gotTokenFail = true;
              // Invalidate session so next request gets a fresh one
              cachedSession = null;
              cachedSessionTime = 0;
              // Send error as content
              const errorChunk = {
                id: streamId,
                object: "chat.completion.chunk",
                created,
                model,
                choices: [{
                  index: 0,
                  delta: { content: `[Error: ${extracted.errorText}. Retrying with fresh token...]` },
                  finish_reason: "stop"
                }]
              };
              await writer.write(encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`));
              await writer.write(encoder.encode("data: [DONE]\n\n"));
              await writer.close();
              return;
            }

            if (extracted.text) {
              const delta = {};
              if (!sentRole) {
                delta.role = "assistant";
                sentRole = true;
              }
              delta.content = extracted.text;

              const chunk = {
                id: streamId,
                object: "chat.completion.chunk",
                created,
                model,
                choices: [{
                  index: 0,
                  delta,
                  finish_reason: null
                }]
              };
              await writer.write(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
            }

            if (extracted.isFinished && !gotTokenFail) {
              const doneChunk = {
                id: streamId,
                object: "chat.completion.chunk",
                created,
                model,
                choices: [{
                  index: 0,
                  delta: {},
                  finish_reason: "stop"
                }]
              };
              await writer.write(encoder.encode(`data: ${JSON.stringify(doneChunk)}\n\n`));
              await writer.write(encoder.encode("data: [DONE]\n\n"));
              await writer.close();
              return;
            }
          }
        }
      }

      // If we get here without sending DONE, send it now
      await writer.write(encoder.encode("data: [DONE]\n\n"));
    } catch (e) {
      console.error("[BaiduWorker] Stream error:", e);
    } finally {
      try { await writer.close(); } catch (_) {}
    }
  })();

  return new Response(readable, {
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Provider": "baidu",
      "X-Model": model
    }
  });
}

// ─── Non-Stream Response ─────────────────────────────────────────
async function handleNonStreamResponse(baiduResponse, streamId, created, model, query, retryCount) {
  const reader = baiduResponse.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";
  let gotError = false;
  let errorText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";

    for (const part of parts) {
      const lines = part.split("\n");
      for (const line of lines) {
        const data = parseBaiduSSE(line);
        if (!data) continue;

        const extracted = extractTextFromBaiduEvent(data);
        if (extracted.isError) {
          gotError = true;
          errorText = extracted.errorText;
          cachedSession = null;
          cachedSessionTime = 0;
        }
        if (extracted.text) {
          fullText += extracted.text;
        }
      }
    }
  }

  if (gotError && !fullText) {
    return jsonResponse({
      error: { message: `Baidu token error: ${errorText}. Please retry.` }
    }, 502);
  }

  return jsonResponse({
    id: streamId,
    object: "chat.completion",
    created,
    model,
    choices: [{
      index: 0,
      message: {
        role: "assistant",
        content: fullText
      },
      finish_reason: "stop"
    }],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0
    }
  });
}

// ─── Worker Export ────────────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      if (pathname.endsWith("/models")) {
        return handleModels();
      }

      if (pathname.endsWith("/chat/completions")) {
        return handleChatCompletions(request);
      }

      if (pathname === "/debug" || pathname === "/ernie/debug") {
        const debugBody = await request.json().catch(() => ({ query: "hi" }));
        const debugQuery = debugBody.query || "hi";
        
        // Force fresh session
        cachedSession = null;
        cachedSessionTime = 0;
        
        const session = await fetchSession();
        const chatToken = buildChatToken(session.token, debugQuery, session.lid);
        const { body: reqBody, headers: reqHeaders } = buildBaiduRequest(debugQuery, session, "ERINE-5.1");
        
        const baiduRes = await fetch(BAIDU_CHAT_URL, {
          method: "POST",
          headers: reqHeaders,
          body: JSON.stringify(reqBody)
        });
        
        const rawText = await baiduRes.text();
        
        return jsonResponse({
          session: { token: session.token, lid: session.lid, cookies: session.cookies ? "present" : "none" },
          chatToken,
          baiduStatus: baiduRes.status,
          rawResponse: rawText,
          md5check: md5(debugQuery)
        });
      }

      if (pathname === "/health" || pathname === "/ernie/health") {
        return jsonResponse({ status: "ok", service: "baidu-ernie-worker" });
      }

      if (pathname === "/" || pathname === "/ernie" || pathname === "/ernie/") {
        return jsonResponse({
          service: "G4F Baidu ERNIE Worker",
          version: "1.0.0",
          description: "Cloudflare Worker for Baidu ERNIE 5.1 — no login required",
          endpoints: {
            chat: "/v1/chat/completions",
            models: "/v1/models",
            health: "/health"
          }
        });
      }

      return jsonResponse({ error: "Not found" }, 404);
    } catch (error) {
      console.error("[BaiduWorker] Error:", error);
      return jsonResponse({ error: { message: error.message || "Internal server error" } }, 500);
    }
  }
};
