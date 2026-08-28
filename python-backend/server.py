import asyncio
import json
import logging
import os
import re
import time
import uuid
from typing import Any, AsyncGenerator, Dict, List, Optional
from urllib.parse import urlencode

from curl_cffi import requests as cffi_requests
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from playwright.async_api import Browser, BrowserContext, Page, async_playwright
from pydantic import BaseModel, Field

# Setup structured logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("minitool-bridge")

app = FastAPI(title="MiniToolAI High-Performance Python Bridge", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Pydantic Models (OpenAI Compatible) ──────────────────────────
class ChatMessage(BaseModel):
    role: str
    content: Any

class ChatCompletionRequest(BaseModel):
    model: str = "gpt-4o"
    messages: List[ChatMessage]
    temperature: Optional[float] = 0.7
    stream: Optional[bool] = False
    max_tokens: Optional[int] = None

# Model mapping
MODEL_MAP = {
    "gpt-4o": "gpt-4o-mini",
    "gpt-4o-mini": "gpt-4o-mini",
    "minitool/gpt-4o": "gpt-4o-mini",
    "gpt-5.6-luna": "gpt-5.6-luna",
    "minitool/gpt-5.6-luna": "gpt-5.6-luna",
    "gpt-5.6-terra": "gpt-5.6-terra",
    "minitool/gpt-5.6-terra": "gpt-5.6-terra",
    "gpt-5.4-fast": "gpt-5.4-mini",
    "minitool/gpt-5.4-fast": "gpt-5.4-mini",
    "gpt-5.4-mini": "gpt-5.4-nano",
    "minitool/gpt-5.4-mini": "gpt-5.4-nano",
    "gpt-5": "gpt-5-mini",
    "minitool/gpt-5": "gpt-5-mini",
    "gpt-3.5-turbo": "gpt-3.5-turbo",
    "minitool/gpt-3.5-turbo": "gpt-3.5-turbo",
    "grok-4.5": "grok-4.5",
    "minitool/grok-4.5": "grok-4.5",
    "claude-3-5-sonnet": "claude-3-5-sonnet-20241022",
    "minitool/claude-3-5-sonnet": "claude-3-5-sonnet-20241022",
}

# ─── Auto-Turnstile Harvester Engine ──────────────────────────────
class TurnstileHarvester:
    def __init__(self):
        self.playwright = None
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self.token_queue: asyncio.Queue = asyncio.Queue(maxsize=10)
        self.session_data: Dict[str, str] = {
            "cookie": "",
            "utoken": "",
            "safety_identifier": "",
        }
        self.is_running = False
        self.lock = asyncio.Lock()

    async def initialize(self):
        logger.info("Initializing Playwright automated Turnstile Engine...")
        self.playwright = await async_playwright().start()
        
        # Check if running in Docker / Linux or Windows
        is_linux = os.name != "nt"
        launch_args = [
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
        ]
        
        if is_linux:
            self.browser = await self.playwright.chromium.launch(
                headless=True,
                args=launch_args
            )
        else:
            try:
                self.browser = await self.playwright.chromium.launch(
                    channel="chrome",
                    headless=False,
                    args=launch_args
                )
            except Exception:
                self.browser = await self.playwright.chromium.launch(
                    headless=True,
                    args=launch_args
                )

        self.context = await self.browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 720}
        )
        self.page = await self.context.new_page()
        self.is_running = True
        logger.info("Playwright Browser launched successfully.")
        asyncio.create_task(self._harvest_loop())

    async def _harvest_single_token(self) -> Optional[str]:
        async with self.lock:
            try:
                logger.info("Harvesting fresh Turnstile token...")
                await self.page.goto("https://minitoolai.com/gpt-ai/", wait_until="domcontentloaded")
                
                # Check for Cloudflare Turnstile verification challenge
                for second in range(15):
                    await asyncio.sleep(1)
                    title = await self.page.title()
                    
                    if "Just a moment" in title:
                        for frame in self.page.frames:
                            try:
                                box = await frame.query_selector('input[type="checkbox"], .ctp-checkbox-label')
                                if box:
                                    logger.info("Detected Cloudflare checkbox. Clicking...")
                                    await box.click()
                            except Exception:
                                pass
                    else:
                        # Inside main page! Extract session identifiers & cft
                        try:
                            cft = await self.page.evaluate("window.cft")
                            if cft and len(cft) > 20 and cft not in ["error", "expired"]:
                                # Extract utoken & safety_identifier
                                html = await self.page.content()
                                m_u = re.search(r'var\s+utoken\s*=\s*"([^"]+)"', html)
                                m_s = re.search(r'var\s+safety_identifier\s*=\s*"([^"]+)"', html)
                                if m_u:
                                    self.session_data["utoken"] = m_u.group(1)
                                if m_s:
                                    self.session_data["safety_identifier"] = m_s.group(1)

                                # Extract full cookies with cf_clearance
                                cookies = await self.context.cookies()
                                cookie_parts = [f"{c['name']}={c['value']}" for c in cookies]
                                self.session_data["cookie"] = "; ".join(cookie_parts)
                                
                                logger.info(f"Successfully harvested fresh CFT token! (len: {len(cft)})")
                                return cft
                        except Exception as eval_err:
                            pass
            except Exception as e:
                logger.error(f"Error during token harvesting: {e}")
            return None

    async def _harvest_loop(self):
        """Background worker that continuously maintains fresh tokens in queue."""
        while self.is_running:
            try:
                if self.token_queue.qsize() < 2:
                    token = await self._harvest_single_token()
                    if token:
                        await self.token_queue.put(token)
                        logger.info(f"Token added to pool. Available in pool: {self.token_queue.qsize()}")
                await asyncio.sleep(2)
            except Exception as e:
                logger.error(f"Harvest loop exception: {e}")
                await asyncio.sleep(5)

    async def get_token(self) -> str:
        """Get an active Turnstile token immediately from queue or harvest on-demand."""
        try:
            return self.token_queue.get_nowait()
        except asyncio.QueueEmpty:
            logger.warning("Token pool empty! Harvesting on-demand...")
            token = await self._harvest_single_token()
            if token:
                return token
            raise HTTPException(status_code=503, detail="Could not harvest Turnstile token. Please retry in 5 seconds.")

    async def shutdown(self):
        self.is_running = False
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
        logger.info("Turnstile Harvester shutdown complete.")

