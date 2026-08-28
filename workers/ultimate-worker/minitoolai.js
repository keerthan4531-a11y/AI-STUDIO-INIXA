import puppeteer from "@cloudflare/puppeteer";

// ═══════════════════════════════════════════════════════════════════
// MiniToolAI Reverse Proxy Worker — Advanced Architecture
// ═══════════════════════════════════════════════════════════════════
// Flow:
// 1. Frontend calls /minitool/session → worker fetches minitoolai page, 
//    extracts tokens, returns { phpsessid, utoken, safety_id, sitekey }
// 2. Frontend loads Turnstile JS with sitekey, solves in user's browser
// 3. Frontend calls /minitool/activate with the solved cft token
// 4. Frontend calls /v1/chat/completions with model=minitool/*
// 5. Worker proxies to minitoolai.com with X-Forwarded-For
// ═══════════════════════════════════════════════════════════════════

const MINITOOL_BASE = "https://minitoolai.com/gpt-ai";
const TURNSTILE_SITEKEY = "0x4AAAAAABjI2cBIeVpBYEFi";
// Python Docker proxy fallback (set to your deployed URL)
const PYTHON_PROXY_URL = ""; // e.g. "https://minitool-proxy.onrender.com"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, X-Forwarded-For, X-Real-IP",
};

// ─── Active Verified Session & Cookies ────────────────────────────
let activeMinitoolCookie = `PHPSESSID=5e03fd540d5d7d05a03af22469ec2c41; cf_clearance=QmWOKfypgzEJBHRWZ4E.9gxPMjvGTtmRgSEla_Chb28-1787908237-1.2.1.1-zsjD6L4Anxrk0NG7ctMjlPYe41.zHiTv4VkFb.Uxr7GQ4rQliCGdM1QHptnnNhYvPwanKOjADF6Oww6Ry9VE1.eaSG5BXlxa1HCHG_ycaFXJMYx3_33FM.3jcIaIhki22iCBQ4VIZcbH0PRGf5mEQzidz3zYao1nRwUPPdlhV5za212_eud2KILxft7PZaylRNjrIg0T6VMN_08s0c8_nRPQHyptmaDU98qonw.dEfNESqL8CvG6zfpcmYOFAUVPkGU.khWGAWW1iUy96Q6MmExtl4oC7JXLVXfLepvDrPRp_M_upqad61Ccm.947l4FEV9xFxQD1BSzt5MVHdnSEGmI4Q5hFW5FrTC1AX1ERWHSRY02f85f.qz6U40qyyQ0L4XLWXsk3U_zmbIENh4TVaBwKj9CfAFO_hAELoBwjcz8qw54Vlr4Ok2OhlgZ_BpiWRvzG1DrLMYYtmb9IXVGcWgvY3_7uuld7caDoRbG7c2sPL8xc77gGzgxUU1YpJskRbiWy4gmGe_8JytWm5c2pw; uDevice=notapple; _ga=GA1.1.588016467.1787908240; _ga_TDY3XB0LQQ=GS2.1.s1787908236$o1$g1$t1787908245$j55$l0$h1764203097`;

let defaultMinitoolSession = {
  phpsessid: "5e03fd540d5d7d05a03af22469ec2c41",
  utoken: "ddf626bb3fa5c45da0c1fc05ab63de17bd43b4eed2866dcd7a76fe1132bcbc32",
  safety_identifier: "f149e4c58d7eda024a836e850d80d21443b1a457915b8e08ad4f72627f111c53",
  cft: "direct"
};

// ─── Model Mapping ────────────────────────────────────────────────
const MODEL_MAP = {
  "minitool/gpt-5.6-luna":  "gpt-5.6-luna",
  "minitool/gpt-5.6-terra": "gpt-5.6-terra",
  "minitool/gpt-4o":        "gpt-4o-mini",
  "minitool/gpt-5.4-fast":  "gpt-5.4-mini",
  "minitool/gpt-5.4-mini":  "gpt-5.4-nano",
  "minitool/gpt-4.1":       "gpt-4.1-mini",
  "minitool/gpt-4.1-mini":  "gpt-4.1-nano",
  "minitool/gpt-5":         "gpt-5-mini",
  "minitool/gpt-5-mini":    "gpt-5-nano",
  "minitool/gpt-3.5-turbo": "gpt-3.5-turbo",
  // Raw names also work
  "gpt-5.6-luna":  "gpt-5.6-luna",
  "gpt-5.6-terra": "gpt-5.6-terra",
  "gpt-4o":        "gpt-4o-mini",
  "gpt-5.4-fast":  "gpt-5.4-mini",
  "gpt-5.4-mini":  "gpt-5.4-nano",
  "gpt-4.1":       "gpt-4.1-mini",
  "gpt-4.1-mini":  "gpt-4.1-nano",
  "gpt-5":         "gpt-5-mini",
  "gpt-5-mini":    "gpt-5-nano",
  "gpt-3.5-turbo": "gpt-3.5-turbo",
  // Claude models
  "minitool/claude-3-5-sonnet": "claude-3-5-sonnet-20241022",
  "minitool/claude-3-5-haiku":  "claude-3-5-haiku-20241022",
  "minitool/claude-3-opus":     "claude-3-opus-20240229",
  "minitool/claude-haiku-4.5": "claude-haiku-4-5",
  "minitool/claude-sonnet-5":  "claude-sonnet-5",
  "minitool/claude-opus-4.8":   "claude-opus-4-8",
  "claude-3-5-sonnet":          "claude-3-5-sonnet-20241022",
  "claude-3-5-haiku":           "claude-3-5-haiku-20241022",
  "claude-3-opus":              "claude-3-opus-20240229",
  "claude-haiku-4.5":          "claude-haiku-4-5",
  "claude-sonnet-5":           "claude-sonnet-5",
  "claude-opus-4.8":            "claude-opus-4-8",
  // Grok models
  "minitool/grok-4.5":          "grok-4.5",
  "minitool/grok-4.3":          "grok-4.3",
  "minitool/grok-build-0.1":    "grok-build-0.1",
  "grok-4.5":                   "grok-4.5",
  "grok-4.3":                   "grok-4.3",
  "grok-build-0.1":             "grok-build-0.1",
  // GLM models
  "minitool/glm-4.7-flash":    "GLM-4.7-Flash",
  "minitool/glm-5.2":          "GLM-5.2",
  "minitool/glm-5":            "GLM-5",
  "minitool/glm-4.5-flash":    "GLM-4.5-Flash",
  "minitool/glm-4.5-air":      "GLM-4.5-Air",
  "minitool/glm-4-32b":        "GLM-4-32B-0414-128K",
  "minitool/glm-4.6v-flashx":   "GLM-4.6V-FlashX",
  "glm-4.7-flash":             "GLM-4.7-Flash",
  "glm-5.2":                   "GLM-5.2",
  "glm-5":                     "GLM-5",
  "glm-4.5-flash":             "GLM-4.5-Flash",
  "glm-4.5-air":               "GLM-4.5-Air",
  "glm-4-32b":                 "GLM-4-32B-0414-128K",
  "glm-4.6v-flashx":            "GLM-4.6V-FlashX",
};

