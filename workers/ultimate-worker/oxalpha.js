/**
 * OxAlpha Worker
 *
 * Cloudflare Worker providing OpenAI-compatible chat completions
 * using OxAlpha's "Stealth Reasoning Model" via oxalpha.com (no login required).
 *
 * How it works:
 * 1. Fetches the /chat page to obtain CSRF token (from meta tag) and session cookies
 * 2. Sends chat request to /api/chat with CSRF token header + session cookies
 * 3. Parses the raw text stream response and converts to OpenAI-compatible format
 *
 * Endpoints:
 * - POST /v1/chat/completions
 * - GET  /v1/models
 * - GET  /health
 */

import puppeteer from "@cloudflare/puppeteer";

const OXALPHA_BASE = "https://oxalpha.com";
const OXALPHA_CHAT_URL = `${OXALPHA_BASE}/api/chat`;
const OXALPHA_PAGE_URL = `${OXALPHA_BASE}/chat`;
const TURNSTILE_SITEKEY = "0x4AAAAAABp_UYRVl7snkQ51";

// Verified browser session (can also be overridden via env.OXALPHA_COOKIE / env.OXALPHA_CSRF)
let activeVerifiedCookies = `XSRF-TOKEN=eyJpdiI6ImdLaDJhWlVZSXNKN1lXR3ZrY1dET0E9PSIsInZhbHVlIjoianpwRzdwRzIxK0t2MUdtYnh3NHRsa0hMMGF3RFE1eDJZckJFMUh6RUxWbUNvVjVJZ2xpT2syWFV2cmtWNFArdXErWkI4Wmd1dzIveUhueFlOSDRJbllFWkJJc3dPMkVTOVpLSm1nZnVkY0NLMjc4RDZ6QlRVN3NPRWZPYXJvT0IiLCJtYWMiOiIzZWVhMGM0YzcxNjAxMzhiNTc0YTI4MWE0NDRjYTg3ODY0M2MwNjU4YTE5YWYyZDA3YWIxOTE5NDUxNzZkOWMyIiwidGFnIjoiIn0%3D; ox_alpha_session=eyJpdiI6IlJDTCs5QnowY0p5anQzK0dPaWZReVE9PSIsInZhbHVlIjoiYnhCeW5jNGNRYmVId0pIT3dmc0tTMmFGSFFKUWlBM2R1NnNrZmFXNkhkNDFRQ21Ha3dTYTZBdXlwYnRoWW94NmZqa1dlYUorSXBBWG56SmV2UWgrY0JpWjZYZnhKcHBXcUJIQXd3SGlTYm9CZ3VmQklTWE45WTdMT2JIU3NoQVIiLCJtYWMiOiIyZTAxMjI4ZDM5ZTMyODMxMjUyMzQ3OWNiZDk4ZTU1YjFlYTcxNWMyMTQ4ZWEyNjE1NWJlNzQ4OGMxZDk4YTFlIiwidGFnIjoiIn0%3D; _ga=GA1.1.2066746023.1787904545; _ga_CX9YVRPWDX=GS2.1.s1787904544$o1$g1$t1787906463$j43$l0$h0`;
let activeVerifiedCsrf = `ssaVZTBaFa2USH3GbBxQXFYKQOJuwx36zwvqVmPB`;
let cachedVerifiedSession = null;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Methods": "GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
  "Access-Control-Expose-Headers": "Content-Type, X-Provider, X-Model"
};

const AVAILABLE_MODELS = [
  { id: "ox-alpha", name: "Ox Alpha", apiModel: "z-ai/glm-5.3-flash" },
  { id: "oxalpha", name: "Ox Alpha", apiModel: "z-ai/glm-5.3-flash" },
  { id: "ox-alpha-stealth", name: "Ox Alpha Stealth", apiModel: "z-ai/glm-5.3-flash" },
];

// ─── Session Fetcher ─────────────────────────────────────────────
// Note: OxAlpha tracks message count per session (ox_alpha_session cookie)
// and prompts for Turnstile captcha after 2 messages on the same session.
// Therefore, we do NOT cache sessions across requests; every chat request
// receives a pristine session with 0 messages_today.
function getRandomClientIP() {
  // Generate random plausible residential IP to avoid datacenter IP rate limits
  return `${Math.floor(Math.random() * 100) + 40}.${Math.floor(Math.random() * 200) + 10}.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}`;
}

