/**
 * Poolside AI Worker (Laguna S 2.1 & Laguna S 2.1 Thinking)
 *
 * Cloudflare Worker providing OpenAI-compatible chat completions
 * using Poolside's Laguna 2.1 models via chat.poolside.ai (100% free, zero-config guest mode).
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Methods": "GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
  "Access-Control-Expose-Headers": "Content-Type, X-Provider, X-Model"
};

const AVAILABLE_MODELS = [
  { id: "laguna-s-2.1", name: "Laguna S 2.1", modelId: "poolside/laguna-s-2.1", thinking: false },
  { id: "laguna-s-2.1-thinking", name: "Laguna S 2.1 Thinking", modelId: "poolside/laguna-s-2.1", thinking: true },
  { id: "laguna-xs-2.1", name: "Laguna XS 2.1", modelId: "poolside/laguna-xs-2.1", thinking: false }
];

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
  });
}

function extractLastUserMessage(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === "user") {
      const c = messages[i].content;
      if (typeof c === "string") return c;
      if (Array.isArray(c)) {
        return c.map(part => (typeof part === "string" ? part : part?.text || "")).join("\n");
      }
    }
  }
  return "";
}

async function getGuestSession() {
  const res = await fetch("https://chat.poolside.ai/guest.data?_routes=routes%2Fguest", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    }
  });

  const cookieHeader = res.headers.get("set-cookie") || "";
  const psc = cookieHeader.match(/psc_session=[^;]+/)?.[0] || "";
  const awsalb = cookieHeader.match(/AWSALB=[^;]+/)?.[0] || "";
  const awsalbcors = cookieHeader.match(/AWSALBCORS=[^;]+/)?.[0] || "";
  const cookieStr = [psc, awsalb, awsalbcors].filter(Boolean).join("; ");

  if (!cookieStr) {
    throw new Error("Failed to obtain Poolside guest session cookie");
  }
  return cookieStr;
}

async function createChat(cookieStr, modelId) {
  const res = await fetch("https://chat.poolside.ai/api/chats", {
    method: "POST",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      "Cookie": cookieStr,
      "Content-Type": "application/json",
      "Origin": "https://chat.poolside.ai",
      "Referer": "https://chat.poolside.ai/new"
    },
    body: JSON.stringify({ model: modelId })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create Poolside chat: ${res.status} - ${errText}`);
  }

  const data = await res.json();
  return data.id;
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname.endsWith("/models") || pathname === "/v1/models") {
      return jsonResponse({
        object: "list",
        data: AVAILABLE_MODELS.map(m => ({
          id: m.id,
          object: "model",
          created: 1730000000,
          owned_by: "poolside",
          name: m.name,
          provider: "poolside"
        }))
      });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: { message: "Method not allowed" } }, 405);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: { message: "Invalid JSON body" } }, 400);
    }

    const rawModel = (body.model || "laguna-s-2.1").toLowerCase();
    const isThinking = rawModel.includes("thinking");
    const targetModelId = rawModel.includes("xs") ? "poolside/laguna-xs-2.1" : "poolside/laguna-s-2.1";

    const messages = Array.isArray(body.messages) ? body.messages : [];
    const query = extractLastUserMessage(messages);
    if (!query) {
      return jsonResponse({ error: { message: "No user message provided" } }, 400);
    }

    const stream = Boolean(body.stream);

    try {
      // 1. Get Guest Session
      const cookieStr = await getGuestSession();

      // 2. Create Chat
      const chatId = await createChat(cookieStr, targetModelId);

      // 3. Submit Message
      const messageId = crypto.randomUUID();
      const generationId = crypto.randomUUID();

      const payload = {
        id: chatId,
        trigger: "submit-message",
        messageId: messageId,
        baseMessageId: null,
        model: targetModelId,
        inferenceMode: "platform",
        options: {
          thinking: isThinking
        },
        message: {
          id: messageId,
          role: "user",
          parts: [{ type: "text", text: query }]
        },
        generationId: generationId
      };

      const chatRes = await fetch("https://chat.poolside.ai/api/chat", {
        method: "POST",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          "Cookie": cookieStr,
          "Content-Type": "application/json",
          "x-poolside-stream-protocol": "resumable-v1",
          "Origin": "https://chat.poolside.ai",
          "Referer": `https://chat.poolside.ai/chat/${chatId}`
        },
        body: JSON.stringify(payload)
      });

      if (!chatRes.ok) {
        const errText = await chatRes.text();
        return jsonResponse({ error: { message: `Poolside chat error: ${chatRes.status}`, details: errText } }, 502);
      }

      // 4. Connect to Stream
      const streamUrl = `https://chat.poolside.ai/api/chat/${chatId}/stream?generationId=${generationId}`;
      const streamRes = await fetch(streamUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          "Cookie": cookieStr,
          "Accept": "text/event-stream",
          "Referer": "https://chat.poolside.ai/guest"
        }
      });

      if (!streamRes.ok) {
        const errText = await streamRes.text();
        return jsonResponse({ error: { message: `Poolside stream error: ${streamRes.status}`, details: errText } }, 502);
      }

      const streamId = `chatcmpl-laguna-${crypto.randomUUID().substring(0, 8)}`;
      const created = Math.floor(Date.now() / 1000);

      // Handle Streaming
      if (stream) {
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();
        const reader = streamRes.body.getReader();
        const decoder = new TextDecoder();

        (async () => {
          let buffer = "";
          let inReasoning = false;

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith("data:")) continue;
                const dataStr = trimmed.slice(5).trim();
                if (!dataStr || dataStr === "[DONE]") continue;

                try {
                  const ev = JSON.parse(dataStr);
                  let textChunk = "";

                  if (ev.type === "reasoning-start") {
                    inReasoning = true;
                    textChunk = "<think>\n";
                  } else if (ev.type === "reasoning-delta" && ev.delta) {
                    textChunk = ev.delta;
                  } else if (ev.type === "reasoning-end") {
                    inReasoning = false;
                    textChunk = "\n</think>\n\n";
                  } else if (ev.type === "text-delta" && ev.delta) {
                    textChunk = ev.delta;
                  }

                  if (textChunk) {
                    const chunkPayload = {
                      id: streamId,
                      object: "chat.completion.chunk",
                      created,
                      model: rawModel,
                      choices: [{
                        index: 0,
                        delta: { content: textChunk },
                        finish_reason: null
                      }]
                    };
                    await writer.write(encoder.encode(`data: ${JSON.stringify(chunkPayload)}\n\n`));
                  }
                } catch {}
              }
            }

            // End chunk
            const finalChunk = {
              id: streamId,
              object: "chat.completion.chunk",
              created,
              model: rawModel,
              choices: [{ index: 0, delta: {}, finish_reason: "stop" }]
            };
            await writer.write(encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\ndata: [DONE]\n\n`));
          } catch (err) {
            console.error("[PoolsideWorker] Stream read error:", err);
          } finally {
            await writer.close();
          }
        })();

        return new Response(readable, {
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
          }
        });
      }

      // Handle Non-streaming
      const reader = streamRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";
      let fullReasoning = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const dataStr = trimmed.slice(5).trim();
          if (!dataStr || dataStr === "[DONE]") continue;

          try {
            const ev = JSON.parse(dataStr);
            if (ev.type === "reasoning-delta" && ev.delta) {
              fullReasoning += ev.delta;
            } else if (ev.type === "text-delta" && ev.delta) {
              fullContent += ev.delta;
            }
          } catch {}
        }
      }

      let finalReply = fullContent;
      if (fullReasoning) {
        finalReply = `<think>\n${fullReasoning}\n</think>\n\n${fullContent}`;
      }

      return jsonResponse({
        id: streamId,
        object: "chat.completion",
        created,
        model: rawModel,
        reply: finalReply,
        choices: [{
          index: 0,
          message: {
            role: "assistant",
            content: finalReply
          },
          finish_reason: "stop"
        }]
      });

    } catch (err) {
      console.error("[PoolsideWorker] Error:", err);
      return jsonResponse({ error: { message: `Poolside error: ${err.message || err}` } }, 500);
    }
  }
};