const REASONING_MODELS = ["gpt-5.6-terra", "gpt-5-mini", "gpt-5-nano", "gpt-5.4-mini"];

const UPSTASH_URL = 'https://mature-fly-79170.upstash.io';
const UPSTASH_TOKEN = 'gQAAAAAAATVCAAIgcDIzMDYyM2ZhYzBiMjE0Y2FhYmQyNzAwNmVkNjk2MjdkNw';

// ─── Session Pool (In-Memory + Upstash Redis) ─────────────────────
let sessionPool = [];
const SESSION_TTL = 570_000; // 9.5 Minutes: Max token validity for USE
const RECYCLE_TTL = 480_000; // 8 Minutes: Max age to RECYCLE a token back to pool
const HARVEST_TIMEOUT = 25000; // 25s timeout for browser harvest

async function pushSessionToRedis(session) {
  try {
    const serviceType = session.service_type || (session.is_claude ? 'claude' : 'gpt');
    const redisKey = `minitool_${serviceType}_sessions`;
    
    await fetch(`${UPSTASH_URL}/lpush/${redisKey}/${encodeURIComponent(JSON.stringify(session))}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
    });
    // Also push to generic pool as fallback
    await fetch(`${UPSTASH_URL}/lpush/minitool_sessions/${encodeURIComponent(JSON.stringify(session))}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
    });
  } catch (e) {
    console.error("Upstash push error:", e);
  }
}

async function harvestTokenViaBrowser(env, serviceType = 'gpt') {
  if (typeof serviceType === 'boolean') serviceType = serviceType ? 'claude' : 'gpt';
  if (!env || !env.MYBROWSER) return null;
  console.log(`[Cloudflare Browser] Launching edge browser for ${serviceType}...`);
  let browser = null;
  try {
    browser = await puppeteer.launch(env.MYBROWSER);
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      try { delete Object.getPrototypeOf(navigator).webdriver; } catch (e) {}
    });

    let targetUrl = "https://minitoolai.com/gpt-ai/";
    if (serviceType === 'claude') targetUrl = "https://minitoolai.com/Claude/";
    else if (serviceType === 'grok') targetUrl = "https://minitoolai.com/grok/";
    else if (serviceType === 'glm') targetUrl = "https://minitoolai.com/zai-glm/";

    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: HARVEST_TIMEOUT });
    
    // Poll and auto-click Turnstile iframe if present
    let cftToken = "";
    let extractedUt = "";
    let extractedSi = "";

    for (let attempt = 0; attempt < 30; attempt++) {
      // 1. Check window.cft or input value in page context
      const evalRes = await page.evaluate(() => {
        const cft = window.cft || document.querySelector('[name="cf-turnstile-response"]')?.value || document.querySelector('textarea[name="g-recaptcha-response"]')?.value || "";
        const html = document.documentElement.outerHTML;
        const utMatch = html.match(/var\s+utoken\s*=\s*['"]([^'"]+)['"]/);
        const siMatch = html.match(/var\s+safety_identifier\s*=\s*['"]([^'"]+)['"]/);
        return {
          cft: cft || "",
          ut: utMatch ? utMatch[1] : (window.utoken || ""),
          si: siMatch ? siMatch[1] : (window.safety_identifier || "")
        };
      }).catch(() => null);

      if (evalRes) {
        if (evalRes.ut) extractedUt = evalRes.ut;
        if (evalRes.si) extractedSi = evalRes.si;
        if (evalRes.cft && evalRes.cft.length > 20 && evalRes.cft !== "error" && evalRes.cft !== "expired") {
          cftToken = evalRes.cft;
          break;
        }
      }

      // 2. Click Turnstile checkbox if present in Cloudflare frames
      try {
        const frames = page.frames();
        for (const frame of frames) {
          if (frame.url().includes("challenges.cloudflare.com")) {
            const cb = await frame.$("input[type='checkbox'], #challenge-stage, .cb-i, span.mark, body").catch(() => null);
            if (cb) {
              await cb.click({ delay: 50 }).catch(() => {});
            }
          }
        }
      } catch (_) {}

      await page.evaluate(() => new Promise(r => setTimeout(r, 300))).catch(() => {});
    }

    const cookies = await page.cookies();
    const sessCookie = cookies.find(c => c.name === "PHPSESSID")?.value || `mt_${Math.random().toString(36).substring(2)}`;
    const finalUt = extractedUt || "af5215a3904e5b714be08e8fe13b2f2b8b491b83da86000722fd61eb56c9e409";
    const finalSi = extractedSi || "782e0b89005260f6dadb2cfd5409112d160d95f219921097d50c528eb45efe77";

    await browser.close();
    browser = null;

    if (cftToken && cftToken.length > 10) {
      console.log(`[Cloudflare Browser] Harvested session for ${serviceType}: PHPSESSID=${sessCookie.substring(0,8)}..., cft_len=${cftToken.length}`);
      const session = {
        phpsessid: sessCookie,
        utoken: finalUt,
        safety_identifier: finalSi,
        cft: cftToken,
        service_type: serviceType,
        is_claude: serviceType === 'claude',
        timestamp: Date.now()
      };
      sessionPool.push(session);
      if (sessionPool.length > 10) sessionPool = sessionPool.slice(-10);
      await pushSessionToRedis(session);
      return session;
    } else {
      console.warn(`[Cloudflare Browser] Harvest incomplete for ${serviceType}: sess=${!!sessCookie}, cft_len=${cftToken?.length || 0}`);
    }
  } catch (e) {
    console.error(`[Cloudflare Browser] Error harvesting token for ${serviceType} on edge:`, e.message || e);
    if (browser) {
      try { await browser.close(); } catch(_) {}
    }
  }
  return null;
}