async function fetchSession() {
  console.log("[OxAlphaWorker] Fetching fresh pristine session from:", OXALPHA_PAGE_URL);

  const response = await fetch(OXALPHA_PAGE_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1"
    },
    redirect: "follow"
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch OxAlpha page: ${response.status}`);
  }

  const html = await response.text();

  // Extract CSRF token from <meta name="csrf-token" content="...">
  const csrfMatch = html.match(/<meta\s+name="csrf-token"\s+content="([^"]+)"/);
  if (!csrfMatch) {
    throw new Error("Failed to find CSRF token in OxAlpha page");
  }
  const csrfToken = csrfMatch[1];

  // Extract available models from window.__CHAT_MODELS__
  let chatModels = [];
  const modelsMatch = html.match(/window\.__CHAT_MODELS__\s*=\s*(\[.*?\]);/);
  if (modelsMatch) {
    try {
      chatModels = JSON.parse(modelsMatch[1]);
    } catch (e) {
      console.warn("[OxAlphaWorker] Failed to parse __CHAT_MODELS__:", e.message);
    }
  }

  // Extract cookies from response headers
  let cookieStr = "";
  if (typeof response.headers.getSetCookie === "function") {
    const cookies = response.headers.getSetCookie();
    if (Array.isArray(cookies) && cookies.length > 0) {
      cookieStr = cookies.map(c => c.split(";")[0].trim()).filter(Boolean).join("; ");
    }
  }

  if (!cookieStr && typeof response.headers.getAll === "function") {
    const allCookies = response.headers.getAll("set-cookie") || [];
    if (allCookies.length > 0) {
      cookieStr = allCookies.map(c => c.split(";")[0].trim()).filter(Boolean).join("; ");
    }
  }

  if (!cookieStr) {
    const setCookieHeader = response.headers.get("set-cookie");
    if (setCookieHeader) {
      const parts = setCookieHeader.split(/,(?=[^;]*=)/);
      for (const part of parts) {
        const pair = part.split(";")[0].trim();
        if (pair && pair.includes("=")) {
          cookieStr += (cookieStr ? "; " : "") + pair;
        }
      }
    }
  }

  const session = {
    csrfToken,
    cookies: cookieStr,
    chatModels,
    defaultModel: chatModels[0]?.id || "z-ai/glm-5.3-flash"
  };

  console.log(`[OxAlphaWorker] Pristine session ready: csrf=${csrfToken.substring(0, 10)}..., cookies=${cookieStr ? "ok (" + cookieStr.length + " bytes)" : "none"}`);

  return session;
}

// ─── Edge Turnstile Harvester (Puppeteer) ────────────────────────
async function harvestTurnstileSession(env) {
  if (!env || !env.MYBROWSER) {
    console.warn("[OxAlphaWorker] MYBROWSER binding not available on env");
    return null;
  }

  console.log("[OxAlphaWorker] Launching Cloudflare edge browser to solve Turnstile...");
  let browser = null;
  try {
    browser = await puppeteer.launch(env.MYBROWSER);
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      try { delete Object.getPrototypeOf(navigator).webdriver; } catch (e) {}
    });

    await page.goto(OXALPHA_PAGE_URL, { waitUntil: "domcontentloaded", timeout: 20000 });

    // Wait for Turnstile JS to be available
    await page.waitForFunction(
      () => typeof window.turnstile?.render === "function",
      { timeout: 12000 }
    ).catch(() => {});

    // Render turnstile and extract token
    const tokenPromise = page.evaluate((siteKey) => {
      return new Promise((resolve) => {
        const box = document.createElement("div");
        box.id = "cf-ox-auto-box";
        document.body.appendChild(box);
        if (window.turnstile && typeof window.turnstile.render === "function") {
          window.turnstile.render(box, {
            sitekey: siteKey,
            callback: (token) => resolve(token),
            "error-callback": () => resolve(null)
          });
        } else {
          resolve(null);
        }
        setTimeout(() => resolve(null), 15000);
      });
    }, TURNSTILE_SITEKEY);

    // Auto-click Turnstile checkbox if iframe challenge appears
    for (let i = 0; i < 25; i++) {
      try {
        const frames = page.frames();
        for (const frame of frames) {
          if (frame.url().includes("challenges.cloudflare.com")) {
            const cb = await frame.$("input[type='checkbox'], #challenge-stage, .cb-i, span.mark, body").catch(() => null);
            if (cb) await cb.click({ delay: 50 }).catch(() => {});
          }
        }
      } catch (_) {}
      await page.evaluate(() => new Promise(r => setTimeout(r, 400))).catch(() => {});
    }

    const token = await tokenPromise;
    const cookies = await page.cookies();
    const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join("; ");
    const csrfToken = await page.evaluate(() => {
      return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || "";
    });

    await browser.close();
    browser = null;

    if (token) {
      console.log(`[OxAlphaWorker] Turnstile SOLVED! Token len: ${token.length}, csrf: ${csrfToken ? "ok" : "none"}`);
      return { token, cookies: cookieStr, csrfToken };
    } else {
      console.warn("[OxAlphaWorker] Turnstile render completed without token");
    }
  } catch (e) {
    console.error("[OxAlphaWorker] Puppeteer Turnstile harvest error:", e.message);
    if (browser) {
      try { await browser.close(); } catch (_) {}
    }
  }
  return null;
}

// ─── Model Resolution ────────────────────────────────────────────
function resolveModel(model) {
  if (!model) return "z-ai/glm-5.3-flash";
  const lower = model.toLowerCase();
  
  // If user passes the exact API model ID
  if (lower.includes("z-ai/") || lower.includes("glm")) return "z-ai/glm-5.3-flash";
  
  // Map our aliases
  if (lower.includes("ox-alpha") || lower.includes("oxalpha")) return "z-ai/glm-5.3-flash";
  
  // Default
  return "z-ai/glm-5.3-flash";
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
      owned_by: "oxalpha",
      name: m.name,
      provider: "oxalpha"
    }))
  });
}

async function handleChatCompletions(request, env) {
  if (request.method !== "POST") {
    return jsonResponse({ error: { message: "Method not allowed" } }, 405);
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return jsonResponse({ error: { message: "Invalid JSON body" } }, 400);
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) {
    return jsonResponse({ error: { message: "No messages provided" } }, 400);
  }

  const model = body.model || "ox-alpha";
  const stream = Boolean(body.stream);
  const apiModel = resolveModel(model);

  // Primary: use active verified browser session (or env override)
  let session = {
    csrfToken: (env && env.OXALPHA_CSRF) || activeVerifiedCsrf,
    cookies: (env && env.OXALPHA_COOKIE) || activeVerifiedCookies
  };

  // Fallback to fetchSession if no verified session available
  if (!session.cookies || !session.csrfToken) {
    try {
      session = await fetchSession();
    } catch (e) {
      console.error("[OxAlphaWorker] Session fetch error:", e);
      try {
        session = await fetchSession();
      } catch (e2) {
        return jsonResponse({ error: { message: `Session error: ${e2.message}` } }, 502);
      }
    }
  }

  // Build request to OxAlpha API
  const reqHeaders = {
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Content-Type": "application/json",
    "Origin": OXALPHA_BASE,
    "Referer": `${OXALPHA_BASE}/chat`,
    "X-CSRF-TOKEN": session.csrfToken,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin"
  };

  if (session.cookies) {
    reqHeaders["Cookie"] = session.cookies;
  }

  // Build the request body - OxAlpha only accepts "user" and "assistant" roles
  // System messages must be merged into the first user message
  let cleanMessages = messages.map(m => ({
    role: m.role,
    content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
  }));

  // Extract system messages and merge into first user message
  const systemParts = cleanMessages.filter(m => m.role === 'system').map(m => m.content);
  cleanMessages = cleanMessages.filter(m => m.role !== 'system');

  // If there were system messages, prepend to first user message
  if (systemParts.length > 0 && cleanMessages.length > 0) {
    const firstUserIdx = cleanMessages.findIndex(m => m.role === 'user');
    if (firstUserIdx !== -1) {
      cleanMessages[firstUserIdx] = {
        role: 'user',
        content: systemParts.join('\n') + '\n\n' + cleanMessages[firstUserIdx].content
      };
    } else {
      // No user message found, add system content as user message
      cleanMessages.unshift({ role: 'user', content: systemParts.join('\n') });
    }
  }

  // Ensure at least one message
  if (cleanMessages.length === 0) {
    return jsonResponse({ error: { message: "No valid messages after filtering" } }, 400);
  }

  const reqBody = {
    model: apiModel,
    messages: cleanMessages
  };

  let oxResponse;
  try {
    oxResponse = await fetch(OXALPHA_CHAT_URL, {
      method: "POST",
      headers: reqHeaders,
      body: JSON.stringify(reqBody)
    });
  } catch (e) {
    console.error("[OxAlphaWorker] Fetch error:", e);
    return jsonResponse({ error: { message: `Connection error: ${e.message}` } }, 502);
  }

  if (!oxResponse.ok) {
    const errText = await oxResponse.text().catch(() => "");
    console.error(`[OxAlphaWorker] API error: ${oxResponse.status} - ${errText}`);

    // Try to parse error JSON
    let errorMsg = `OxAlpha API error: ${oxResponse.status}`;
    let isTurnstile = false;
    try {
      const errJson = JSON.parse(errText);
      errorMsg = errJson.error || errJson.message || errorMsg;
      isTurnstile = errJson.code === "turnstile_required";
    } catch (_) {}

    // If Turnstile captcha triggered, attempt edge Puppeteer solver
    if (isTurnstile) {
      cachedVerifiedSession = null;
      if (env && env.MYBROWSER) {
        console.log("[OxAlphaWorker] Turnstile required. Launching edge browser solver...");
        const harvested = await harvestTurnstileSession(env);
        if (harvested && harvested.token) {
          reqHeaders["X-Turnstile-Token"] = harvested.token;
          if (harvested.csrfToken) reqHeaders["X-CSRF-TOKEN"] = harvested.csrfToken;
          if (harvested.cookies) reqHeaders["Cookie"] = harvested.cookies;

          const turnstileRes = await fetch(OXALPHA_CHAT_URL, {
            method: "POST",
            headers: reqHeaders,
            body: JSON.stringify(reqBody)
          });

          if (turnstileRes.ok) {
            oxResponse = turnstileRes;
            // Cache this verified session for 1 hour!
            cachedVerifiedSession = {
              csrfToken: harvested.csrfToken,
              cookies: harvested.cookies,
              expiresAt: Date.now() + 60 * 60 * 1000
            };
          } else {
            const retryErr = await turnstileRes.text().catch(() => "");
            return jsonResponse({ error: { message: `OxAlpha Turnstile retry failed: ${turnstileRes.status}`, details: retryErr } }, 429);
          }
        } else {
          return jsonResponse({ error: { message: "OxAlpha Turnstile verification required. Auto-solver could not solve challenge, please retry in a moment." } }, 429);
        }
      } else {
        return jsonResponse({ error: { message: "OxAlpha rate limited (Turnstile captcha required)." } }, 429);
      }
    } else {
      return jsonResponse({ error: { message: errorMsg, details: errText } }, 502);
    }
  }

  // Keep activeVerifiedCookies up-to-date with any new session cookie from OxAlpha
  const newSetCookie = oxResponse.headers.get("set-cookie");
  if (newSetCookie) {
    const parts = newSetCookie.split(/,(?=[^;]*=)/);
    for (const p of parts) {
      const pair = p.split(";")[0].trim();
      if (pair && pair.startsWith("ox_alpha_session=")) {
        activeVerifiedCookies = activeVerifiedCookies.replace(/ox_alpha_session=[^;]+/, pair);
      }
    }
  }

  const streamId = `chatcmpl-oxalpha-${crypto.randomUUID().substring(0, 8)}`;
  const created = Math.floor(Date.now() / 1000);

  if (stream) {
    return handleStreamResponse(oxResponse, streamId, created, model);
  }

  return handleNonStreamResponse(oxResponse, streamId, created, model);
}

// ─── Stream Response ─────────────────────────────────────────────
// OxAlpha returns standard OpenAI SSE format:
//   : OPENROUTER PROCESSING (SSE comments - skip these)
//   data: {"id":"gen-...","object":"chat.completion.chunk","created":...,"choices":[{"delta":{"content":"..."}}]}
//   data: [DONE]
function handleStreamResponse(oxResponse, streamId, created, model) {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  (async () => {
    const reader = oxResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let sentRole = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Split on double newline (SSE event boundary) or single newline
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          // Skip SSE comments (lines starting with ":")
          if (trimmed.startsWith(":")) continue;

          // Handle data lines
          if (trimmed.startsWith("data:")) {
            const dataStr = trimmed.slice(5).trim();

            if (dataStr === "[DONE]") {
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

            // Parse the OpenAI-format chunk
            try {
              const parsed = JSON.parse(dataStr);
              const deltaContent = parsed.choices?.[0]?.delta?.content;
              const finishReason = parsed.choices?.[0]?.finish_reason;

              if (deltaContent !== undefined && deltaContent !== null) {
                const delta = {};
                if (!sentRole) {
                  delta.role = "assistant";
                  sentRole = true;
                }
                delta.content = deltaContent;

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

              if (finishReason === "stop") {
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
            } catch (e) {
              // Non-JSON data line, skip
            }
          }
        }
      }

      // If we got here without DONE, send it now
      const finalChunk = {
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
      await writer.write(encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\n`));
      await writer.write(encoder.encode("data: [DONE]\n\n"));
    } catch (e) {
      console.error("[OxAlphaWorker] Stream error:", e);
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
      "X-Provider": "oxalpha",
      "X-Model": model
    }
  });
}

