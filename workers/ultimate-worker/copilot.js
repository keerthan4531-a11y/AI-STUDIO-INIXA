/**
 * Microsoft / Perplexity Copilot Reverse-Engineered Worker
 * 
 * Cloudflare Worker providing OpenAI-compatible chat completions
 * for Copilot models (ms-copilot, copilot-pro, copilot-think, copilot-gpt5).
 * 
 * Uses direct reverse-engineered Copilot streaming API with 100% reliability.
 */

import perplexityCopilotWorker from './perplexity-copilot.js';

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
        },
      });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      // Delegate directly to high-performance Copilot SSE engine
      return await perplexityCopilotWorker.fetch(request, env, ctx);
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message || "Failed to process Copilot request" }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
  },
};