// ─── Parallel Multi-Service Harvest ──────────────────────────────
async function harvestMultipleTokens(env) {
  if (!env || !env.MYBROWSER) return { harvested: 0 };
  const serviceTypes = ['gpt', 'claude', 'grok', 'glm'];
  let harvested = 0;
  // Run sequentially to avoid overwhelming the browser binding
  for (const st of serviceTypes) {
    try {
      const s = await harvestTokenViaBrowser(env, st);
      if (s) harvested++;
    } catch (e) {
      console.warn(`[Multi-Harvest] Failed for ${st}:`, e.message || e);
    }
  }
  console.log(`[Multi-Harvest] Completed: ${harvested}/${serviceTypes.length} tokens harvested`);
  return { harvested, total: serviceTypes.length };
}

async function getValidSession(env = null, serviceType = 'gpt') {
  // Normalize boolean parameters if passed by legacy callers
  if (typeof serviceType === 'boolean') {
    serviceType = serviceType ? 'claude' : 'gpt';
  }

  // 1. Clean expired local sessions
  sessionPool = sessionPool.filter(s => (Date.now() - s.timestamp) < SESSION_TTL);
  const matchingIndex = sessionPool.findIndex(s => (s.service_type || (s.is_claude ? 'claude' : 'gpt')) === serviceType);
  if (matchingIndex !== -1) {
    return sessionPool.splice(matchingIndex, 1)[0];
  }
  
  // 2. Fetch from Upstash Redis specific model pool (try up to 50 popped sessions to drain stale ones)
  const redisKey = `minitool_${serviceType}_sessions`;
  try {
    for (let i = 0; i < 50; i++) {
      const res = await fetch(`${UPSTASH_URL}/lpop/${redisKey}`, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
      });
      const data = await res.json();
      if (data && data.result) {
        const s = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
        if (Date.now() - s.timestamp < SESSION_TTL) {
          return s;
        }
      } else {
        break; // Queue is empty
      }
    }
  } catch (e) {
    console.error("Upstash pop error:", e);
  }

  // 3. Fallback to generic pool (try up to 50 popped sessions)
  try {
    for (let i = 0; i < 50; i++) {
      const res = await fetch(`${UPSTASH_URL}/lpop/minitool_sessions`, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
      });
      const data = await res.json();
      if (data && data.result) {
        const s = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
        if (Date.now() - s.timestamp < SESSION_TTL) {
          return s;
        }
      } else {
        break; // Queue is empty
      }
    }
  } catch (e) {
    console.error("Upstash generic pop error:", e);
  }

  // 4. JIT Edge Browser harvest with 3 attempts
  if (env && env.MYBROWSER) {
    for (let jitAttempt = 1; jitAttempt <= 3; jitAttempt++) {
      try {
        console.log(`[JIT Harvest] Attempt ${jitAttempt}/3: Triggering Edge harvest for ${serviceType}...`);
        const s = await harvestTokenViaBrowser(env, serviceType);
        if (s) return s;
        // If harvest returned null, try 'gpt' as universal fallback on 2nd+ attempt
        if (jitAttempt >= 2 && serviceType !== 'gpt') {
          console.log(`[JIT Harvest] Trying 'gpt' as fallback service type...`);
          const fallbackS = await harvestTokenViaBrowser(env, 'gpt');
          if (fallbackS) return fallbackS;
        }
      } catch (e) {
        console.error(`[JIT Harvest Error] Attempt ${jitAttempt}:`, e.message || e);
      }
    }
  }

  return null;
}

// ─── Get user's real IP ───────────────────────────────────────────
function getUserIP(request) {
  return request.headers.get("X-Real-IP") 
    || request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim()
    || request.headers.get("CF-Connecting-IP")
    || "1.1.1.1";
}

// ─── Fetch fresh session tokens from minitoolai ──────────────────
async function fetchSessionFromMiniTool(request) {
  const userIP = getUserIP(request);
  const headers = new Headers(request.headers);
  headers.delete("cf-connecting-ip");
  headers.delete("cf-ipcountry");
  headers.delete("cf-ray");
  headers.delete("cf-visitor");
  headers.set("Host", "minitoolai.com");
  headers.set("Origin", "https://minitoolai.com");
  headers.set("Referer", "https://minitoolai.com/gpt-ai/");
  headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36");
  headers.set("Cookie", "uDevice=notapple");
  headers.set("X-Forwarded-For", userIP);
  headers.set("X-Real-IP", userIP);

  const res = await fetch(`${MINITOOL_BASE}/`, { headers });
  const html = await res.text();

  const utMatch = html.match(/var\s+utoken\s*=\s*['"]([^'"]+)['"]/);
  const siMatch = html.match(/var\s+safety_identifier\s*=\s*['"]([^'"]+)['"]/);
  const cookieHeader = res.headers.get("set-cookie") || "";
  const sessMatch = cookieHeader.match(/PHPSESSID=([^;]+)/);

  const utoken = utMatch ? utMatch[1] : "af5215a3904e5b714be08e8fe13b2f2b8b491b83da86000722fd61eb56c9e409";
  const safety_identifier = siMatch ? siMatch[1] : "782e0b89005260f6dadb2cfd5409112d160d95f219921097d50c528eb45efe77";
  const phpsessid = sessMatch ? sessMatch[1] : "";

  if (!phpsessid && !utoken) {
    throw new Error("Failed to extract tokens from minitoolai.com");
  }

  return {
    phpsessid: phpsessid || `mt_sess_${Math.random().toString(36).substring(2)}`,
    utoken,
    safety_identifier,
    sitekey: TURNSTILE_SITEKEY,
  };
}

