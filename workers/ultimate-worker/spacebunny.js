/**
 * Space Bunny AI Worker (stealth/space-bunny-alpha)
 *
 * Cloudflare Worker providing OpenAI-compatible chat completions
 * using Space Bunny's free public web endpoint via spacebunnymodel.com (100% free, no login/API key required).
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Methods": "GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
  "Access-Control-Expose-Headers": "Content-Type, X-Provider, X-Model"
};

const AVAILABLE_MODELS = [
  { id: "space-bunny-alpha", name: "Space Bunny Alpha", modelId: "stealth/space-bunny-alpha" }
];

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
  });
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
          owned_by: "spacebunny",
          name: m.name,
          provider: "spacebunny"
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

    const messages = Array.isArray(body.messages) ? body.messages : [{ role: "user", content: body.prompt || "Hello" }];
    const stream = Boolean(body.stream);

    try {
      const spaceBunnyRes = await fetch("https://spacebunnymodel.com/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          "Referer": "https://spacebunnymodel.com/",
          "Origin": "https://spacebunnymodel.com"
        },
        body: JSON.stringify({
          messages: messages.filter(m => m && m.content)
        })
      });

      if (!spaceBunnyRes.ok || !spaceBunnyRes.body) {
        const errText = await spaceBunnyRes.text();
        return jsonResponse({ error: { message: `Space Bunny API error: ${spaceBunnyRes.status}`, details: errText } }, 502);
      }

      const streamId = `chatcmpl-spacebunny-${crypto.randomUUID().substring(0, 8)}`;
      const created = Math.floor(Date.now() / 1000);

      if (stream) {
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();
        const reader = spaceBunnyRes.body.getReader();
        const decoder = new TextDecoder();

        (async () => {
          let buffer = "";
          let startedThinking = false;
          let endedThinking = false;

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
                  const json = JSON.parse(dataStr);
                  const delta = json.choices?.[0]?.delta;
                  let textChunk = "";

                  if (delta?.reasoning) {
                    if (!startedThinking) {
                      textChunk += "<think>\n";
                      startedThinking = true;
                    }
                    textChunk += delta.reasoning;
                  }

                  if (delta?.content) {
                    if (startedThinking && !endedThinking) {
                      textChunk = "\n</think>\n\n" + textChunk;
                      endedThinking = true;
                    }
                    textChunk += delta.content;
                  }

                  if (textChunk) {
                    const chunkPayload = {
                      id: streamId,
                      object: "chat.completion.chunk",
                      created,
                      model: "space-bunny-alpha",
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

            if (startedThinking && !endedThinking) {
              await writer.write(encoder.encode(`data: ${JSON.stringify({
                id: streamId,
                object: "chat.completion.chunk",
                created,
                model: "space-bunny-alpha",
                choices: [{ index: 0, delta: { content: "\n</think>\n\n" }, finish_reason: null }]
              })}\n\n`));
            }

            const finalChunk = {
              id: streamId,
              object: "chat.completion.chunk",
              created,
              model: "space-bunny-alpha",
              choices: [{ index: 0, delta: {}, finish_reason: "stop" }]
            };
            await writer.write(encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\ndata: [DONE]\n\n`));
          } catch (err) {
            console.error("[Space Bunny Stream Error]", err);
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

      // Non-streaming
      const reader = spaceBunnyRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullReasoning = "";
      let fullContent = "";

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
            const json = JSON.parse(dataStr);
            const delta = json.choices?.[0]?.delta;
            if (delta?.reasoning) fullReasoning += delta.reasoning;
            if (delta?.content) fullContent += delta.content;
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
        model: "space-bunny-alpha",
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
      console.error("[Space Bunny Error]", err);
      return jsonResponse({ error: { message: `Space Bunny error: ${err.message || err}` } }, 500);
    }
  }
};
