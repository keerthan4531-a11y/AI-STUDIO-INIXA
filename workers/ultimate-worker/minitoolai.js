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
};

const REASONING_MODELS = ["gpt-5.6-terra", "gpt-5-mini", "gpt-5-nano", "gpt-5.4-mini"];

const UPSTASH_URL = 'https://mature-fly-79170.upstash.io';
const UPSTASH_TOKEN = 'gQAAAAAAATVCAAIgcDIzMDYyM2ZhYzBiMjE0Y2FhYmQyNzAwNmVkNjk2MjdkNw';

// ─── Session Pool (In-Memory + Upstash Redis) ─────────────────────
let sessionPool = [];
const SESSION_TTL = 250_000; // ~4.2 minutes

async function pushSessionToRedis(session) {
  try {
    const isClaude = session.is_claude || !session.safety_identifier;
    const redisKey = isClaude ? 'minitool_claude_sessions' : 'minitool_gpt_sessions';
    
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

async function harvestTokenViaBrowser(env, isClaude = false) {
  if (!env || !env.MYBROWSER) return null;
  console.log(`[Cloudflare Browser] Launching edge browser for ${isClaude ? 'Claude' : 'GPT'}...`);
  let browser = null;
  try {
    browser = await puppeteer.launch(env.MYBROWSER);
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    const targetUrl = isClaude ? "https://minitoolai.com/Claude/" : "https://minitoolai.com/gpt-ai/";
    
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
    
    const result = await page.evaluate(async () => {
      let getCft = () => window.cft || document.querySelector('[name="cf-turnstile-response"]')?.value || document.querySelector('textarea[name="g-recaptcha-response"]')?.value || "";
      let cft = getCft();
      let attempts = 0;
      while ((!cft || cft.length < 10 || cft === "error" || cft === "expired") && attempts < 50) {
        await new Promise(r => setTimeout(r, 200));
        cft = getCft();
        ut = window.utoken || ut;
        si = window.safety_identifier || si;
        attempts++;
      }
      return { ut, si, cft };
    });

    const cookies = await page.cookies();
    const sessCookie = cookies.find(c => c.name === "PHPSESSID")?.value || "";

    await browser.close();
    browser = null;

    if (sessCookie && result.ut && result.cft && result.cft.length > 10) {
      console.log(`[Cloudflare Browser] Harvested session: PHPSESSID=${sessCookie.substring(0,8)}..., cft_len=${result.cft.length}`);
      const session = {
        phpsessid: sessCookie,
        utoken: result.ut,
        safety_identifier: result.si,
        cft: result.cft,
        is_claude: isClaude,
        timestamp: Date.now()
      };
      await pushSessionToRedis(session);
      return session;
    }
  } catch (e) {
    console.error("[Cloudflare Browser] Error harvesting token on edge:", e);
    if (browser) {
      try { await browser.close(); } catch(_) {}
    }
  }
  return null;
}

async function getValidSession(env = null, isClaude = false) {
  // 1. Clean expired local sessions
  sessionPool = sessionPool.filter(s => (Date.now() - s.timestamp) < SESSION_TTL);
  const matchingIndex = sessionPool.findIndex(s => isClaude ? (!s.safety_identifier || s.is_claude) : !!s.safety_identifier);
  if (matchingIndex !== -1) {
    return sessionPool.splice(matchingIndex, 1)[0];
  }
  if (sessionPool.length > 0) {
    return sessionPool.pop();
  }
  
  // 2. Fetch from Upstash Redis specific model pool
  const redisKey = isClaude ? 'minitool_claude_sessions' : 'minitool_gpt_sessions';
  try {
    const res = await fetch(`${UPSTASH_URL}/lpop/${redisKey}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
    });
    const data = await res.json();
    if (data && data.result) {
      const s = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
      if (Date.now() - s.timestamp < SESSION_TTL) {
        return s;
      }
    }
  } catch (e) {
    console.error("Upstash pop error:", e);
  }

  // 3. Fallback to generic pool
  try {
    const res = await fetch(`${UPSTASH_URL}/lpop/minitool_sessions`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
    });
    const data = await res.json();
    if (data && data.result) {
      const s = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
      if (Date.now() - s.timestamp < SESSION_TTL) {
        return s;
      }
    }
  } catch (e) {
    console.error("Upstash generic pop error:", e);
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

  const utMatch = html.match(/var\s+utoken\s*=\s*"([^"]+)"/);
  const siMatch = html.match(/var\s+safety_identifier\s*=\s*"([^"]+)"/);
  const cookieHeader = res.headers.get("set-cookie") || "";
  const sessMatch = cookieHeader.match(/PHPSESSID=([^;]+)/);

  if (!utMatch || !siMatch || !sessMatch) {
    throw new Error("Failed to extract tokens from minitoolai.com");
  }

  return {
    phpsessid: sessMatch[1],
    utoken: utMatch[1],
    safety_identifier: siMatch[1],
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
  const baseUrl = isClaude ? "https://minitoolai.com/Claude" : "https://minitoolai.com/gpt-ai";
  const streamPhp = isClaude ? "claude_stream_v1.php" : "chatgpt_stream.php";

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
  headers.set("X-Requested-With", "XMLHttpRequest");
  headers.set("Cookie", `PHPSESSID=${session.phpsessid}; uDevice=notapple`);
  headers.set("X-Forwarded-For", userIP);
  headers.set("X-Real-IP", userIP);
  if(!headers.has("User-Agent")) {
    headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36");
  }

  // POST to get stream token
  const postRes = await fetch(`${baseUrl}/${streamPhp}`, {
    method: "POST",
    headers: headers,
    body: form.toString(),
  });

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
            if (typeof j.delta === "string") {
              content = j.delta;
            } else if (j.delta && typeof j.delta === "object") {
              if (j.delta.text) content = j.delta.text;
              else if (j.delta.content) content = j.delta.content;
            } else if (t === "response.output_text.delta" || t === "response.content_part.delta") {
              content = j.delta;
            } else if (t === "response.reasoning_summary_text.delta") {
              reasoning = j.delta;
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

      // ── Invisible Iframe Turnstile Auto-Solver ──
      if (path === "/minitool/solve") {
        const isClaude = url.searchParams.get("type") === "claude";
        const targetUrl = isClaude ? "https://minitoolai.com/Claude/" : "https://minitoolai.com/gpt-ai/";
        const res = await fetch(targetUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Cookie": "uDevice=notapple"
          }
        });
        let html = await res.text();
        const cookieHeader = res.headers.get("set-cookie") || "";
        const sessMatch = cookieHeader.match(/PHPSESSID=([^;]+)/);
        const phpSess = sessMatch ? sessMatch[1] : "";

        const utMatch = html.match(/var\s+utoken\s*=\s*['"]([^'"]+)['"]/);
        const siMatch = html.match(/var\s+safety_identifier\s*=\s*['"]([^'"]+)['"]/);
        const uToken = utMatch ? utMatch[1] : "";
        const sIdent = siMatch ? siMatch[1] : "";

        const injectedScript = `
        <script>
          (function() {
            var phpSess = "${phpSess}";
            var uToken = "${uToken}";
            var sIdent = "${sIdent}";
            var isClaude = ${isClaude};

            function tryRenderTurnstile() {
              if (window.turnstile && typeof window.turnstile.render === "function") {
                try {
                  window.turnstile.render("#turnstile-widget", {
                    sitekey: "0x4AAAAAABjI2cBIeVpBYEFi",
                    callback: function(token) { window.cft = token; },
                    "error-callback": function() { window.cft = "error"; },
                    "expired-callback": function() { window.cft = "expired"; }
                  });
                } catch(e) {}
              }
            }

            tryRenderTurnstile();
            var t1 = setInterval(tryRenderTurnstile, 500);

            var timer = setInterval(function() {
              var cftToken = window.cft || (document.querySelector('[name="cf-turnstile-response"]') && document.querySelector('[name="cf-turnstile-response"]').value);
              if (cftToken && cftToken.length > 20 && !window.__autoActivated) {
                window.__autoActivated = true;
                clearInterval(timer);
                clearInterval(t1);
                fetch("https://ultimate-ai-worker.haruyhari930.workers.dev/minitool/activate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ cft: cftToken, phpsessid: phpSess, utoken: uToken, safety_identifier: sIdent, is_claude: isClaude })
                }).then(function(r) { return r.json(); }).then(function(data) {
                  try { window.parent.postMessage({ type: "MINITOOL_ACTIVATED", ok: true, isClaude: isClaude }, "*"); } catch(e) {}
                });
              }
            }, 300);
          })();
        </script>
        </body>`;

        html = html.replace(/<base[^>]*>/gi, "");
        html = html.replace("<head>", `<head><base href="${targetUrl}">`);
        html = html.replace("</body>", injectedScript);
        return new Response(html, { headers: { ...CORS, "Content-Type": "text/html; charset=utf-8" } });
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

        // Build session
        let session;
        if (data.phpsessid && data.utoken) {
          session = {
            phpsessid: data.phpsessid,
            utoken: data.utoken,
            safety_identifier: data.safety_identifier || "",
            cft: data.cft,
            is_claude: data.is_claude || !data.safety_identifier,
            timestamp: Date.now()
          };
        } else {
          const tokens = await fetchSessionFromMiniTool(request);
          session = { ...tokens, cft: data.cft, is_claude: data.is_claude || !tokens.safety_identifier, timestamp: Date.now() };
        }

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
        const sGpt = await harvestTokenViaBrowser(env, false);
        const sClaude = await harvestTokenViaBrowser(env, true);
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
        const isClaude = selectModel.includes("claude") || model.includes("claude");
        
        if (!model.includes("minitool") && !MODEL_MAP[model]) {
          return new Response(JSON.stringify({ error: "Not a MiniToolAI model" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
        }

        let sseRes = null;
        let resolvedModel = selectModel;
        let session = null;

        // Layer 1: Try up to 3 session tokens from Redis pool
        for (let attempt = 0; attempt < 3; attempt++) {
          session = await getValidSession(env, isClaude);
          if (!session) break;

          try {
            const res = await proxyChat(session, model, body.messages || [], body.temperature, request);
            if (res && res.sseRes && res.sseRes.ok) {
              sseRes = res.sseRes;
              resolvedModel = res.selectModel;
              break;
            }
          } catch (e) {
            console.warn(`[MiniTool Retry] Session attempt ${attempt + 1} failed: ${e.message}`);
          }
        }

        // Layer 2: On-Demand Edge Browser Harvest if Redis sessions failed or pool was empty
        if (!sseRes && env && env.MYBROWSER) {
          console.log(`[MiniTool Self-Healing] Redis sessions exhausted/empty. Triggering on-demand edge harvest for ${isClaude ? 'Claude' : 'GPT'}...`);
          try {
            session = await harvestTokenViaBrowser(env, isClaude);
            if (session) {
              const res = await proxyChat(session, model, body.messages || [], body.temperature, request);
              if (res && res.sseRes && res.sseRes.ok) {
                sseRes = res.sseRes;
                resolvedModel = res.selectModel;
              }
            }
          } catch (e) {
            console.error(`[MiniTool Self-Healing] On-demand edge harvest failed: ${e.message}`);
          }
        }

        // Layer 3: Trigger background harvest to keep Redis pool filled for future requests
        if (env && env.MYBROWSER && ctx && ctx.waitUntil) {
          ctx.waitUntil(harvestTokenViaBrowser(env, isClaude));
        }

        if (!sseRes || !sseRes.ok) {
          return new Response(JSON.stringify({
            error: "No active MiniTool session available after retries.",
          }), { status: 401, headers: { ...CORS, "Content-Type": "application/json" } });
        }

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

      return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...CORS, "Content-Type": "application/json" } });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
    }
  },
};

export { harvestTokenViaBrowser };