harvester = TurnstileHarvester()

@app.on_event("startup")
async def on_startup():
    await harvester.initialize()

@app.on_event("shutdown")
async def on_shutdown():
    await harvester.shutdown()

# ─── Chat Completion Proxy ────────────────────────────────────────
def clean_messages(messages: List[ChatMessage]):
    user_msgs = [m for m in messages if m.role == "user"]
    bot_msgs = [m for m in messages if m.role == "assistant"]
    
    last_msg = user_msgs[-1].content if user_msgs else ""
    if not isinstance(last_msg, str):
        last_msg = json.dumps(last_msg)
        
    prev_u1 = user_msgs[-2].content if len(user_msgs) >= 2 else ""
    prev_b1 = bot_msgs[-1].content if len(bot_msgs) >= 1 else ""
    prev_u2 = user_msgs[-3].content if len(user_msgs) >= 3 else ""
    prev_b2 = bot_msgs[-2].content if len(bot_msgs) >= 2 else ""
    
    return {
        "last_msg": last_msg,
        "prev_u1": prev_u1 if isinstance(prev_u1, str) else json.dumps(prev_u1),
        "prev_b1": prev_b1 if isinstance(prev_b1, str) else json.dumps(prev_b1),
        "prev_u2": prev_u2 if isinstance(prev_u2, str) else json.dumps(prev_u2),
        "prev_b2": prev_b2 if isinstance(prev_b2, str) else json.dumps(prev_b2),
    }

async def stream_minitool_response(stream_token: str, cookie: str, model_id: str) -> AsyncGenerator[bytes, None]:
    created = int(time.time())
    chunk_id = f"chatcmpl-{uuid.uuid4().hex[:12]}"
    
    url = f"https://minitoolai.com/gpt-ai/chatgpt_stream.php?streamtoken={stream_token}"
    headers = {
        "Accept": "text/event-stream",
        "Cache-Control": "no-cache",
        "Cookie": cookie,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
        "Referer": "https://minitoolai.com/gpt-ai/"
    }

    # Stream using curl_cffi with Chrome TLS impersonation
    session = cffi_requests.AsyncSession(impersonate="chrome120")
    try:
        response = await session.get(url, headers=headers, stream=True)
        async for line in response.aiter_lines():
            line_str = line.decode("utf-8", errors="ignore").strip()
            if not line_str or not line_str.startswith("data:"):
                continue
                
            json_str = line_str[5:].strip()
            if not json_str:
                continue
                
            try:
                data = json.loads(json_str)
                d_type = data.get("type")
                
                # Delta content
                if d_type == "response.output_text.delta" and "delta" in data:
                    content_chunk = {
                        "id": chunk_id,
                        "object": "chat.completion.chunk",
                        "created": created,
                        "model": model_id,
                        "choices": [{"index": 0, "delta": {"content": data["delta"]}, "finish_reason": None}]
                    }
                    yield f"data: {json.dumps(content_chunk)}\n\n".encode("utf-8")
                
                # Completed
                elif d_type == "response.completed":
                    stop_chunk = {
                        "id": chunk_id,
                        "object": "chat.completion.chunk",
                        "created": created,
                        "model": model_id,
                        "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}]
                    }
                    yield f"data: {json.dumps(stop_chunk)}\n\n".encode("utf-8")
                    yield b"data: [DONE]\n\n"
                    break
            except Exception:
                continue
    finally:
        await session.close()

