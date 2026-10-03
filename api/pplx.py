import json
import uuid
import re
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
    return {
        "X-App-Version":    "2.95.0",
        "X-Client-Version": "2.95.0",
        "X-Client-Name":    "Perplexity-Android",
        "X-Client-Env":     "production",
        "X-App-ApiClient":  "android",
        "X-App-ApiVersion": "2.17",
        "X-Device-ID":      device_id,
        "Accept-Language":  "en-US,en;q=0.9",
        "Content-Type":     "application/json",
        "Accept":           "text/event-stream",
        "User-Agent":       "okhttp/4.12.0",
    }

def stream_perplexity_generator(query: str, model_name: str):
    device_id = str(uuid.uuid4())
    cleaned_model = model_name.lower().replace("pplx/", "").replace("perplexity/", "").strip()
    target_model = MODELS_MAP.get(cleaned_model, cleaned_model or "turbo")
    
    session = _build_session()
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
            "timezone": "America/New_York",
            "language": "en",
            "is_incognito": False,
            "use_schematized_api": True,
            "send_back_text_in_streaming_api": True,
            "supported_block_use_cases": ["ANSWER", "SOURCES", "IMAGE", "VIDEO"],
            "sources": ["web"],
            "model_preference": target_model,
        }
    }

    r = session.post(API_URL, json=body, headers=_android_headers(device_id), timeout=120, stream=True)
    r.raise_for_status()

    buf = ""
    accumulated_length = 0
    sources_sent = False

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

            # Extract source links
            if not sources_sent and data.get("blocks"):
                found_sources = []
                for b in data.get("blocks", []):
                    if b.get("web_result_block") and b["web_result_block"].get("web_results"):
                        for item in b["web_result_block"]["web_results"]:
                            url = item.get("url")
                            if url and url not in found_sources:
                                found_sources.append(url)
                if found_sources:
                    sources_sent = True
                    yield f"data: {json.dumps({'type': 'citations', 'citations': found_sources})}\n\n"

            # Check for error / authwall
            upsell = data.get("upsell_information")
            if upsell and upsell.get("title") and "Sign in" in upsell.get("title"):
                yield f"data: {json.dumps({'type': 'response.output_text.delta', 'delta': f'\n\n❌ [Perplexity Error - {target_model}]: Sign in required for this query.'})}\n\n"
                return

            for block in data.get("blocks", []):
                usage = block.get("intended_usage", "")
                if "ask_text_0_markdown" in usage and "markdown_block" in block:
                    delta = "".join(
                        c for c in block["markdown_block"].get("chunks", [])
                        if isinstance(c, str)
                    )
                    if delta:
                        yield f"data: {json.dumps({'type': 'response.output_text.delta', 'delta': delta})}\n\n"

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
