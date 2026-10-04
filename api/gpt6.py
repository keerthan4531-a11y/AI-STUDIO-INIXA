import json
import asyncio
import sys
import os
import re
import tempfile
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

from typing import AsyncGenerator
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import g4f
from g4f.client import Client, AsyncClient

app = FastAPI(title="GPT-6 Astra Strict Serverless API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# STRICT: Only genuine GPT-6 Astra routes are permitted. NO generic fallback models!
STRICT_GPT6_ROUTES = [
    ("Cloudflare", g4f.Provider.Cloudflare, "gpt-6-astra"),
    ("Perplexity", g4f.Provider.Perplexity, "gpt6_astra"),
]

def _sync_fetch(provider, model_name: str, messages: list) -> str:
    client = Client(provider=provider)
    resp = client.chat.completions.create(
        model=model_name,
        messages=messages
    )
    return resp.choices[0].message.content or ""

async def stream_gpt6_astra(prompt: str, messages: list = None) -> AsyncGenerator[str, None]:
    if not messages:
        messages = [{"role": "user", "content": prompt}]
    
    last_err = ""
    worked = False

    for name, provider, model_name in STRICT_GPT6_ROUTES:
        try:
            # 1. Try sync fetch in thread for maximum stability with Cloudflare / Perplexity
            text = await asyncio.to_thread(_sync_fetch, provider, model_name, messages)
            text = text.strip()

            if text and "sign up and repeat" not in text.lower() and "sign in to continue" not in text.lower():
                worked = True
                # Stream the words to the client
                words = re.split(r'(\s+)', text)
                chunk_acc = ""
                for w in words:
                    chunk_acc += w
                    if len(chunk_acc) >= 4 or w.endswith(('\n', '.', '!', '?', ',')):
                        yield f"data: {json.dumps({'type': 'response.output_text.delta', 'delta': chunk_acc, 'choices': [{'delta': {'content': chunk_acc}}]})}\n\n"
                        chunk_acc = ""
                if chunk_acc:
                    yield f"data: {json.dumps({'type': 'response.output_text.delta', 'delta': chunk_acc, 'choices': [{'delta': {'content': chunk_acc}}]})}\n\n"
                break
            else:
                last_err = f"{name} returned blocked or empty response: {text[:60]}"
        except Exception as e:
            last_err = f"{name} failed: {str(e)}"
            continue

    if not worked:
        err_msg = f"\n\n❌ [GPT-6 Astra Strict Error]: All genuine GPT-6 Astra routes unavailable. ({last_err or 'Unknown error'}). No other fallback models will be used."
        yield f"data: {json.dumps({'type': 'response.output_text.delta', 'delta': err_msg, 'choices': [{'delta': {'content': err_msg}}]})}\n\n"

    yield "data: [DONE]\n\n"

async def generate_gpt6_non_stream(prompt: str, messages: list = None) -> dict:
    if not messages:
        messages = [{"role": "user", "content": prompt}]
    
    last_err = ""
    for name, provider, model_name in STRICT_GPT6_ROUTES:
        try:
            text = await asyncio.to_thread(_sync_fetch, provider, model_name, messages)
            text = text.strip()
            if text and "sign up and repeat" not in text.lower() and "sign in to continue" not in text.lower():
                return {
                    "id": f"chatcmpl-gpt6-astra-{int(asyncio.get_event_loop().time() * 1000)}",
                    "object": "chat.completion",
                    "model": "gpt-6-astra",
                    "provider": name,
                    "reply": text,
                    "choices": [{
                        "index": 0,
                        "message": {"role": "assistant", "content": text},
                        "finish_reason": "stop"
                    }]
                }
            else:
                last_err = f"{name} returned empty or blocked response"
        except Exception as e:
            last_err = str(e)
            continue
    
    raise Exception(f"All genuine GPT-6 Astra routes unavailable: {last_err}")

@app.get("/api/gpt6")
@app.get("/api/gpt6/health")
async def health():
    return {
        "status": "ok",
        "model": "GPT-6 Astra",
        "strict_mode": True,
        "description": "OpenAI GPT-6 Astra — Strict verified GPT-6 Astra routes only",
        "routes": ["Cloudflare (gpt-6-astra)", "Perplexity (gpt6_astra)"]
    }

@app.post("/api/gpt6")
async def chat_handler(request: Request):
    try:
        body = await request.json()
        prompt = body.get("prompt") or body.get("query") or ""
        messages = body.get("messages") or []
        stream = body.get("stream", True)

        if not prompt and messages:
            last_msg = messages[-1]
            prompt = last_msg.get("content", "") if isinstance(last_msg, dict) else str(last_msg)

        if not prompt and not messages:
            return JSONResponse(status_code=400, content={"error": "Missing prompt or messages"})

        if stream:
            return StreamingResponse(
                stream_gpt6_astra(prompt, messages),
                media_type="text/event-stream",
                headers={
                    "Content-Type": "text/event-stream; charset=utf-8",
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "Access-Control-Allow-Origin": "*"
                }
            )
        else:
            result = await generate_gpt6_non_stream(prompt, messages)
            return JSONResponse(status_code=200, content=result)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"GPT-6 Astra error: {str(e)}"})

# ASGI Entrypoint for Vercel
handler = app
