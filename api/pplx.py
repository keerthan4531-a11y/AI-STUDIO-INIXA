import json
import uuid
import re
import time
import os
import sys

import pathlib
# Crucial for Vercel Serverless environment where /home is read-only
if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME") or not sys.platform.startswith("win"):
    os.environ["HOME"] = "/tmp"
    os.environ["TMPDIR"] = "/tmp"
    try:
        pathlib.Path.home = staticmethod(lambda: pathlib.Path("/tmp"))
    except Exception:
        pass

try:
    import g4f.config
    import g4f.cookies
    g4f.config.CONFIG_DIR = pathlib.Path("/tmp/.g4f")
    g4f.config.COOKIES_DIR = pathlib.Path("/tmp/.g4f/cookies")
    g4f.cookies.CookiesConfig.cookies_dir = "/tmp/.g4f/cookies"
except Exception:
    pass

from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from curl_cffi import requests

app = FastAPI(title="Perplexity AI Serverless API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_URL = "https://www.perplexity.ai"
API_URL = f"{BASE_URL}/rest/sse/perplexity_ask?version=2.17&source=android"

MODELS_MAP = {
    # Perplexity Native
    "default": "turbo",
    "turbo": "turbo",
    "pplx_pro": "pplx_pro",
    "experimental": "experimental",
    "sonar": "turbo",
    
    # OpenAI
    "gpt6_astra": "gpt6_astra",
    "gpt-6-astra": "gpt6_astra",
    "gpt6": "gpt6_astra",
    "gpt56_sol": "gpt56_sol",
    "gpt-5.6-sol": "gpt56_sol",
    "gpt56_terra": "gpt56_terra",
    
    # Anthropic
    "sonnet5": "claude50sonnet",
    "claude-sonnet-5": "claude50sonnet",
    "claude50sonnet": "claude50sonnet",
    "opus5": "claude50opus",
    "claude-opus-5": "claude50opus",
    "claude50opus": "claude50opus",
    
    # Google
    "gemini31": "gemini31pro_high",
    "gemini-3.1": "gemini31pro_high",
    "gemini31pro_high": "gemini31pro_high",
    
    # xAI
    "grok45": "grok45low",
    "grok-4.5": "grok45low",
    "grok45low": "grok45low",
    
    # Kimi / Moonshot
    "kimi3": "kimik3",
    "kimik3": "kimik3",
    
    # GLM & Open
    "glm52": "glm_5_2",
    "glm_5_2": "glm_5_2",
    "nemotron": "nv_nemotron_3_ultra",
}

def _build_session():
    s = requests.Session()
    s.impersonate = "chrome120"
    return s

import os

def _android_headers(device_id: str) -> dict:
    headers = {
        "X-App-Version":    "2.95.0",
        "X-Client-Version": "2.95.0",
        "X-Client-Name":    "Perplexity-Android",
        "X-Client-Env":     "production",
        "X-App-ApiClient":  "android",
        "X-App-ApiVersion": "2.17",
        "X-Device-ID":      device_id,
        "Accept-Language":  "es-ES",
        "Content-Type":     "application/json",
        "Accept":           "text/event-stream",
        "User-Agent":       "okhttp/4.12.0",
    }
    token = os.environ.get("PERPLEXITY_SESSION_TOKEN") or os.environ.get("PERPLEXITY_COOKIE")
    if token:
        clean_token = token.replace("__Secure-next-auth.session-token=", "").replace("next-auth.session-token=", "").strip()
        headers["Cookie"] = f"__Secure-next-auth.session-token={clean_token}; next-auth.session-token={clean_token}"
    return headers

def _parse_sse(raw: bytes):
    text = raw.decode("utf-8", errors="replace")
    events = []
    for chunk in re.split(r"\r\n\r\n", text):
        ev = {}
        for line in chunk.split("\r\n"):
            if line.startswith("event:"):
                ev["type"] = line[6:].strip()
            elif line.startswith("data:"):
                ev["data"] = line[5:].strip()
        if "type" in ev and "data" in ev:
            events.append(ev)
    return events

def _extract_result(final_data):
    text = ""
    sources = []
    for block in final_data.get("blocks", []):
        usage = block.get("intended_usage", "")
        if "markdown_block" in block:
            mb = block["markdown_block"]
            block_text = "".join(c for c in mb.get("chunks", []) if isinstance(c, str))
            if "ask_text_0_markdown" in usage and block_text:
                text = block_text
            elif not text and block_text and "ask_text" in usage:
                text = block_text
        elif "web_result_block" in block:
            for src in block["web_result_block"].get("web_results", []):
                url = src.get("url", "")
                if url and url not in sources:
                    sources.append(url)
    return text.strip(), sources

def stream_perplexity_generator(query: str, model_name: str):
    cleaned_model = model_name.lower().replace("pplx/", "").replace("perplexity/", "").strip()
    target_model = MODELS_MAP.get(cleaned_model, cleaned_model or "turbo")
    
    session = _build_session()
    last_err = ""

    for attempt in range(1, 3):
        device_id = str(uuid.uuid4())
        body = {
            "query_str": query,
            "params": {
                "source": "android",
                "version": "2.17",
                "frontend_uuid": str(uuid.uuid4()),
                "last_backend_uuid": None,
                "android_device_id": device_id,
                "mode": "concise",
                "is_related_query": False,
                "is_voice_to_voice": False,
                "timezone": "America/Bogota",
                "language": "es",
                "is_incognito": False,
                "use_schematized_api": True,
                "send_back_text_in_streaming_api": False,
                "supported_block_use_cases": ["ANSWER", "SOURCES", "IMAGE", "VIDEO"],
                "sources": ["web"],
                "model_preference": target_model,
            }
        }

        try:
            r = session.post(API_URL, json=body, headers=_android_headers(device_id), timeout=45)
            r.raise_for_status()

            final_data = None
            for ev in _parse_sse(r.content):
                if ev["type"] == "message":
                    try:
                        d = json.loads(ev["data"])
                        if d.get("final_sse_message"):
                            final_data = d
                            break
                    except:
                        pass

            if final_data:
                text, sources = _extract_result(final_data)
                if "Sign up and repeat your request" in text or "Sign in to continue" in text:
                    last_err = f"Sign in required by Perplexity for model {target_model}."
                    time.sleep(0.5)
                    continue

                if text:
                    # 1. Send citations if available
                    if sources:
                        yield f"data: {json.dumps({'type': 'citations', 'citations': sources})}\n\n"

                    # 2. Stream out text smoothly in words/chunks
                    words = re.split(r'(\s+)', text)
                    chunk_acc = ""
                    for w in words:
                        chunk_acc += w
                        if len(chunk_acc) >= 4 or w.endswith(('\n', '.', '!', '?', ',')):
                            yield f"data: {json.dumps({'type': 'response.output_text.delta', 'delta': chunk_acc})}\n\n"
                            chunk_acc = ""
                    if chunk_acc:
                        yield f"data: {json.dumps({'type': 'response.output_text.delta', 'delta': chunk_acc})}\n\n"

                    yield "data: [DONE]\n\n"
                    return
        except Exception as e:
            last_err = str(e)
            time.sleep(0.5)

    # Secondary fallback for GPT-6 Astra via g4f (Perplexity / Cloudflare / Yqcloud)
    try:
        import g4f
        from g4f.client import Client
        fallback_providers = [
            ("Perplexity", g4f.Provider.Perplexity, "gpt6_astra"),
            ("Cloudflare", g4f.Provider.Cloudflare, "gpt-6-astra"),
            ("Yqcloud", g4f.Provider.Yqcloud, "gpt-4"),
        ]
        for p_name, prov, m_name in fallback_providers:
            try:
                c = Client(provider=prov)
                resp = c.chat.completions.create(
                    model=m_name if "gpt6" in target_model else target_model,
                    messages=[{"role": "user", "content": query}]
                )
                txt = resp.choices[0].message.content or ""
                if txt and "sign up and repeat" not in txt.lower() and "sign in to continue" not in txt.lower():
                    words = re.split(r'(\s+)', txt)
                    chunk_acc = ""
                    for w in words:
                        chunk_acc += w
                        if len(chunk_acc) >= 4 or w.endswith(('\n', '.', '!', '?', ',')):
                            yield f"data: {json.dumps({'type': 'response.output_text.delta', 'delta': chunk_acc})}\n\n"
                            chunk_acc = ""
                    if chunk_acc:
                        yield f"data: {json.dumps({'type': 'response.output_text.delta', 'delta': chunk_acc})}\n\n"
                    yield "data: [DONE]\n\n"
                    return
            except Exception as e:
                last_err = f"{p_name} error: {e}"
                continue
    except Exception as e:
        last_err = f"g4f fallback error: {e}"

    # If attempts exhausted without valid response, yield error
    err_delta = f"\n\n❌ [Perplexity Error - {target_model}]: {last_err or 'No valid response returned from Perplexity engine.'}"
    yield f"data: {json.dumps({'type': 'response.output_text.delta', 'delta': err_delta})}\n\n"
    yield "data: [DONE]\n\n"

@app.get("/api/pplx")
@app.get("/api/pplx/health")
async def health():
    return {"status": "ok", "provider": "Perplexity Android Native", "models": list(MODELS_MAP.keys())}

@app.post("/api/pplx")
async def chat_handler(request: Request):
    try:
        body = await request.json()
        query = body.get("prompt") or body.get("query") or ""
        messages = body.get("messages") or []
        if not query and messages:
            last_msg = messages[-1]
            query = last_msg.get("content", "") if isinstance(last_msg, dict) else str(last_msg)
        
        if not query:
            return JSONResponse(status_code=400, content={"error": "Prompt or query is required"})

        model = body.get("model", "turbo")
        return StreamingResponse(stream_perplexity_generator(query, model), media_type="text/event-stream")
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Perplexity API Error: {str(e)}"})

# Entrypoint for ASGI / Vercel
handler = app
