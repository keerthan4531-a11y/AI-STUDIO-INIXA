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
      
      const cookieHeader = env.GROK_COOKIE || "";
      if (!cookieHeader) {
        throw new Error("GROK_COOKIE environment variable is required");
      }

      const headers = {
        "accept": "*/*",
        "accept-language": "en-US,en;q=0.9,ta;q=0.8",
        "content-type": "application/json",
        "priority": "u=1, i",
        "sec-ch-ua": "\"Not;A=Brand\";v=\"8\", \"Chromium\";v=\"150\", \"Google Chrome\";v=\"150\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Windows\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "cookie": cookieHeader,
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36"
      };

      // Step 1: Create a new conversation
      const createRes = await fetch("https://grok.com/rest/app-chat/conversations/new", {
        method: "POST",
        headers: headers,
        body: "{}"
      });

      if (!createRes.ok) {
        throw new Error(`Failed to create Grok conversation: ${createRes.status} ${await createRes.text()}`);
      }

      const createData = await createRes.json();
      const conversationId = createData.conversationId || createData.id || createData.uuid;

      if (!conversationId) {
        throw new Error("Failed to parse conversation ID from Grok");
      }

      // Step 2: Send the prompt to the conversation
      const messages = body.messages || [];
      const prompt = messages.map(m => `${m.role}: ${m.content}`).join("\n\n");

      const payload = {
        message: prompt,
        disableSearch: false,
        enableImageGeneration: true,
        imageAttachments: [],
        returnImageBytes: false,
        returnRawGrokInXaiRequest: false,
        fileAttachments: [],
        enableImageStreaming: true,
        imageGenerationCount: 2,
        forceConcise: false,
        enableSideBySide: true,
        sendFinalMetadata: true,
        metadata: { request_metadata: {} },
        disableTextFollowUps: false,
        disableMemory: false,
        forceSideBySide: false,
        isAsyncChat: false,
        isRegenRequest: false,
        disableSelfHarmShortCircuit: false,
        collectionIds: [],
        disabledConnectorIds: [],
        deviceEnvInfo: {
          darkModeEnabled: true,
          devicePixelRatio: 1,
          screenWidth: 1920,
          screenHeight: 1080,
          viewportWidth: 1365,
          viewportHeight: 991
        },
        modeId: "fast"
      };

      const response = await fetch(`https://grok.com/rest/app-chat/conversations/${conversationId}/responses`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload)
      });

      const responseHeaders = new Headers(response.headers);
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      responseHeaders.set("Content-Type", "text/event-stream");

      // Step 3: Stream response using NDJSON/SSE robust parser
      let buffer = '';
      
      const transformStream = new TransformStream({
        transform(chunk, controller) {
          buffer += new TextDecoder().decode(chunk, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            
            let jsonStr = trimmed;
            if (trimmed.startsWith('data: ')) {
              jsonStr = trimmed.slice(6).trim();
            }
            if (jsonStr === '[DONE]') continue; 

            try {
              const data = JSON.parse(jsonStr);
              
              // Helper to recursively find "token" or "message" fields
              let deltaValue = "";
              const extractDelta = (obj) => {
                if (!obj) return;
                if (obj.token && typeof obj.token === "string") {
                  deltaValue += obj.token;
                } else if (obj.message && typeof obj.message === "string" && !obj.isSoftStop) {
                    // Sometimes message has the token
                    if (obj.token === undefined) {
                        deltaValue += obj.message;
                    }
                }
                
                if (typeof obj === 'object') {
                  for (const key of Object.keys(obj)) {
                    if (typeof obj[key] === 'object') {
                      extractDelta(obj[key]);
                    }
                  }
                }
              };
              
              extractDelta(data);

              if (deltaValue) {
                const openaiChunk = {
                  id: `chatcmpl-${Date.now()}`,
                  object: 'chat.completion.chunk',
                  created: Math.floor(Date.now() / 1000),
                  model: body.model || "grok",
                  choices: [{ 
                    index: 0, 
                    delta: { content: deltaValue }, 
                    finish_reason: null 
                  }],
                };
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        },
        flush(controller) {
          const encoder = new TextEncoder();
          const finalChunk = { id: `chatcmpl-${Date.now()}`, object: 'chat.completion.chunk', created: Math.floor(Date.now() / 1000), model: body.model || "grok", choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] };
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
