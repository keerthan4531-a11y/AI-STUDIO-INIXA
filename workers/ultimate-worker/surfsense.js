// ═══════════════════════════════════════════════════════════════════
// SurfSense Reverse Proxy Worker
// ═══════════════════════════════════════════════════════════════════
// Proxies requests to SurfSense's anonymous chat API and transforms
// SSE events into OpenAI-compatible chat completion format.
//
// SurfSense SSE event types:
//   - { type: "start" }
//   - { type: "text-delta", delta: "..." }
//   - { type: "reasoning-delta", delta: "..." }
//   - { type: "data-thinking-step", data: {...} }
//   - { type: "finish" }
//   - { type: "error", message: "..." }
// ═══════════════════════════════════════════════════════════════════

const SURFSENSE_API = "https://www.surfsense.com/api/v1/public/anon-chat/stream";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
  "Access-Control-Expose-Headers": "Content-Type, X-Provider, X-Model"
};

const SURFSENSE_MODELS = [
  { id: "surfsense/gpt-5.4-mini-no-login", name: "GPT 5.4 Mini (SurfSense)", owned_by: "surfsense" },
  { id: "surfsense/claude-sonnet-4-no-login", name: "Claude Sonnet 4 (SurfSense)", owned_by: "surfsense" },
  { id: "surfsense/gemini-2.5-flash-no-login", name: "Gemini 2.5 Flash (SurfSense)", owned_by: "surfsense" },
  { id: "surfsense/llama-4-maverick-no-login", name: "Llama 4 Maverick (SurfSense)", owned_by: "surfsense" },
  { id: "surfsense/grok-3-mini-no-login", name: "Grok 3 Mini (SurfSense)", owned_by: "surfsense" },
  { id: "gpt-5.4", name: "GPT 5.4 (SurfSense)", owned_by: "surfsense" },
];

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
  });
}

function resolveModelSlug(model) {
  // Strip surfsense/ prefix if present
  let slug = model;
  if (slug.startsWith("surfsense/")) {
    slug = slug.replace("surfsense/", "");
  }
  // Map common aliases
  if (slug === "gpt-5.4" || slug === "gpt-5.4-mini") {
    slug = "gpt-5.4-mini-no-login";
  }
  return slug;
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const pathname = url.pathname;

    // Models endpoint
    if (pathname.endsWith("/models") && request.method === "GET") {
      return jsonResponse({
        object: "list",
        data: SURFSENSE_MODELS.map(m => ({
          id: m.id,
          object: "model",
          created: 1700000000,
          owned_by: m.owned_by,
          name: m.name,
          provider: "surfsense"
        }))
      });
    }

    // Health check
    if (pathname === "/health") {
      return jsonResponse({ status: "ok", service: "surfsense-worker" });
    }

    // Chat completions
    if (request.method !== "POST") {
      return jsonResponse({ error: { message: "Method not allowed" } }, 405);
    }

    try {
      const body = await request.json();
      const model = body.model || "gpt-5.4-mini-no-login";
      const modelSlug = resolveModelSlug(model);
      const stream = body.stream !== false; // default to streaming

      const payload = {
        model_slug: modelSlug,
        messages: (body.messages || []).map(m => ({
          role: m.role,
          content: typeof m.content === "string" ? m.content : JSON.stringify(m.content)
        }))
      };

      const surfsenseHeaders = {
        "accept": "text/event-stream",
        "accept-language": "en-US,en;q=0.9",
        "content-type": "application/json",
        "priority": "u=1, i",
        "sec-ch-ua": "\"Not;A=Brand\";v=\"8\", \"Chromium\";v=\"150\", \"Microsoft Edge\";v=\"150\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Windows\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "origin": "https://www.surfsense.com",
        "referer": "https://www.surfsense.com/",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
      };

      const response = await fetch(SURFSENSE_API, {
        method: "POST",
        headers: surfsenseHeaders,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        return jsonResponse({
          error: { message: `SurfSense API error: ${response.status}`, details: errorText }
        }, response.status === 429 ? 429 : 502);
      }

      const streamId = `chatcmpl-surf-${crypto.randomUUID().substring(0, 8)}`;
      const created = Math.floor(Date.now() / 1000);

      if (stream) {
        return handleStreamResponse(response, streamId, created, model);
      } else {
        return handleNonStreamResponse(response, streamId, created, model);
      }

    } catch (error) {
      console.error("[SurfsenseWorker] Error:", error);
      return jsonResponse({ error: { message: error.message } }, 500);
    }
  }
};

