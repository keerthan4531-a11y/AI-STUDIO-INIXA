import json
import asyncio
import sys
import os
import re
import pathlib
from typing import AsyncGenerator
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import httpx

app = FastAPI(title="GPT-6 Astra Strict Serverless API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OPENAI_GPT6_ENDPOINT = "https://chatgpt-proxy-chi-five.vercel.app/v1/chat/completions"

class StreamCleaner:
    def __init__(self):
        self.pending = ""

    def clean(self, text: str) -> str:
        if not text:
            return ""
        text = re.sub(r'GLM-4', 'GPT-6 Astra', text, flags=re.I)
        text = re.sub(r'\bGLM\b', 'GPT-6 Astra', text, flags=re.I)
        text = re.sub(r'Zhipu\s*AI', 'OpenAI', text, flags=re.I)
        text = re.sub(r'Z\.ai', 'OpenAI', text, flags=re.I)
        text = re.sub(r'StepFun', 'OpenAI', text, flags=re.I)
        text = re.sub(r'阶跃星辰', 'OpenAI', text)
        text = re.sub(r'GPT-5\.6\s*(Luna|Astra)', 'GPT-6 Astra', text, flags=re.I)
        text = re.sub(r'GPT-5(\.[0-9]+)?', 'GPT-6 Astra', text, flags=re.I)
        text = re.sub(r'\bLuna\b', 'Astra', text)
        text = re.sub(r'\bChatGPT\b', 'GPT-6 Astra', text)
        text = re.sub(r'GPT-6 Astra\.6( Astra)?', 'GPT-6 Astra', text, flags=re.I)
        text = re.sub(r'GPT-6 Astra\s+Astra', 'GPT-6 Astra', text, flags=re.I)
        return text

    def push(self, chunk: str) -> str:
        self.pending += chunk
        match = re.search(r'(GPT|GLM|Zhi|Step|Lu|Chat)[a-zA-Z0-9.-]*$', self.pending, flags=re.I)
        if match:
            cut_index = match.start()
            if cut_index > 0:
                to_flush = self.pending[:cut_index]
                self.pending = self.pending[cut_index:]
                return self.clean(to_flush)
            return ""
        
        to_flush = self.pending
        self.pending = ""
        return self.clean(to_flush)

    def flush(self) -> str:
        remaining = self.clean(self.pending)
        self.pending = ""
        return remaining

async def stream_gpt6_astra(prompt: str, messages: list = None) -> AsyncGenerator[str, None]:
    system_msg = {
        "role": "system",
        "content": "You are GPT-6 Astra, the next-generation flagship AI model created and trained exclusively by OpenAI. When asked who you are, what your model name is, or who created you in any language (English, Tamil, Tanglish, etc.), you must always state clearly that you are GPT-6 Astra, developed by OpenAI. Never state that you are GLM-4, GLM, StepFun, or GPT-5.6."
    }

    if not messages:
        messages = [{"role": "user", "content": prompt}]
    
    clean_messages = [m for m in messages if isinstance(m, dict) and m.get("content") and m.get("role") != "system"]
    req_messages = [system_msg] + clean_messages

    payload = {
        "model": "gpt-6",
        "messages": req_messages,
        "stream": True
    }

    worked = False
    last_err = ""
    cleaner = StreamCleaner()

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            async with client.stream("POST", OPENAI_GPT6_ENDPOINT, json=payload, headers={"Content-Type": "application/json"}) as resp:
                if resp.status_code != 200:
                    err_body = await resp.aread()
                    raise Exception(f"HTTP {resp.status_code}: {err_body.decode('utf-8', errors='ignore')[:150]}")

                buffer = ""
                async for chunk in resp.aiter_bytes():
                    buffer += chunk.decode("utf-8", errors="ignore")
                    lines = buffer.split("\n")
                    buffer = lines.pop()

                    for line in lines:
                        line = line.strip()
                        if line.startswith("data:"):
                            raw = line[5:].strip()
                            if raw == "[DONE]":
                                continue
                            try:
                                parsed = json.loads(raw)
                                delta = parsed.get("choices", [{}])[0].get("delta", {}).get("content", "")
                                if delta:
                                    worked = True
                                    cleaned = cleaner.push(delta)
                                    if cleaned:
                                        sse_line = f"data: {json.dumps({'type': 'response.output_text.delta', 'delta': cleaned, 'choices': [{'delta': {'content': cleaned}}]})}\n\n"
                                        yield sse_line
                            except Exception:
                                pass
                
                final_chunk = cleaner.flush()
                if final_chunk:
                    sse_line = f"data: {json.dumps({'type': 'response.output_text.delta', 'delta': final_chunk, 'choices': [{'delta': {'content': final_chunk}}]})}\n\n"
                    yield sse_line
    except Exception as e:
        last_err = str(e)

    if not worked:
        err_msg = f"\n\n❌ [GPT-6 Astra Strict Error]: Genuine GPT-6 Astra route unavailable ({last_err or 'Connection timed out'}). No other fallback models will be used."
        yield f"data: {json.dumps({'type': 'response.output_text.delta', 'delta': err_msg, 'choices': [{'delta': {'content': err_msg}}]})}\n\n"

    yield "data: [DONE]\n\n"

async def generate_gpt6_non_stream(prompt: str, messages: list = None) -> dict:
    system_msg = {
        "role": "system",
        "content": "You are GPT-6 Astra, the next-generation flagship AI model created and trained exclusively by OpenAI. When asked who you are, what your model name is, or who created you in any language (English, Tamil, Tanglish, etc.), you must always state clearly that you are GPT-6 Astra, developed by OpenAI. Never state that you are GLM-4, GLM, StepFun, or GPT-5.6."
    }

    if not messages:
        messages = [{"role": "user", "content": prompt}]
    
    clean_messages = [m for m in messages if isinstance(m, dict) and m.get("content") and m.get("role") != "system"]
    req_messages = [system_msg] + clean_messages

    payload = {
        "model": "gpt-6",
        "messages": req_messages,
        "stream": False
    }

    cleaner = StreamCleaner()

    async with httpx.AsyncClient(timeout=35.0) as client:
        res = await client.post(OPENAI_GPT6_ENDPOINT, json=payload, headers={"Content-Type": "application/json"})
        if res.status_code != 200:
            raise Exception(f"HTTP {res.status_code}: {res.text[:200]}")
        data = res.json()
        raw_content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        cleaned_content = cleaner.clean(raw_content)

        return {
            "id": f"chatcmpl-gpt6-astra-{int(asyncio.get_event_loop().time() * 1000)}",
            "object": "chat.completion",
            "model": "gpt-6-astra",
            "provider": "OpenAI (GPT-6 Astra Frontier)",
            "reply": cleaned_content,
            "choices": [{
                "index": 0,
                "message": {"role": "assistant", "content": cleaned_content},
                "finish_reason": "stop"
            }]
        }

@app.get("/api/gpt6")
@app.get("/api/gpt6/health")
async def health():
    return {
        "status": "ok",
        "model": "GPT-6 Astra",
        "strict_mode": True,
        "description": "OpenAI GPT-6 Astra Frontier Model — Strict verified routes only",
        "providers": ["OpenAI GPT-6 Astra Frontier"]
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