// ─── Chat Request to MiniToolAI ──────────────────────────────────
async function proxyChat(session, model, messages, temperature, request) {
  const userIP = getUserIP(request);
  const selectModel = MODEL_MAP[model.toLowerCase()] || model;
  
  // Build message + history
  const userMsgs = messages.filter(m => m.role === "user");
  const botMsgs = messages.filter(m => m.role === "assistant");
  const lastMsg = userMsgs.length > 0 ? (typeof userMsgs[userMsgs.length-1].content === 'string' ? userMsgs[userMsgs.length-1].content : JSON.stringify(userMsgs[userMsgs.length-1].content)) : "";

  const prev = [
    { u: userMsgs.length >= 2 ? userMsgs[userMsgs.length-2]?.content || "" : "", b: botMsgs.length >= 1 ? botMsgs[botMsgs.length-1]?.content || "" : "" },
    { u: userMsgs.length >= 3 ? userMsgs[userMsgs.length-3]?.content || "" : "", b: botMsgs.length >= 2 ? botMsgs[botMsgs.length-2]?.content || "" : "" },
  ];

  const isClaude = selectModel.startsWith("claude");
  const isGrok = selectModel.startsWith("grok");
  const isGlm = selectModel.startsWith("GLM-") || selectModel.startsWith("glm-");

  let baseUrl = "https://minitoolai.com/gpt-ai";
  let streamPhp = "chatgpt_stream.php";
  let initPhp = "";

  if (isClaude) {
    baseUrl = "https://minitoolai.com/Claude";
    streamPhp = "claude_stream_v1.php";
  } else if (isGrok) {
    baseUrl = "https://minitoolai.com/grok";
    streamPhp = "grok_stream_v1.php";
    initPhp = "createnewchat1.php";
  } else if (isGlm) {
    baseUrl = "https://minitoolai.com/zai-glm";
    streamPhp = "glm_stream.php";
    initPhp = "createnewchat.php";
  }

  let form;
  if (isClaude) {
    form = new URLSearchParams({
      temperature: String(temperature || 0.7),
      select_model: selectModel,
      reasoning_effort: "disabled",
      utoken: session.utoken,
      message: lastMsg,
      umes1a: prev[0].u,
      bres1a: prev[0].b,
      umes2a: prev[1].u,
      bres2a: prev[1].b,
      cft: session.cft,
    });
  } else if (isGrok) {
    form = new URLSearchParams({
      select_model: selectModel,
      temperature: String(temperature || 0.7),
      utoken: session.utoken,
      message: lastMsg,
      umes1a: prev[0].u,
      bres1a: prev[0].b,
      umes2a: prev[1].u,
      bres2a: prev[1].b,
      cft: session.cft,
    });
  } else if (isGlm) {
    form = new URLSearchParams({
      temperature: String(temperature || 0.7),
      select_model: selectModel,
      reasoning_effort: "disabled",
      utoken: session.utoken,
      message: lastMsg,
      umes1a: prev[0].u,
      bres1a: prev[0].b,
      umes2a: prev[1].u,
      bres2a: prev[1].b,
      cft: session.cft,
    });
  } else {
    form = new URLSearchParams({
      messagebase64img1: "",
      messagebase64img0: "",
      safety_identifier: session.safety_identifier || "",
      select_model: selectModel,
      temperature: String(temperature || 0.7),
      utoken: session.utoken,
      message: lastMsg,
      umes1a: prev[0].u, umes1stimg1a: "", umes2ndimg1a: "", bres1a: prev[0].b,
      umes2a: prev[1].u, umes1stimg2a: "", umes2ndimg2a: "", bres2a: prev[1].b,
      cft: session.cft,
    });
  }

  const headers = new Headers(request.headers);
  headers.delete("cf-connecting-ip");
  headers.delete("cf-ipcountry");
  headers.delete("cf-ray");
  headers.delete("cf-visitor");
  headers.set("Host", "minitoolai.com");
  headers.set("Origin", "https://minitoolai.com");
  headers.set("Referer", `${baseUrl}/`);
  headers.set("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
  const cookieToSend = session.cookie || (typeof env !== 'undefined' && env?.MINITOOL_COOKIE) || activeMinitoolCookie;
  headers.set("Cookie", cookieToSend);
  headers.set("X-Forwarded-For", userIP);
  headers.set("X-Real-IP", userIP);
  headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36");

  if (initPhp) {
    const convoId = `${Math.random().toString(36).substring(2)}-${Math.random().toString(36).substring(2)}`;
    const initParams = new URLSearchParams({
      conversation_id: convoId,
      chatHistoryPath: "chat_history/temporarychat.json",
      utoken: session.utoken,
    });
    await fetch(`${baseUrl}/${initPhp}`, {
      method: "POST",
      headers: headers,
      body: initParams.toString(),
    }).catch(() => {});
  }

  // POST to initialize stream
  const postRes = await fetch(`${baseUrl}/${streamPhp}`, {
    method: "POST",
    headers: headers,
    body: form.toString(),
  });

  if (isGrok || isGlm) {
    return { sseRes: postRes, selectModel };
  }

  const streamToken = await postRes.text();
  
  if (!isClaude && (!streamToken || streamToken === "refresh" || streamToken.length < 10)) {
    throw new Error(`Session invalid (got "${streamToken}"). Need fresh Turnstile token.`);
  }

  const getHeaders = new Headers(headers);
  getHeaders.set("Accept", "text/event-stream");
  getHeaders.set("Cache-Control", "no-cache");
  getHeaders.set("Pragma", "no-cache");
  getHeaders.delete("Content-Type");
  getHeaders.delete("X-Requested-With");

  const sseUrl = isClaude 
    ? `${baseUrl}/${streamPhp}` 
    : `${baseUrl}/${streamPhp}?streamtoken=${streamToken}`;

  // GET SSE stream
  const sseRes = await fetch(sseUrl, {
    headers: getHeaders,
  });

  return { sseRes, selectModel };
}

// ─── SSE Transform: minitoolai → OpenAI format ───────────────────
function createTransformStream(model) {
  let buffer = "";
  let evtType = "";

  return new TransformStream({
    transform(chunk, ctrl) {
      buffer += new TextDecoder().decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const raw of lines) {
        const line = raw.trim();
        if (!line) continue;

        if (line.startsWith("event:")) { evtType = line.slice(6).trim(); continue; }

        if (line.startsWith("data:")) {
          const d = line.slice(5).trim();
          if (!d) continue;

          try {
            const j = JSON.parse(d);
            const t = j.type || evtType;

            // Completed
            if (t === "response.completed" || j.response?.status === "completed") {
              const fin = { id: `chatcmpl-mt-${Date.now()}`, object: "chat.completion.chunk", created: Math.floor(Date.now()/1000), model, choices: [{ index: 0, delta: {}, finish_reason: "stop" }] };
              ctrl.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(fin)}\n\n`));
              ctrl.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
              return;
            }

            let content = null, reasoning = null;

            // Format 1: OpenAI choices array (Grok, GLM, etc.)
            if (j.choices && Array.isArray(j.choices) && j.choices.length > 0) {
              const choice = j.choices[0];
              if (choice.delta) {
                if (typeof choice.delta === "string") {
                  content = choice.delta;
                } else if (typeof choice.delta === "object") {
                  if (choice.delta.content !== undefined && choice.delta.content !== null) content = choice.delta.content;
                  else if (choice.delta.text !== undefined && choice.delta.text !== null) content = choice.delta.text;
                  if (choice.delta.reasoning_content) reasoning = choice.delta.reasoning_content;
                  else if (choice.delta.reasoning) reasoning = choice.delta.reasoning;
                }
              } else if (choice.text !== undefined) {
                content = choice.text;
              } else if (choice.message?.content !== undefined) {
                content = choice.message.content;
              }
            }

            // Format 2: Claude content_block_delta or nested delta object
            if (content === null && j.delta && typeof j.delta === "object") {
              if (j.delta.text !== undefined && j.delta.text !== null) content = j.delta.text;
              else if (j.delta.content !== undefined && j.delta.content !== null) content = j.delta.content;
            }

            // Format 3: GPT response.output_text.delta or raw string delta
            if (content === null && typeof j.delta === "string") {
              content = j.delta;
            }

            // Format 4: Direct text/content/message properties on j
            if (content === null) {
              if (typeof j.text === "string") content = j.text;
              else if (typeof j.content === "string") content = j.content;
              else if (typeof j.message === "string") content = j.message;
            }

            // Format 5: Reasoning content
            if (reasoning === null) {
              if (typeof j.reasoning === "string") reasoning = j.reasoning;
              else if (typeof j.reasoning_content === "string") reasoning = j.reasoning_content;
            }

            if (content !== null || reasoning !== null) {
              const c = {
                id: `chatcmpl-mt-${Date.now()}`, object: "chat.completion.chunk",
                created: Math.floor(Date.now()/1000), model,
                choices: [{ index: 0, delta: { ...(content !== null ? { content } : {}), ...(reasoning !== null ? { reasoning_content: reasoning } : {}) }, finish_reason: null }],
              };
              ctrl.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(c)}\n\n`));
            }
          } catch(e) {}
        }
        evtType = "";
      }
    },
    flush(ctrl) {
      ctrl.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ id: `chatcmpl-mt-${Date.now()}`, object: "chat.completion.chunk", created: Math.floor(Date.now()/1000), model, choices: [{ index: 0, delta: {}, finish_reason: "stop" }] })}\n\n`));
      ctrl.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
    },
  });
}

// ─── Init Page (Setup UI) ────────────────────────────────────────
function getInitPage(origin) {
  return `<!DOCTYPE html><html><head><title>MiniToolAI Setup</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{background:#0d1117;color:#c9d1d9;font-family:monospace;padding:30px;max-width:700px;margin:0 auto}h2{color:#58a6ff;margin-bottom:15px}.card{background:#161b22;border:1px solid #30363d;border-radius:12px;padding:20px;margin:12px 0}code{background:#1f2937;color:#7ee787;padding:2px 6px;border-radius:4px;font-size:13px}.s{padding:10px;border-radius:8px;margin:10px 0;font-size:14px}.ok{background:#0d2818;border:1px solid #238636;color:#7ee787}.err{background:#2d1117;border:1px solid #da3633;color:#f85149}.info{background:#0d1d33;border:1px solid #1f6feb;color:#58a6ff}button{background:#238636;color:#fff;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;margin:5px 0}button:hover{background:#2ea043}.models{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:6px;margin:10px 0}.tag{background:#1f2937;border:1px solid #30363d;border-radius:6px;padding:6px 10px;font-size:12px;color:#8b949e}textarea{width:100%;height:50px;background:#0d1117;color:#c9d1d9;border:1px solid #30363d;border-radius:8px;padding:10px;font-family:monospace;font-size:13px;resize:vertical}textarea:focus{outline:none;border-color:#58a6ff}pre{background:#0d1117;padding:12px;border-radius:8px;border:1px solid #30363d;white-space:pre-wrap;max-height:300px;overflow-y:auto;font-size:13px;color:#c9d1d9;margin:8px 0;display:none}</style></head><body>
<h2>🔧 MiniToolAI Worker Setup</h2>
<div class="card"><h3 style="color:#8b949e;margin-bottom:10px">📋 Quick Setup (One Click)</h3>
<p style="color:#8b949e;margin-bottom:10px">Click below to auto-setup. Opens minitoolai.com, solves Turnstile, activates session.</p>
<button onclick="autoSetup()">🚀 Auto Setup Session</button>
<div id="st" class="s info" style="display:none"></div></div>
<div class="card"><h3 style="color:#8b949e;margin-bottom:10px">📡 Session Status</h3>
<div id="ss" class="s info">Checking...</div>
<button onclick="checkSt()" style="background:#1f6feb">🔄 Refresh</button></div>
<div class="card"><h3 style="color:#8b949e;margin-bottom:10px">🧪 Quick Test</h3>
<textarea id="tm" placeholder="Type message..."></textarea>
<select id="tmod" style="background:#0d1117;color:#c9d1d9;border:1px solid #30363d;border-radius:6px;padding:6px;margin:5px 0;width:100%">
<option value="minitool/gpt-3.5-turbo">gpt-3.5-turbo</option><option value="minitool/gpt-4o">gpt-4o</option>
<option value="minitool/gpt-5.6-luna">gpt-5.6 Luna</option><option value="minitool/gpt-5.6-terra">gpt-5.6 Terra</option></select>
<button onclick="testChat()" style="background:#8957e5">🧪 Test</button>
<pre id="tr"></pre></div>
<div class="card"><h3 style="color:#8b949e;margin-bottom:10px">🤖 Models</h3>
<div class="models">${Object.keys(MODEL_MAP).filter(k=>k.startsWith("minitool/")).map(m=>`<div class="tag">${m}</div>`).join("")}</div></div>
<script>
const W="${origin}";
async function autoSetup(){
  const st=document.getElementById("st");st.style.display="block";st.className="s info";st.textContent="⏳ Step 1: Getting session from minitoolai...";
  try{
    const r1=await fetch(W+"/minitool/session");const d1=await r1.json();
    if(!d1.ok)throw new Error(d1.error);
    st.textContent="⏳ Step 2: Solving Turnstile in popup...";
    // Open minitoolai in a popup, extract tokens
    const popup=window.open("https://minitoolai.com/gpt-ai/","_blank","width=500,height=400");
    if(!popup){st.className="s err";st.textContent="❌ Popup blocked! Allow popups and try again.";return;}
    st.textContent="⏳ Waiting for Turnstile to solve... (send 'hi' in the popup window)";
    // Poll the popup for cft token
    let attempts=0;const maxAttempts=60;
    const poll=setInterval(async()=>{
      attempts++;
      try{
        // Try to read cft from popup
        if(popup.closed){clearInterval(poll);st.className="s err";st.textContent="❌ Popup closed before getting token.";return;}
        const cft=popup.cft;const doc=popup.document;
        const scripts=doc.querySelectorAll("script");
        let ut="",si="",ps=doc.cookie.match(/PHPSESSID=([^;]+)/)?.[1]||"";
        for(const s of scripts){const t=s.textContent;const m1=t.match(/var utoken\\s*=\\s*"([^"]+)"/);if(m1)ut=m1[1];const m2=t.match(/var safety_identifier\\s*=\\s*"([^"]+)"/);if(m2)si=m2[1];}
        if(cft&&cft.length>20&&cft!=="error"&&cft!=="expired"){
          clearInterval(poll);popup.close();
          st.textContent="⏳ Step 3: Activating session...";
          const r2=await fetch(W+"/minitool/activate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({cft,utoken:ut||d1.utoken,safety_identifier:si||d1.safety_identifier,phpsessid:ps||d1.phpsessid})});
          const d2=await r2.json();
          if(d2.ok){st.className="s ok";st.textContent="✅ Session ACTIVE! Expires in ~4 min. Models ready to use.";}
          else{st.className="s err";st.textContent="❌ "+d2.error;}
        }
      }catch(e){/* cross-origin, keep waiting */}
      if(attempts>=maxAttempts){clearInterval(poll);st.className="s err";st.textContent="❌ Timeout. Close popup and try again.";}
    },1000);
  }catch(e){st.className="s err";st.textContent="❌ "+e.message;}
}
async function checkSt(){const el=document.getElementById("ss");try{const r=await fetch(W+"/minitool/status");const d=await r.json();if(d.session_valid){el.className="s ok";el.textContent="✅ ACTIVE | TTL: "+d.ttl_remaining+"s";}else{el.className="s err";el.textContent="❌ No session. Click Auto Setup above.";}}catch(e){el.className="s err";el.textContent="❌ "+e.message;}}
async function testChat(){const msg=document.getElementById("tm").value;const model=document.getElementById("tmod").value;const r=document.getElementById("tr");if(!msg){alert("Type a message!");return;}r.style.display="block";r.textContent="⏳ Sending...\\n";
try{const res=await fetch(W+"/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model,messages:[{role:"user",content:msg}],stream:true})});if(!res.ok){r.textContent="❌ "+await res.text();return;}const reader=res.body.getReader();const dec=new TextDecoder();r.textContent="";while(true){const{done,value}=await reader.read();if(done)break;const t=dec.decode(value,{stream:true});for(const l of t.split("\\n")){if(l.startsWith("data: ")&&l!=="data: [DONE]"){try{const p=JSON.parse(l.slice(6));r.textContent+=(p.choices?.[0]?.delta?.reasoning_content||"")+(p.choices?.[0]?.delta?.content||"");}catch(e){}}}}}catch(e){r.textContent="❌ "+e.message;}}
checkSt();
</script></body></html>`;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN WORKER EXPORT
// ═══════════════════════════════════════════════════════════════════
export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

    const url = new URL(request.url);
    const path = url.pathname;
    const userIP = getUserIP(request);

    try {
      // ── Init Page ──
      if (path === "/minitool/init") {
        return new Response(getInitPage(url.origin), { headers: { ...CORS, "Content-Type": "text/html; charset=utf-8" } });
      }

      // ── Standalone Turnstile Auto-Solver Page ──
      if (path === "/minitool/solve") {
        const isClaude = url.searchParams.get("type") === "claude";
        const cleanSolverHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>MiniTool Solver</title>
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
</head>
<body style="margin:0;padding:0;background:transparent;">
  <div id="turnstile-widget"></div>
  <script>
    (function() {
      var workerOrigin = "${url.origin}";
      var isClaude = ${isClaude};
      var defaultUt = "af5215a3904e5b714be08e8fe13b2f2b8b491b83da86000722fd61eb56c9e409";
      var defaultSi = "782e0b89005260f6dadb2cfd5409112d160d95f219921097d50c528eb45efe77";

      function generateSessId() {
        var s = "";
        for (var i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
        return s;
      }

      function initTurnstile() {
        if (window.turnstile && typeof window.turnstile.render === "function") {
          try {
            window.turnstile.render('#turnstile-widget', {
              sitekey: '0x4AAAAAABjI2cBIeVpBYEFi',
              callback: function(token) {
                console.log('[MiniTool Clean Solver] Turnstile solved! Token len:', token.length);
                fetch(workerOrigin + '/minitool/activate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    cft: token,
                    phpsessid: generateSessId(),
                    utoken: defaultUt,
                    safety_identifier: defaultSi,
                    is_claude: isClaude
                  })
                }).then(function(r) { return r.json(); }).then(function(data) {
                  console.log('[MiniTool Clean Solver] Activated session:', data);
                  try { window.parent.postMessage({ type: 'MINITOOL_ACTIVATED', ok: true, isClaude: isClaude }, '*'); } catch(e) {}
                }).catch(function(err) {
                  console.error('[MiniTool Clean Solver] Activate error:', err);
                });
              }
            });
          } catch(e) { console.error('[MiniTool Clean Solver] Render error:', e); }
        } else {
          setTimeout(initTurnstile, 250);
        }
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTurnstile);
      } else {
        initTurnstile();
      }
    })();
  </script>
</body>
</html>`;
        return new Response(cleanSolverHtml, { headers: { ...CORS, "Content-Type": "text/html; charset=utf-8" } });
      }

      // ── Get Session Tokens (Step 1) ──
      if (path === "/minitool/session") {
        const tokens = await fetchSessionFromMiniTool(request);
        return new Response(JSON.stringify({ ok: true, ...tokens }), { headers: { ...CORS, "Content-Type": "application/json" } });
      }

      // ── Activate Session with Turnstile Token (Step 2) ──
      if (path === "/minitool/activate" || path === "/minitool/submit-token") {
        const data = await request.json();
        if (!data.cft || data.cft.length < 10) {
          return new Response(JSON.stringify({ ok: false, error: "Invalid cft token" }), { headers: { ...CORS, "Content-Type": "application/json" } });
        }

        const serviceType = data.service_type || (data.is_claude ? 'claude' : 'gpt');

        // Build session
        let session;
        if (data.phpsessid && data.utoken) {
          session = {
            phpsessid: data.phpsessid,
            utoken: data.utoken,
            safety_identifier: data.safety_identifier || "",
            cft: data.cft,
            service_type: serviceType,
            is_claude: serviceType === 'claude',
            timestamp: Date.now()
          };
        } else {
          const tokens = await fetchSessionFromMiniTool(request);
          session = { ...tokens, cft: data.cft, service_type: serviceType, is_claude: serviceType === 'claude', timestamp: Date.now() };
        }

        // Update default active session immediately
        defaultMinitoolSession.cft = data.cft;
        if (data.utoken) defaultMinitoolSession.utoken = data.utoken;
        if (data.safety_identifier) defaultMinitoolSession.safety_identifier = data.safety_identifier;
        if (data.phpsessid) defaultMinitoolSession.phpsessid = data.phpsessid;
        if (data.cookie) activeMinitoolCookie = data.cookie;

        // Add to pool (in-memory + Upstash Redis)
        sessionPool.push(session);
        if (sessionPool.length > 5) sessionPool = sessionPool.slice(-5);
        ctx.waitUntil(pushSessionToRedis(session));

        return new Response(JSON.stringify({
          ok: true,
          session_id: session.phpsessid.substring(0, 8) + "...",
          expires_in: SESSION_TTL / 1000,
          models: Object.keys(MODEL_MAP).filter(k => k.startsWith("minitool/")),
        }), { headers: { ...CORS, "Content-Type": "application/json" } });
      }

      // ── Trigger Edge Harvest ──
      if (path === "/minitool/harvest") {
        const sGpt = await harvestTokenViaBrowser(env, 'gpt');
        const sClaude = await harvestTokenViaBrowser(env, 'claude');
        return new Response(JSON.stringify({ ok: true, gpt: !!sGpt, claude: !!sClaude }), { headers: { ...CORS, "Content-Type": "application/json" } });
      }

      // ── Session Status ──
      if (path === "/minitool/status") {
        const s = await getValidSession(env, false);
        return new Response(JSON.stringify({
          ok: true,
          session_valid: !!s,
          session_age: s ? Math.floor((Date.now() - s.timestamp) / 1000) : null,
          ttl_remaining: s ? Math.max(0, Math.floor((SESSION_TTL - (Date.now() - s.timestamp)) / 1000)) : 0,
          pool_size: sessionPool.filter(x => (Date.now() - x.timestamp) < SESSION_TTL).length,
        }), { headers: { ...CORS, "Content-Type": "application/json" } });
      }

      // ── Models List ──
      if (path.endsWith("/models") && request.method === "GET") {
        const models = Object.keys(MODEL_MAP).filter(k => k.startsWith("minitool/")).map(id => ({
          id, object: "model", created: 1700000000, owned_by: "minitoolai",
          display_name: id.replace("minitool/", ""),
        }));
        return new Response(JSON.stringify({ object: "list", data: models }), { headers: { ...CORS, "Content-Type": "application/json" } });
      }

      // ── Chat Completions ──
      if (path.endsWith("/chat/completions") && request.method === "POST") {
        const body = await request.json();
        const model = (body.model || "").toLowerCase();
        const selectModel = MODEL_MAP[model] || model;
        
        let serviceType = 'gpt';
        if (selectModel.includes("claude") || model.includes("claude")) serviceType = 'claude';
        else if (selectModel.includes("grok") || model.includes("grok")) serviceType = 'grok';
        else if (selectModel.startsWith("GLM") || selectModel.startsWith("glm") || model.includes("glm")) serviceType = 'glm';

        if (!model.includes("minitool") && !MODEL_MAP[model]) {
          return new Response(JSON.stringify({ error: "Not a MiniToolAI model" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
        }

        const session = {
          ...defaultMinitoolSession,
          utoken: (typeof env !== 'undefined' && env?.MINITOOL_UTOKEN) || defaultMinitoolSession.utoken,
          safety_identifier: (typeof env !== 'undefined' && env?.MINITOOL_SAFETY) || defaultMinitoolSession.safety_identifier,
          cookie: (typeof env !== 'undefined' && env?.MINITOOL_COOKIE) || activeMinitoolCookie,
          cft: "direct",
        };

        let res;
        try {
          res = await proxyChat(session, model, body.messages || [], body.temperature, request, env);
        } catch(e) {
          return new Response(JSON.stringify({ error: `MiniTool error: ${e.message}` }), { status: 502, headers: { ...CORS, "Content-Type": "application/json" } });
        }

        if (!res || !res.sseRes || !res.sseRes.ok) {
          return new Response(JSON.stringify({
            error: `MiniTool request failed with status ${res?.sseRes?.status || 502}`
          }), { status: 502, headers: { ...CORS, "Content-Type": "application/json" } });
        }

        const sseRes = res.sseRes;
        const resolvedModel = res.selectModel;

        if (body.stream !== false && sseRes.body) {
          return new Response(sseRes.body.pipeThrough(createTransformStream(resolvedModel)), {
            headers: { ...CORS, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
          });
        } else {
          // Non-streaming
          const reader = sseRes.body.getReader();
          const dec = new TextDecoder();
          let full = "", reasoning = "", buf = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });
            const lines = buf.split("\n"); buf = lines.pop() || "";
            for (const l of lines) {
              if (l.startsWith("data:")) {
                try {
                  const p = JSON.parse(l.slice(5).trim());
                  if (p.type?.includes("output_text") && p.delta) full += p.delta;
                  if (p.type?.includes("reasoning") && p.delta) reasoning += p.delta;
                } catch(e) {}
              }
            }
          }
          return new Response(JSON.stringify({
            id: `chatcmpl-mt-${Date.now()}`, object: "chat.completion", created: Math.floor(Date.now()/1000), model: resolvedModel,
            choices: [{ index: 0, message: { role: "assistant", content: full, ...(reasoning ? { reasoning_content: reasoning } : {}) }, finish_reason: "stop" }],
          }), { headers: { ...CORS, "Content-Type": "application/json" } });
        }
      }

      // ── Inject Token from Client-Side Iframe Solver ──
      if (path === "/minitool/inject-token" && request.method === "POST") {
        try {
          const data = await request.json();
          if (!data.cft || data.cft.length < 10) {
            return new Response(JSON.stringify({ ok: false, error: "Invalid cft token" }), { headers: { ...CORS, "Content-Type": "application/json" } });
          }
          const serviceType = data.service_type || 'gpt';
          const session = {
            phpsessid: data.phpsessid || '',
            utoken: data.utoken || '',
            safety_identifier: data.safety_identifier || '',
            cft: data.cft,
            service_type: serviceType,
            is_claude: serviceType === 'claude',
            timestamp: Date.now()
          };

          // If missing session data, fetch it from minitoolai
          if (!session.phpsessid || !session.utoken) {
            try {
              const tokens = await fetchSessionFromMiniTool(request);
              session.phpsessid = session.phpsessid || tokens.phpsessid;
              session.utoken = session.utoken || tokens.utoken;
              session.safety_identifier = session.safety_identifier || tokens.safety_identifier;
            } catch (e) {
              console.warn('[Inject Token] Could not fetch session data:', e.message);
            }
          }

          sessionPool.push(session);
          if (sessionPool.length > 10) sessionPool = sessionPool.slice(-10);
          ctx.waitUntil(pushSessionToRedis(session));

          console.log(`[Inject Token] Client injected ${serviceType} token: cft_len=${data.cft.length}`);
          return new Response(JSON.stringify({ ok: true, service_type: serviceType }), { headers: { ...CORS, "Content-Type": "application/json" } });
        } catch (e) {
          return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
        }
      }

      // ── Health Check: Pool Depth ──
      if (path === "/health/minitool") {
        // Check local pool
        const validLocal = sessionPool.filter(s => (Date.now() - s.timestamp) < SESSION_TTL).length;
        // Check Redis pool depth for each service type
        let redisDepths = {};
        for (const st of ['gpt', 'claude', 'grok', 'glm']) {
          try {
            const res = await fetch(`${UPSTASH_URL}/llen/minitool_${st}_sessions`, {
              headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
            });
            const data = await res.json();
            redisDepths[st] = data.result || 0;
          } catch (e) {
            redisDepths[st] = 'error';
          }
        }
        // Generic pool
        try {
          const res = await fetch(`${UPSTASH_URL}/llen/minitool_sessions`, {
            headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
          });
          const data = await res.json();
          redisDepths.generic = data.result || 0;
        } catch (e) { redisDepths.generic = 'error'; }

        return new Response(JSON.stringify({
          ok: true,
          local_pool: validLocal,
          redis_pools: redisDepths,
          session_ttl_ms: SESSION_TTL,
          recycle_ttl_ms: RECYCLE_TTL,
          timestamp: new Date().toISOString()
        }), { headers: { ...CORS, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...CORS, "Content-Type": "application/json" } });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
    }
  },
};

export { harvestTokenViaBrowser, harvestMultipleTokens };
