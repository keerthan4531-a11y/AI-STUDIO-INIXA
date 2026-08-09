/**
 * OverChat AI Cloudflare Worker Module
 * 
 * Routes requests to https://api.overchat.ai/v1/chat/completions
 * No login or Turnstile tokens required — uses clean device headers.
 */

const OVERCHAT_API_URL = "https://api.overchat.ai/v1/chat/completions";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Methods": "GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
  "Access-Control-Expose-Headers": "Content-Type, X-Provider, X-Model"
};

const MODEL_MAP = {
  "gpt-5.2": { model: "openai/gpt-4o", personaId: "gpt-4o-landing" },
  "gpt-5.1": { model: "openai/gpt-4o", personaId: "gpt-4o-landing" },
  "gpt-5-nano": { model: "openai/gpt-4o", personaId: "gpt-4o-landing" },
  "gpt-4o": { model: "openai/gpt-4o", personaId: "gpt-4o-landing" },

  "claude-opus-4.6": { model: "claude-haiku-4-5-20251001", personaId: "claude-haiku-4-5-landing" },
  "claude-haiku-4.5": { model: "claude-haiku-4-5-20251001", personaId: "claude-haiku-4-5-landing" },
  "claude-sonnet-4.6": { model: "claude-haiku-4-5-20251001", personaId: "claude-haiku-4-5-landing" },

  "gemini-3-flash": { model: "alibaba/qwen3-next-80b-a3b-instruct", personaId: "qwen-3-landing" },
  "gemini-3-pro": { model: "alibaba/qwen3-next-80b-a3b-instruct", personaId: "qwen-3-landing" },
  "qwen-3": { model: "alibaba/qwen3-next-80b-a3b-instruct", personaId: "qwen-3-landing" },
  "llama-4": { model: "alibaba/qwen3-next-80b-a3b-instruct", personaId: "qwen-3-landing" },

  "deepseek-v3.2": { model: "deepseek/deepseek-non-thinking-v3.2-exp", personaId: "deepseek-v-3-2-landing" },
  "kimi-k2.5": { model: "deepseek/deepseek-non-thinking-v3.2-exp", personaId: "deepseek-v-3-2-landing" }
};

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      const body = await request.json();
      const rawModel = (body.model || "").replace("overchat/", "").toLowerCase();
      
      const config = MODEL_MAP[rawModel] || { 
        model: "openai/gpt-4o", 
        personaId: "gpt-4o-landing" 
      };

      const messages = (body.messages || []).map(m => ({
        id: generateUUID(),
        role: m.role || "user",
        content: typeof m.content === "string" ? m.content : JSON.stringify(m.content)
      }));

      // Ensure system message exists
      if (!messages.some(m => m.role === "system")) {
        messages.push({ id: generateUUID(), role: "system", content: "" });
      }

      const overchatPayload = {
        chatId: generateUUID(),
        model: config.model,
        messages: messages,
        personaId: config.personaId,
        frequency_penalty: 0,
        max_tokens: 4000,
        presence_penalty: 0,
        stream: true,
        temperature: body.temperature || 0.5,
        top_p: 0.95
      };

      const headers = {
        "accept": "*/*",
        "accept-language": "en-US,en;q=0.9",
        "content-type": "application/json",
        "origin": "https://overchat.ai",
        "referer": "https://overchat.ai/",
        "sec-ch-ua": '"Not=A?Brand";v="99", "Microsoft Edge";v="151", "Chromium";v="151"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0",
        "x-device-language": "en-US",
        "x-device-platform": "web",
        "x-device-uuid": generateUUID(),
        "x-device-version": "1.0.44"
      };

      const res = await fetch(OVERCHAT_API_URL, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(overchatPayload)
      });

      if (!res.ok) {
        const errText = await res.text();
        return new Response(JSON.stringify({ error: `OverChat Error (${res.status}): ${errText}` }), {
          status: res.status,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      // Return SSE Stream directly
      return new Response(res.body, {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive"
        }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: `OverChat Worker Exception: ${err.message}` }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }
  }
};