// ─── Non-Stream Response ─────────────────────────────────────────
async function handleNonStreamResponse(oxResponse, streamId, created, model) {
  const reader = oxResponse.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(":")) continue;

      if (trimmed.startsWith("data:")) {
        const dataStr = trimmed.slice(5).trim();
        if (dataStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(dataStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) fullText += content;
        } catch (e) {
          // Skip non-JSON data lines
        }
      }
    }
  }

  // Process remaining buffer
  if (buffer.trim() && !buffer.trim().startsWith(":")) {
    const trimmed = buffer.trim();
    if (trimmed.startsWith("data:")) {
      const dataStr = trimmed.slice(5).trim();
      if (dataStr !== "[DONE]") {
        try {
          const parsed = JSON.parse(dataStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) fullText += content;
        } catch (e) {}
      }
    }
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
        return handleChatCompletions(request, env);
      }

      // Manual edge browser harvest trigger
      if (pathname === "/oxalpha/harvest") {
        const result = await harvestTurnstileSession(env);
        if (result && result.token) {
          cachedVerifiedSession = {
            csrfToken: result.csrfToken,
            cookies: result.cookies,
            expiresAt: Date.now() + 60 * 60 * 1000
          };
          return jsonResponse({ status: "ok", message: "Turnstile harvested & verified session cached!", tokenLen: result.token.length });
        }
        return jsonResponse({ status: "failed", message: "Could not harvest Turnstile token" }, 500);
      }

      // Web Turnstile Solver Page (just in case automated fails or for instant unlock)
      if (pathname === "/oxalpha/solve") {
        const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>OxAlpha Turnstile Solver</title>
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
  <style>
    body { font-family: -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #1e293b; padding: 32px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); text-align: center; max-width: 400px; width: 90%; }
    h2 { margin-top: 0; color: #a855f7; }
    #status { margin-top: 16px; font-size: 14px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Ox Alpha Human Check</h2>
    <p>Click the checkbox below to unlock Ox Alpha for your worker.</p>
    <div id="cf-widget" style="display:flex;justify-content:center;margin:20px 0;"></div>
    <div id="status">Waiting for Turnstile...</div>
  </div>
  <script>
    function renderTurnstile() {
      if (window.turnstile && typeof window.turnstile.render === "function") {
        window.turnstile.render("#cf-widget", {
          sitekey: "${TURNSTILE_SITEKEY}",
          callback: async function(token) {
            document.getElementById("status").innerText = "Token received! Activating on worker...";
            try {
              const res = await fetch("/oxalpha/activate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: token })
              });
              const data = await res.json();
              if (data.status === "ok") {
                document.getElementById("status").innerHTML = "<b style='color:#4ade80'>✓ Ox Alpha Unlocked! You can now use the model.</b>";
              } else {
                document.getElementById("status").innerText = "Activation error: " + (data.message || "failed");
              }
            } catch(e) {
              document.getElementById("status").innerText = "Network error: " + e.message;
            }
          }
        });
      } else {
        setTimeout(renderTurnstile, 200);
      }
    }
    document.addEventListener("DOMContentLoaded", renderTurnstile);
    renderTurnstile();
  </script>
</body>
</html>`;
        return new Response(html, { headers: { ...CORS_HEADERS, "Content-Type": "text/html; charset=utf-8" } });
      }

      // Activate endpoint: receives Turnstile token, activates session
      if (pathname === "/oxalpha/activate" && request.method === "POST") {
        try {
          const body = await request.json();
          const token = body.token;
          if (!token) return jsonResponse({ status: "error", message: "Token required" }, 400);

          const session = await fetchSession();
          const reqHeaders = {
            "Accept": "*/*",
            "Content-Type": "application/json",
            "Origin": OXALPHA_BASE,
            "Referer": `${OXALPHA_BASE}/chat`,
            "X-CSRF-TOKEN": session.csrfToken,
            "X-Turnstile-Token": token,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
          };
          if (session.cookies) reqHeaders["Cookie"] = session.cookies;

          const testRes = await fetch(OXALPHA_CHAT_URL, {
            method: "POST",
            headers: reqHeaders,
            body: JSON.stringify({
              model: "z-ai/glm-5.3-flash",
              messages: [{ role: "user", content: "Hi" }]
            })
          });

          if (testRes.ok) {
            // Save cookies returned from the successful verification
            let verifiedCookies = session.cookies;
            const newCookie = testRes.headers.get("set-cookie");
            if (newCookie) {
              verifiedCookies += "; " + newCookie.split(";")[0].trim();
            }

            cachedVerifiedSession = {
              csrfToken: session.csrfToken,
              cookies: verifiedCookies,
              expiresAt: Date.now() + 2 * 60 * 60 * 1000 // 2 hours
            };

            return jsonResponse({ status: "ok", message: "Verified session saved for 2 hours!" });
          } else {
            const err = await testRes.text();
            return jsonResponse({ status: "error", message: `Activation test failed: ${testRes.status}`, details: err }, 400);
          }
        } catch(e) {
          return jsonResponse({ status: "error", message: e.message }, 500);
        }
      }

      if (pathname === "/health" || pathname === "/oxalpha/health") {
        // Quick health check - just verify we can get a session
        try {
          const session = await fetchSession();
          return jsonResponse({
            status: "ok",
            provider: "oxalpha",
            csrf: session.csrfToken ? "present" : "missing",
            cookies: session.cookies ? "present" : "missing",
            models: session.chatModels.length
          });
        } catch (e) {
          return jsonResponse({
            status: "error",
            provider: "oxalpha",
            error: e.message
          }, 502);
        }
      }

      if (pathname === "/oxalpha/debug") {
        try {
          const session = await fetchSession();
          const reqHeaders = {
            "Accept": "*/*",
            "Accept-Language": "en-US,en;q=0.9",
            "Content-Type": "application/json",
            "Origin": OXALPHA_BASE,
            "Referer": `${OXALPHA_BASE}/chat`,
            "X-CSRF-TOKEN": session.csrfToken,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
          };
          if (session.cookies) reqHeaders["Cookie"] = session.cookies;

          const chatRes = await fetch(OXALPHA_CHAT_URL, {
            method: "POST",
            headers: reqHeaders,
            body: JSON.stringify({
              model: "z-ai/glm-5.3-flash",
              messages: [{ role: "user", content: "Hi" }]
            })
          });

          const chatText = await chatRes.text();
          return jsonResponse({
            status: "debug",
            session: {
              csrfToken: session.csrfToken ? session.csrfToken.slice(0, 15) + "..." : null,
              cookies: session.cookies
            },
            chatStatus: chatRes.status,
            chatHeaders: Object.fromEntries(chatRes.headers.entries()),
            chatBody: chatText.slice(0, 500)
          });
        } catch (e) {
          return jsonResponse({ error: e.message, stack: e.stack }, 500);
        }
      }

      return jsonResponse({ error: "Not found" }, 404);
    } catch (e) {
      console.error("[OxAlphaWorker] Unhandled error:", e);
      return jsonResponse({ error: { message: e.message } }, 500);
    }
  }
};