// ─── Stream Response Handler ─────────────────────────────────────
function handleStreamResponse(upstreamResponse, streamId, created, model) {
  let buffer = '';
  const encoder = new TextEncoder();

  const transformStream = new TransformStream({
    transform(chunk, controller) {
      buffer += new TextDecoder().decode(chunk, { stream: true });
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() || '';

      for (const event of events) {
        const lines = event.split(/\r?\n/);
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (!data || data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const chunks = processSSEEvent(parsed, streamId, created, model);
            for (const c of chunks) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(c)}\n\n`));
            }
          } catch (e) {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    },
    flush(controller) {
      // Process any remaining buffer
      if (buffer.trim()) {
        const lines = buffer.split(/\r?\n/);
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (!data || data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const chunks = processSSEEvent(parsed, streamId, created, model);
            for (const c of chunks) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(c)}\n\n`));
            }
          } catch (e) {}
        }
      }
      // Send final stop chunk
      const finalChunk = {
        id: streamId,
        object: 'chat.completion.chunk',
        created,
        model,
        choices: [{ index: 0, delta: {}, finish_reason: 'stop' }]
      };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\n`));
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
    }
  });

  return new Response(upstreamResponse.body.pipeThrough(transformStream), {
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Provider": "surfsense",
      "X-Model": model
    }
  });
}

// ─── Non-Stream Response Handler ─────────────────────────────────
async function handleNonStreamResponse(upstreamResponse, streamId, created, model) {
  const reader = upstreamResponse.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  let fullReasoning = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() || '';

      for (const event of events) {
        const lines = event.split(/\r?\n/);
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (!data || data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);

            if (parsed.type === 'text-delta' && parsed.delta) {
              fullText += parsed.delta;
            } else if (parsed.type === 'reasoning-delta' && parsed.delta) {
              fullReasoning += parsed.delta;
            } else if (parsed.type === 'error') {
              throw new Error(parsed.message || 'SurfSense stream error');
            }
          } catch (e) {
            if (e.message && e.message.includes('SurfSense')) throw e;
            // Ignore JSON parse errors
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return jsonResponse({
    id: streamId,
    object: "chat.completion",
    created,
    model,
    choices: [{
      index: 0,
      message: {
        role: "assistant",
        content: fullText,
        ...(fullReasoning ? { reasoning_content: fullReasoning } : {})
      },
      finish_reason: "stop"
    }],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
  });
}

// ─── SSE Event Processor ─────────────────────────────────────────
// Converts SurfSense SSE events to OpenAI chat completion chunks
function processSSEEvent(event, streamId, created, model) {
  const chunks = [];

  switch (event.type) {
    case 'text-delta':
      if (event.delta) {
        chunks.push({
          id: streamId,
          object: 'chat.completion.chunk',
          created,
          model,
          choices: [{
            index: 0,
            delta: { content: event.delta },
            finish_reason: null
          }]
        });
      }
      break;

    case 'reasoning-delta':
      if (event.delta) {
        chunks.push({
          id: streamId,
          object: 'chat.completion.chunk',
          created,
          model,
          choices: [{
            index: 0,
            delta: { reasoning_content: event.delta },
            finish_reason: null
          }]
        });
      }
      break;

    case 'text-start':
    case 'text-end':
    case 'reasoning-start':
    case 'reasoning-end':
    case 'start':
    case 'start-step':
    case 'finish-step':
    case 'data-thinking-step':
    case 'data-thread-title-update':
    case 'data-turn-info':
    case 'data-turn-status':
    case 'data-token-usage':
      // Lifecycle events — skip, no content to emit
      break;

    case 'finish':
      // Stream finished — the flush handler will emit the stop chunk
      break;

    case 'error':
      if (event.message) {
        chunks.push({
          id: streamId,
          object: 'chat.completion.chunk',
          created,
          model,
          choices: [{
            index: 0,
            delta: { content: `[Error: ${event.message}]` },
            finish_reason: "stop"
          }]
        });
      }
      break;

    default:
      // Unknown event type — check for delta field as fallback
      if (event.delta && typeof event.delta === 'string') {
        chunks.push({
          id: streamId,
          object: 'chat.completion.chunk',
          created,
          model,
          choices: [{
            index: 0,
            delta: { content: event.delta },
            finish_reason: null
          }]
        });
      }
      break;
  }

  return chunks;
}
