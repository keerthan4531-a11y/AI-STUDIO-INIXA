import json
import uuid
import re
import time
import os
import sys
import pathlib
import httpx
from curl_cffi import requests

# Crucial for Vercel Serverless environment where /home is read-only
if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME") or not sys.platform.startswith("win"):
    os.environ["HOME"] = "/tmp"
    os.environ["TMPDIR"] = "/tmp"
    try:
        pathlib.Path.home = staticmethod(lambda: pathlib.Path("/tmp"))
    except Exception:
        pass

from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

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

# Models extracted from Perplexity Android reverse engineering (lordmacu/perplexity-proxy)
MODELS_MAP = {
    # Perplexity Native
    "default": "turbo",
    "turbo": "turbo",
    "sonar": "turbo",
    "pplx-turbo": "turbo",
    "experimental": "experimental",
    "pplx_pro": "pplx_pro",
    "research": "pplx_alpha",
    "labs": "pplx_beta",
    
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

def stream_perplexity_generator(query: str, model_name: str):
    cleaned_model = model_name.lower().replace("pplx/", "").replace("perplexity/", "").strip()
    target_model = MODELS_MAP.get(cleaned_model, cleaned_model or "turbo")
    
    session = _build_session()
    last_err = ""
    worked = False

    # Attempt strategies: 1) With search sources, 2) Writing mode (empty sources)
    strategies = [
        {"sources": ["web"]},
        {"sources": []},
    ]

    for strat in strategies:
        sources_param = strat["sources"]
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
                "send_back_text_in_streaming_api": True,
                "supported_block_use_cases": ["ANSWER", "SOURCES", "IMAGE", "VIDEO"],
                "sources": sources_param,
                "model_preference": target_model,
            }
        }

        try:
            r = session.post(
                API_URL,
                json=body,
                headers=_android_headers(device_id),
                timeout=30,
                stream=True
            )
            if r.status_code != 200:
                last_err = f"HTTP {r.status_code}"
                continue

            buf = ""
            citations = []
            accumulated = ""
            blocked = False
            final_data = None

            for chunk in r.iter_content(chunk_size=None):
                if not chunk:
                    continue
                buf += chunk.decode("utf-8", errors="replace")

                while "\r\n\r\n" in buf:
                    seg, buf = buf.split("\r\n\r\n", 1)
                    ev_type, data_str = None, ""
                    for line in seg.split("\r\n"):
                        if line.startswith("event:"):
                            ev_type = line[6:].strip()
                        elif line.startswith("data:"):
                            data_str = line[5:].strip()

                    if ev_type != "message" or not data_str:
                        continue

                    try:
                        data = json.loads(data_str)
                    except Exception:
                        continue

                    if data.get("final_sse_message"):
                        final_data = data
                        for block in data.get("blocks", []):
                            if "web_result_block" in block:
                                for item in block["web_result_block"].get("web_results", []):
                                    u = item.get("url")
                                    if u and u not in citations:
                                        citations.append(u)
                        continue

                    for block in data.get("blocks", []):
                        usage = block.get("intended_usage", "")
                        if "ask_text_0_markdown" in usage and "markdown_block" in block:
                            delta = "".join(c for c in block["markdown_block"].get("chunks", []) if isinstance(c, str))
                            if delta:
                                is_sign_in = any(s in delta.lower() for s in [
                                    "sign up and repeat", "sign in to continue", "inscrivez-vous", 
                                    "daftar dan ulangi", "inscríbete y repite", "melde dich an"
                                ])
                                if is_sign_in:
                                    blocked = True
                                    break
                                accumulated += delta
                                yield f"data: {json.dumps({'type': 'response.output_text.delta', 'delta': delta})}\n\n"

                    if blocked:
                        break
                if blocked:
                    break

            if not accumulated and final_data and not blocked:
                for block in final_data.get("blocks", []):
                    usage = block.get("intended_usage", "")
                    if "markdown_block" in block:
                        mb = block["markdown_block"]
                        block_text = "".join(c for c in mb.get("chunks", []) if isinstance(c, str))
                        if ("ask_text_0_markdown" in usage or "ask_text" in usage) and block_text:
                            is_sign_in = any(s in block_text.lower() for s in [
                                "sign up and repeat", "sign in to continue", "inscrivez-vous", 
                                "daftar dan ulangi", "inscríbete y repite", "melde dich an"
                            ])
                            if is_sign_in:
                                blocked = True
                            else:
                                accumulated = block_text
                                yield f"data: {json.dumps({'type': 'response.output_text.delta', 'delta': block_text})}\n\n"
                                break

            if blocked or any(s in accumulated.lower() for s in ["sign up and repeat", "sign in to continue", "inscrivez-vous", "daftar dan ulangi"]):
                last_err = 'Perplexity requires sign-in for this specific query ("Sign up and repeat your request"). Try rephrasing directly.'
                accumulated = ""
                continue

            if accumulated.strip():
                worked = True
                if citations:
                    yield f"data: {json.dumps({'type': 'citations', 'citations': citations})}\n\n"
                yield "data: [DONE]\n\n"
                return

        except Exception as e:
            last_err = str(e)
            time.sleep(0.3)

    if not worked:
        err_delta = f"\n\n❌ [Perplexity Error - {target_model}]: {last_err or 'Perplexity engine temporarily busy. No fallback models will be substituted.'}"
        yield f"data: {json.dumps({'type': 'response.output_text.delta', 'delta': err_delta})}\n\n"
        yield "data: [DONE]\n\n"

@app.get("/api/pplx")
@app.get("/api/pplx/health")
async def health():
    return {"status": "ok", "provider": "Perplexity Android Native (curl_cffi)", "models": list(MODELS_MAP.keys())}

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
        return StreamingResponse(
            stream_perplexity_generator(query, model),
            media_type="text/event-stream",
            headers={
                "Content-Type": "text/event-stream; charset=utf-8",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*"
            }
        )
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Perplexity API Error: {str(e)}"})

# Entrypoint for ASGI / Vercel
handler = app
