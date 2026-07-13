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
      
      const turnstileToken = env.NADANADA_TOKEN || "1.dummy_token_needs_to_be_replaced_with_valid_turnstile_token";
      
      // Convert OpenAI messages to Nadanada format
      const messages = (body.messages || []).map(m => {
        return {
          id: crypto.randomUUID().replace(/-/g, '').substring(0, 16),
          role: m.role === 'assistant' ? 'assistant' : 'user',
          parts: [{ type: "text", text: m.content }]
        };
      });

      const payload = {
        model: body.model || "zai/glm-5",
        webSearch: false,
        turnstileToken: turnstileToken,
        id: crypto.randomUUID().replace(/-/g, '').substring(0, 16),
        messages: messages,
        trigger: "submit-message"
      };

      const response = await fetch("https://nadanada.me/api/ai/chat", {
        method: "POST",
        headers: {
          "accept": "*/*",
          "accept-language": "en-US,en;q=0.9",
          "content-type": "application/json",
          "priority": "u=1, i",
          "sec-ch-ua": "\"Not;A=Brand\";v=\"8\", \"Chromium\";v=\"150\", \"Google Chrome\";v=\"150\"",
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": "\"Windows\"",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "referrer": "https://nadanada.me/chat",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Nadanada API Error: ${response.status} ${await response.text()}`);
      }

      const responseHeaders = new Headers(response.headers);
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      responseHeaders.set("Content-Type", "text/event-stream");

      // Stream response using NDJSON robust parser
      let buffer = '';
      
      const transformStream = new TransformStream({
        transform(chunk, controller) {
          buffer += new TextDecoder().decode(chunk, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            
            // Assume Nadanada sends NDJSON (JSON per line)
            // Example response chunk: {"parts":[{"type":"text","text":"hello"}]}
            try {
              let jsonStr = trimmed;
              if (jsonStr.startsWith('data: ')) {
                jsonStr = jsonStr.slice(6).trim();
              }
              if (jsonStr === '[DONE]') continue;
              
              const data = JSON.parse(jsonStr);
              
              // Extract text from parts array
              let deltaValue = "";
              if (data && data.parts && Array.isArray(data.parts)) {
                for (const part of data.parts) {
                  if (part.type === "text" && part.text) {
                    deltaValue += part.text;
                  }
                }
              }

              if (deltaValue) {
                const openaiChunk = {
                  id: `chatcmpl-${Date.now()}`,
                  object: 'chat.completion.chunk',
                  created: Math.floor(Date.now() / 1000),
                  model: body.model || "nadanada-model",
                  choices: [{ 
                    index: 0, 
                    delta: { content: deltaValue }, 
                    finish_reason: null 
                  }],
                };
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        },
        flush(controller) {
          const encoder = new TextEncoder();
          const finalChunk = { id: `chatcmpl-${Date.now()}`, object: 'chat.completion.chunk', created: Math.floor(Date.now() / 1000), model: body.model || "nadanada-model", choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        }
      });

      return new Response(response.body.pipeThrough(transformStream), {
        status: 200,
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