@app.post("/v1/chat/completions")
async def chat_completions(req: ChatCompletionRequest):
    cft_token = await harvester.get_token()
    session_data = harvester.session_data
    
    target_model = MODEL_MAP.get(req.model, req.model)
    cleaned = clean_messages(req.messages)
    
    form_data = {
        "messagebase64img1": "",
        "messagebase64img0": "",
        "safety_identifier": session_data.get("safety_identifier", ""),
        "select_model": target_model,
        "temperature": str(req.temperature or 0.7),
        "utoken": session_data.get("utoken", ""),
        "message": cleaned["last_msg"],
        "umes1a": cleaned["prev_u1"],
        "umes1stimg1a": "",
        "umes2ndimg1a": "",
        "bres1a": cleaned["prev_b1"],
        "umes2a": cleaned["prev_u2"],
        "umes1stimg2a": "",
        "umes2ndimg2a": "",
        "bres2a": cleaned["prev_b2"],
        "cft": cft_token
    }

    # Retry up to 2 times with fresh token if Cloudflare challenge or refresh occurs
    stream_token = ""
    for attempt in range(2):
        cft_token = await harvester.get_token() if attempt == 0 else await harvester._harvest_single_token()
        session_data = harvester.session_data
        form_data["cft"] = cft_token
        form_data["safety_identifier"] = session_data.get("safety_identifier", "")
        form_data["utoken"] = session_data.get("utoken", "")
        headers["Cookie"] = session_data.get("cookie", "")

        session = cffi_requests.AsyncSession(impersonate="chrome120")
        try:
            post_res = await session.post(
                "https://minitoolai.com/gpt-ai/chatgpt_stream.php",
                headers=headers,
                data=form_data
            )
            res_txt = post_res.text.strip()
            logger.info(f"MiniTool POST response [attempt {attempt+1}]: {res_txt[:40]}...")
            
            if res_txt and not res_txt.startswith("<!DOCTYPE") and res_txt != "refresh" and len(res_txt) >= 10:
                stream_token = res_txt
                break
            else:
                logger.warning(f"Invalid stream token received: {res_txt[:40]}... Retrying with fresh session...")
                await asyncio.sleep(1)
        finally:
            await session.close()

    if not stream_token:
        raise HTTPException(status_code=429, detail="Turnstile token expired or challenged. Please retry.")

    # Step 2: Return Streaming SSE or Non-Streaming JSON
    if req.stream:
        return StreamingResponse(
            stream_minitool_response(stream_token, session_data.get("cookie", ""), req.model),
            media_type="text/event-stream"
        )
    else:
        full_text = ""
        async for chunk in stream_minitool_response(stream_token, session_data.get("cookie", ""), req.model):
            chunk_str = chunk.decode("utf-8")
            for line in chunk_str.split("\n"):
                if line.startswith("data:") and not line.endswith("[DONE]"):
                    try:
                        c_json = json.loads(line[5:].strip())
                        delta = c_json["choices"][0]["delta"].get("content", "")
                        full_text += delta
                    except Exception:
                        pass
                        
        return {
            "id": f"chatcmpl-{uuid.uuid4().hex[:12]}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": req.model,
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": full_text
                },
                "finish_reason": "stop"
            }],
            "usage": {
                "prompt_tokens": len(cleaned["last_msg"]) // 4,
                "completion_tokens": len(full_text) // 4,
                "total_tokens": (len(cleaned["last_msg"]) + len(full_text)) // 4
            }
        }

@app.get("/v1/models")
async def list_models():
    return {
        "object": "list",
        "data": [{"id": m, "object": "model", "owned_by": "minitoolai"} for m in MODEL_MAP.keys()]
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "tokens_in_pool": harvester.token_queue.qsize(),
        "has_cookie": bool(harvester.session_data.get("cookie")),
        "has_utoken": bool(harvester.session_data.get("utoken")),
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    logger.info(f"Starting server on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
