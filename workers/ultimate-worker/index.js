import pollinationsWorker from './pollinations.js';
import perplexityWorker from './perplexity.js';
import qwenWorker from './qwen.js';

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Methods": "GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, X-Provider, X-Model",
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      const url = new URL(request.url);
      const pathname = url.pathname;
      
      // Health check and root
      if (pathname === "/" || pathname === "/health") {
        return new Response(JSON.stringify({
          status: "ok",
          service: "Ultimate Serverless AI API",
          providers: ["pollinations", "perplexity", "qwen"],
          endpoints: ["/v1/chat/completions", "/v1/models"]
        }), { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
      }

      // We need to parse body for POST requests to route by model
      if (request.method === "POST" && pathname.endsWith("/chat/completions")) {
        // Clone request because we need to read body, but also pass it to sub-workers
        const bodyText = await request.text();
        let body;
        try {
          body = JSON.parse(bodyText);
        } catch (e) {
          return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: CORS_HEADERS });
        }
        
        const model = body.model || "";
        
        // Reconstruct request for sub-workers
        const subRequest = new Request(request.url, {
          method: request.method,
          headers: request.headers,
          body: bodyText
        });

        // Route to Qwen
        if (model.includes("qwen") || model.includes("qwq")) {
          return await qwenWorker.fetch(subRequest, env, ctx);
        }
        
        // Route to Perplexity
        if (model.includes("turbo") || model.includes("sonar") || model.includes("gpt5") || model.includes("claude") || model.includes("grok") || model.includes("pplx")) {
          return await perplexityWorker.fetch(subRequest, env, ctx);
        }
        
        // Route to Pollinations (Default for GPT-4o, OpenAI, Llama, Gemini, etc.)
        return await pollinationsWorker.fetch(subRequest, env, ctx);
      }
      
      // For /v1/models, let's combine models from all three
      if (pathname.endsWith("/models") && request.method === "GET") {
        // Get models from all workers
        const [pollRes, perpRes, qwenRes] = await Promise.all([
          pollinationsWorker.fetch(new Request(request.url), env, ctx).catch(() => null),
          perplexityWorker.fetch(new Request(request.url), env, ctx).catch(() => null),
          qwenWorker.fetch(new Request(request.url), env, ctx).catch(() => null)
        ]);
        
        let allModels = [];
        
        if (pollRes && pollRes.ok) {
          const data = await pollRes.json();
          if (data.data) allModels = allModels.concat(data.data.map(m => ({...m, provider: 'pollinations'})));
        }
        if (perpRes && perpRes.ok) {
          const data = await perpRes.json();
          if (data.data) allModels = allModels.concat(data.data.map(m => ({...m, provider: 'perplexity'})));
        }
        if (qwenRes && qwenRes.ok) {
          const data = await qwenRes.json();
          if (data.data) allModels = allModels.concat(data.data.map(m => ({...m, provider: 'qwen'})));
        }
        
        return new Response(JSON.stringify({
          object: "list",
          data: allModels
        }), { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: CORS_HEADERS });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS_HEADERS });
    }
  }
};
