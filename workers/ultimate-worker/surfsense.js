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
      const body = await request.json();
      let actualModel = body.model || "gpt-5.4-mini-no-login";
      if (actualModel.startsWith("surfsense/")) {
        actualModel = actualModel.replace("surfsense/", "");
      }
      
      const payload = {
        model_slug: actualModel,
        messages: body.messages || []
      };

      const surfsenseHeaders = {
        "accept": "*/*",
        "accept-language": "en-US,en;q=0.9",
        "content-type": "application/json",
        "priority": "u=1, i",
        "sec-ch-ua": "\"Not;A=Brand\";v=\"8\", \"Chromium\";v=\"150\", \"Microsoft Edge\";v=\"150\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Windows\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "referrer": "https://www.surfsense.com/",
      };

      const response = await fetch("https://api.surfsense.com/api/v1/public/anon-chat/stream", {
        method: "POST",
        headers: surfsenseHeaders,
        body: JSON.stringify(payload)
      });

      const responseHeaders = new Headers(response.headers);
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      responseHeaders.set("Content-Type", "text/event-stream");

      // Parse Surfsense SSE and transform to OpenAI format
      let buffer = '';
      
      const transformStream = new TransformStream({
        transform(chunk, controller) {
          buffer += new TextDecoder().decode(chunk, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6).trim();
              if (jsonStr === '[DONE]' || !jsonStr) continue; 

              try {
                const jsonData = JSON.parse(jsonStr);
                
                let content = null;
                let reasoning = null;

                if (jsonData.type === 'text-delta') {
                  content = jsonData.delta;
                } else if (jsonData.type === 'data-thinking-step' && jsonData.data?.title) {
                  // Optional: Stream thinking steps as reasoning if your UI supports it
                  // reasoning = jsonData.data.title + "\n";
                }

                if (content || reasoning) {
                  const openaiChunk = {
                    id: `chatcmpl-${Date.now()}`,
                    object: 'chat.completion.chunk',
                    created: Math.floor(Date.now() / 1000),
                    model: payload.model_slug,
                    choices: [{ 
                      index: 0, 
                      delta: { 
                        content: content || "",
                        ...(reasoning ? { reasoning } : {})
                      }, 
                      finish_reason: null 
                    }],
                  };
                  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
                }
              } catch (e) {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        },
        flush(controller) {
          const encoder = new TextEncoder();
          const finalChunk = { id: `chatcmpl-${Date.now()}`, object: 'chat.completion.chunk', created: Math.floor(Date.now() / 1000), model: payload.model_slug, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        }
      });

      return new Response(response.body.pipeThrough(transformStream), {
        status: response.status,
        headers: responseHeaders
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
  }
};
