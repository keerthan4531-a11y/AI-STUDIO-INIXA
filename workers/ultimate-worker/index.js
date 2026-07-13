import pollinationsWorker from './pollinations.js';
import perplexityWorker from './perplexity.js';
import qwenWorker from './qwen.js';
import baiduErnieWorker from './baidu-ernie.js';
import metaAIWorker from './meta-ai.js';
import updfWorker from './updf.js';
import perplexityCopilotWorker from './perplexity-copilot.js';
import surfsenseWorker from './surfsense.js';

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
          providers: ["pollinations", "perplexity", "qwen", "baidu-ernie", "meta-ai"],
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
        
        const model = (body.model || "").toLowerCase();
        const subRequest = new Request(request.url, {
          method: request.method,
          headers: request.headers,
          body: bodyText
        });

        // Route to Baidu ERNIE
        if (model.includes("ernie") || model.includes("erine") || model.includes("baidu")) {
          return await baiduErnieWorker.fetch(subRequest, env, ctx);
        }

        // Route to Meta AI
        if (model.includes("meta") || model.includes("muse") || model.includes("maverick")) {
          return await metaAIWorker.fetch(subRequest, env, ctx);
        }

        // Route to Qwen
        if (model.includes("qwen") || model.includes("qwq")) {
          return await qwenWorker.fetch(subRequest, env, ctx);
        }
        
        // Route to Perplexity Copilot Direct
        if (model.includes("copilot") || model.includes("perplexity-direct")) {
          return await perplexityCopilotWorker.fetch(subRequest, env, ctx);
        }
        
        // Route to UPDF
        if (model.includes("updf") || model.includes("gpt-5.6") || model.includes("gpt5.6")) {
          return await updfWorker.fetch(subRequest, env, ctx);
        }

        // Route to Surfsense
        if (model.includes("surfsense") || model.includes("gpt-5.4")) {
          return await surfsenseWorker.fetch(subRequest, env, ctx);
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
        const [pollRes, perpRes, qwenRes, baiduRes, metaRes] = await Promise.all([
          pollinationsWorker.fetch(new Request(request.url), env, ctx).catch(() => null),
          perplexityWorker.fetch(new Request(request.url), env, ctx).catch(() => null),
          qwenWorker.fetch(new Request(request.url), env, ctx).catch(() => null),
          baiduErnieWorker.fetch(new Request(request.url), env, ctx).catch(() => null),
          metaAIWorker.fetch(new Request(request.url), env, ctx).catch(() => null)
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
        if (baiduRes && baiduRes.ok) {
          const data = await baiduRes.json();
          if (data.data) allModels = allModels.concat(data.data.map(m => ({...m, provider: 'baidu-ernie'})));
        }
        if (metaRes && metaRes.ok) {
          const data = await metaRes.json();
          if (data.data) allModels = allModels.concat(data.data.map(m => ({...m, provider: 'meta-ai'})));
        }
        
        return new Response(JSON.stringify({
          object: "list",
          data: allModels
        }), { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
      }
      // Route /debug to baidu-ernie worker
      if (pathname === "/debug") {
        return await baiduErnieWorker.fetch(request, env, ctx);
      }
      // Route /meta/health to meta worker
      if (pathname === "/meta/health") {
        return await metaAIWorker.fetch(request, env, ctx);
      }

      return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: CORS_HEADERS });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS_HEADERS });
    }
  }
};
