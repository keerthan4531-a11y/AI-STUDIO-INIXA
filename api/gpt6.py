import json
import asyncio
import sys
from typing import AsyncGenerator
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import g4f
from g4f.client import AsyncClient

app = FastAPI(title="GPT-6 Astra High-Speed Serverless API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ROUTES = [
    ("Perplexity", g4f.Provider.Perplexity, "gpt6_astra"),
    ("Cloudflare", g4f.Provider.Cloudflare, "gpt-6-astra"),
    ("Yqcloud", g4f.Provider.Yqcloud, "gpt-4"),
]

async def stream_gpt6_astra(prompt: str, messages: list = None) -> AsyncGenerator[str, None]:
    if not messages:
        messages = [{"role": "user", "content": prompt}]
    
    last_err = ""
    worked = False

    for name, provider, model_name in ROUTES:
        try:
            client = AsyncClient(provider=provider)
            res = client.chat.completions.create(
                model=model_name,
                messages=messages,
                stream=True
            )

            buffer = ""
            chunks = []
            failed_route = False

            async for chunk in res:
                delta = chunk.choices[0].delta.content or ""
                if isinstance(delta, str) and delta:
                    buffer += delta
                    # Check for sign-in or rate-limit blocks
                    if "sign up and repeat" in buffer.lower() or "sign in to continue" in buffer.lower():
                        failed_route = True
                        break
                    
                    # Output both Next.js inixa format and OpenAI format for maximum compatibility
                    line = f"data: {json.dumps({'type': 'response.output_text.delta', 'delta': delta, 'choices': [{'delta': {'content': delta}}]})}\n\n"
                    chunks.append(line)
                    yield line

            if not failed_route and buffer.strip():
                worked = True
                break
            else:
                last_err = f"{name} returned empty or blocked response"
        except Exception as e:
            last_err = f"{name} error: {str(e)}"
            continue

    if not worked:
        err_msg = f"\n\n❌ [GPT-6 Astra Error]: All routes exhausted. Last reason: {last_err or 'Unknown'}"
        yield f"data: {json.dumps({'type': 'response.output_text.delta', 'delta': err_msg, 'choices': [{'delta': {'content': err_msg}}]})}\n\n"

    yield "data: [DONE]\n\n"

async def generate_gpt6_non_stream(prompt: str, messages: list = None) -> dict:
    if not messages:
        messages = [{"role": "user", "content": prompt}]
    
    last_err = ""
    for name, provider, model_name in ROUTES:
        try:
            client = AsyncClient(provider=provider)
            res = client.chat.completions.create(
                model=model_name,
                messages=messages,
                stream=True
            )
            chunks = []
            async for chunk in res:
                delta = chunk.choices[0].delta.content or ""
                if isinstance(delta, str) and delta:
                    chunks.append(delta)
            
            full = "".join(chunks).strip()
            if full and "sign up and repeat" not in full.lower() and "sign in to continue" not in full.lower():
                return {
                    "id": f"chatcmpl-gpt6-astra-{int(asyncio.get_event_loop().time() * 1000)}",
                    "object": "chat.completion",
                    "model": "gpt-6-astra",
                    "provider": name,
                    "reply": full,
                    "choices": [{
                        "index": 0,
                        "message": {"role": "assistant", "content": full},
                        "finish_reason": "stop"
                    }]
                }
        except Exception as e:
            last_err = str(e)
            continue
    
    raise Exception(f"All routes exhausted for GPT-6 Astra: {last_err}")

@app.get("/api/gpt6")
@app.get("/api/gpt6/health")
async def health():
    return {
        "status": "ok",
        "model": "GPT-6 Astra",
        "description": "OpenAI GPT-6 Astra — Free Access Without API Key",
        "routes": ["Perplexity (gpt6_astra)", "Cloudflare (gpt-6-astra)", "Yqcloud (gpt-4)"]
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
