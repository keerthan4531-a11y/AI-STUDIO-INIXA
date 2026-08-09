import pollinationsWorker from './pollinations.js';
import perplexityWorker from './perplexity.js';
import qwenWorker from './qwen.js';
import baiduErnieWorker from './baidu-ernie.js';
import metaAIWorker from './meta-ai.js';
import updfWorker from './updf.js';
import perplexityCopilotWorker from './perplexity-copilot.js';
import surfsenseWorker from './surfsense.js';
import grokWorker from './grok.js';
import nadanadaWorker from './nadanada.js';
import copilotWorker from './copilot.js';
import minitoolaiWorker, { harvestTokenViaBrowser } from './minitoolai.js';

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Methods": "GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, X-Provider, X-Model",
};

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      console.log("[Cron Trigger] Edge harvesting Turnstile tokens for GPT & Claude...");
      await harvestTokenViaBrowser(env, false);
      await harvestTokenViaBrowser(env, true);
    })());
  },

  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      const url = new URL(request.url);
      const pathname = url.pathname;
      
      // Route /minitool/* paths to minitoolai worker
      if (pathname.startsWith("/minitool/")) {
        return await minitoolaiWorker.fetch(request, env, ctx);
      }

      // Health check and root
      if (pathname === "/" || pathname === "/health") {
        return new Response(JSON.stringify({
          status: "ok",
          service: "Ultimate Serverless AI API",
          providers: ["pollinations", "perplexity", "qwen", "baidu-ernie", "meta-ai", "ms-copilot", "minitoolai"],
          endpoints: ["/v1/chat/completions", "/v1/models", "/minitool/init"]
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

        // Route to Microsoft Copilot
        if (model.includes("ms-copilot") || model.includes("microsoft") || model.includes("copilot-pro") || model.includes("copilot-think") || model.includes("copilot-gpt5")) {
          return await copilotWorker.fetch(subRequest, env, ctx);
        }

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
        
        // Route to MiniToolAI with Automatic Provider Fallback
        if (model.includes("minitool")) {
          const mtRes = await minitoolaiWorker.fetch(subRequest, env, ctx);
          if (mtRes.ok) {
            return mtRes;
          }
          console.warn(`[Index Router] MiniToolAI failed with status ${mtRes.status}. Falling back to Surfsense/Pollinations...`);
          const isClaudeModel = model.includes("claude");
          const fallbackModel = isClaudeModel ? "surfsense/claude-sonnet-4-no-login" : "surfsense/gpt-5.4-mini-no-login";
          const fallbackBody = { ...body, model: fallbackModel };
          const fallbackReq = new Request(request.url, {
            method: request.method,
            headers: request.headers,
            body: JSON.stringify(fallbackBody)
          });
          const ssRes = await surfsenseWorker.fetch(fallbackReq, env, ctx);
          if (ssRes.ok) return ssRes;

          // Final fallback to Pollinations / Baidu
          const finalModel = isClaudeModel ? "ernie-5.1" : "openai-fast";
          return await pollinationsWorker.fetch(new Request(request.url, {
            method: request.method,
            headers: request.headers,
            body: JSON.stringify({ ...body, model: finalModel })
          }), env, ctx);
        }

        // Route to UPDF
        if (model.includes("updf")) {
          return await updfWorker.fetch(subRequest, env, ctx);
        }

        // Route to Surfsense
        if (model.includes("surfsense") || model.includes("gpt-5.4")) {
          return await surfsenseWorker.fetch(subRequest, env, ctx);
        }

        // Route to Grok
        if (model.includes("grok")) {
          return await grokWorker.fetch(subRequest, env, ctx);
        }

        // Route to Nadanada
        if (model.includes("nadanada") || model.includes("glm-5") || model.includes("minimax") || model.includes("gemini-3.1") || model.includes("deepseek-v3.2")) {
          return await nadanadaWorker.fetch(subRequest, env, ctx);
        }

        // Route to Perplexity
        if (model.includes("turbo") || model.includes("sonar") || model.includes("gpt5") || model.includes("claude") || model.includes("pplx")) {
          return await perplexityWorker.fetch(subRequest, env, ctx);
        }

        // Route to Pollinations (Default for GPT-4o, OpenAI, Llama, Gemini, etc.)
        return await pollinationsWorker.fetch(subRequest, env, ctx);
      }
      
      // For /v1/models, combine models from all providers
      if (pathname.endsWith("/models") && request.method === "GET") {
        const modelReq = new Request(request.url);
        const results = await Promise.allSettled([
          pollinationsWorker.fetch(modelReq, env, ctx),
          perplexityWorker.fetch(modelReq, env, ctx),
          qwenWorker.fetch(modelReq, env, ctx),
          baiduErnieWorker.fetch(modelReq, env, ctx),
          metaAIWorker.fetch(modelReq, env, ctx),
          surfsenseWorker.fetch(modelReq, env, ctx),
          grokWorker.fetch(modelReq, env, ctx),
          nadanadaWorker.fetch(modelReq, env, ctx),
          minitoolaiWorker.fetch(modelReq, env, ctx),
        ]);
        
        const providerNames = [
          'pollinations', 'perplexity', 'qwen', 'baidu-ernie', 'meta-ai',
          'surfsense', 'grok', 'nadanada', 'minitoolai'
        ];
        
        let allModels = [];
        
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          if (result.status === 'fulfilled' && result.value && result.value.ok) {
            try {
              const data = await result.value.json();
              if (data.data) {
                allModels = allModels.concat(data.data.map(m => ({...m, provider: providerNames[i]})));
              }
            } catch (e) {
              // Skip unparseable responses
            }
          }
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
