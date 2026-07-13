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
      
      const messages = body.messages || [];
      // Pass the entire conversation history as a formatted string to maintain context
      const fullPrompt = messages.map(m => `${m.role}: ${m.content}`).join("\n\n");
      
      const updfHeaders = {
        "accept": "*/*",
        "accept-language": "en-US",
        "content-type": "application/json",
        "device-id": "eb2155b3a7cf1f49bba7feadbd7ff5a9",
        "device-type": "WEB",
        "product-name": "UPDF",
        "x-token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJVaWQiOjIxNTkyNzkxOTAzMTAxNTcyMzcsIm4iOiJVUERGXzIxNTkyNzkxOTAzMTAxNTcyMzciLCJnIjoxLCJjIjpudWxsLCJCdWZmZXJUaW1lIjo4NjQwMCwiZXhwIjoxNzg2MzcwMjkxLCJpc3MiOiJxbVBsdXMiLCJuYmYiOjE3ODM3NzcyOTF9.KF4B_Eq6r8DKn_BEUtQwHcWfL3J5aagL9hFx2d7V8pM"
      };

      // 1. Create a fresh Knowledge Session
      const createRes = await fetch("https://apis.updf.com/v1/ai/knowledge/create", {
        method: "POST",
        headers: updfHeaders,
        body: JSON.stringify({"file_ids":[],"name":"New Chat"})
      });
      
      const createText = await createRes.text();
      const match = createText.match(/"id":\s*(\d+)/);
      if (!match) {
         throw new Error("Failed to extract knowledge_id: " + createText);
      }
      const knowledgeIdStr = match[1];

      // 2. Stream Chat using the fresh knowledge_id string safely
      const updfPayloadObj = {
        "id": 0,
        "content": fullPrompt,
        "target_lang": "en",
        "chat_type": "k_file_talk",
        "chat_id": 0,
        "file_id": 0,
        "file_ids": [],
        "continue": 0,
        "retry": 0,
        "single_chat_id": 0,
        "fromPagePathName": "web_app",
        "format": "md"
      };

      // Manually inject knowledge_id as a raw unquoted number in the JSON string
      const payloadStr = JSON.stringify(updfPayloadObj).replace('"chat_id":0', `"chat_id":0,"knowledge_id":${knowledgeIdStr}`);

      const response = await fetch("https://apis.updf.com/v1/ai/knowledge/talk-stream", {
        method: "POST",
        headers: updfHeaders,
        body: payloadStr
      });

      // UPDF returns NDJSON (newline-delimited JSON) without the "data: " prefix.
      // We must convert it to a standard SSE (Server-Sent Events) stream.
      let buffer = '';
      const transformStream = new TransformStream({
        transform(chunk, controller) {
          buffer += new TextDecoder().decode(chunk, { stream: true });
          const lines = buffer.split('\n');
          // Keep the last partial line in the buffer
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.trim()) {
              if (line.includes('"choices"')) {
                controller.enqueue(new TextEncoder().encode(`data: ${line}\n\n`));
              }
            }
          }
        },
        flush(controller) {
          if (buffer.trim() && buffer.includes('"choices"')) {
            controller.enqueue(new TextEncoder().encode(`data: ${buffer}\n\n`));
          }
          controller.enqueue(new TextEncoder().encode(`data: [DONE]\n\n`));
        }
      });

      const responseHeaders = new Headers(response.headers);
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      responseHeaders.set("Content-Type", "text/event-stream");

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
