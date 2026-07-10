/**
 * G4F Meta AI (Muse Spark) Worker
 *
 * Cloudflare Worker providing OpenAI-compatible chat completions
 * using Meta AI via the gateway.meta.ai WebSocket protocol.
 *
 * Requires env vars:
 * - META_COOKIE: Cookie header (datr=...; ecto_1_sess=...)
 * - META_AUTH: Authorization token (ecto1:...)
 *
 * Endpoints:
 * - POST /v1/chat/completions
 * - GET /v1/models
 * - GET /health
 */

const META_APP_ID = "1522763855472543";
const META_APP_VERSION = "1.0.0";
const META_AUTHTYPE = "15:0";
const META_DGW_VERSION = "5";
const META_DGW_UUID = "0";
const META_TIER = "prod";
const INTRO_FRAME_TYPE = 0x0f;
const PROMPT_FRAME_TYPE = 0x0d;
const PROMPT_FRAME_FLAG = 0x80;
const WARMUP_DOC_ID = "e7f802582dbfed8e181b012e010993eb";
const MODE_SWITCH_DOC_ID = "c32bbe999c48e64e855dc63177d5153f";
const DEFAULT_MODE = "think_fast";
const DEFAULT_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";

// Pre-built protobuf templates (base64) from the Python client
const HOME_WS_TEMPLATE = {
  "req-id": "ee7a35eb-df8c-4793-a1c0-10ae414f5e6e",
  "payload": "CrYGCsQDCiBLQURBQlJBX19IT01FX19VTklGSUVEX0lOUFVUX0JBUhIQMTUyMjc2Mzg1NTQ3MjU0MyInNWE1Yi04ZDRlLWYwNTQtOTllZi1iMmRlLWRiMDItMGQwNS01MmM3KigqJgokOGYxMjliMjUtYzNlMC00NzNiLWFlNzktNWViM2YyNGU1NjRjMAU6C0hVTUFOX0FHRU5UQiIKDzg2NzA1MTMxNDc2NzY5NhIPODY3MDUxMzE0NzY3Njk2UgVFQ1RPMVoRQWJyYSBXZWIgTWFpbiBLZXliCRoDCOgHIgIIAWoITWFjIE9TIFhyCnVzZXJfaW5wdXR6dU1vemlsbGEvNS4wIChNYWNpbnRvc2g7IEludGVsIE1hYyBPUyBYIDEwXzE1XzcpIEFwcGxlV2ViS2l0LzUzNy4zNiAoS0hUTUwsIGxpa2UgR2Vja28pIENocm9tZS8xNDYuMC4wLjAgU2FmYXJpLzUzNy4zNoIBC2Rlc2t0b3Bfd2VimgFHCkBlMmI4OGY5ODQ2Mzc5Y2JjMjY5NjBmYTNhZTFkMjIyMDFkZmIxOWRmNzg5MGFlNmEzYWM4YTI4ODcwYmFjNjgyFQAAAEASFAi4w6XTk4/yARC4w6XTk4/yARgCGgIgASIAKg4Ix6D+ldkzGJ6g/pXZMzIkZWU3YTM1ZWItZGY4Yy00NzkzLWExYzAtMTBhZTQxNGY1ZTZlOgBKBxIFZW4tVVNScgokNTYwN2Y0YzAtYjljZi00ZjZlLWJlYTYtZTc2N2E1OGJhMjhlGiRlMDliN2FhMC1jYzYwLTQyYTktYjk2OS00YzY1YjViZGZlNGIiJDhmMTI5YjI1LWMzZTAtNDczYi1hZTc5LTVlYjNmMjRlNTY0Y3oRIg9BbWVyaWNhL0NoaWNhZ2+CAQOwAQGSAQwKBnN0b2NrcxICCAGSAQ0KB3dlYXRoZXISAggBkgEkCh5tZXRhX2tub3dsZWRnZV9zZWFyY2hfY2Fyb3VzZWwSAggBkgEiChxtZXRhX2NhdGFsb2dfc2VhcmNoX2Nhcm91c2VsEgIIAZIBEwoNbWVkaWFfZ2FsbGVyeRICCAGiAQEDEpIBCmEKJGFiOWRkNzg5LWRlOGQtNDc5MS05ODE1LWI5YjBmMTU1MDdiNBI3CiQ4ZjEyOWIyNS1jM2UwLTQ3M2ItYWU3OS01ZWIzZjI0ZTU2NGMQyKD+ldkzGKbcxozB/KuyZygBEihIZWxsbyB0aGlzIGlzIGFub3RoZXIgdGVzdCBvZiB5b3VyIHBvd2VyIgMKATA="
};
const CHAT_WS_TEMPLATE = {
  "req-id": "c6b5d261-6624-49af-90c7-09b45c0a6bef",
  "payload": "CrIGCsADCiBLQURBQlJBX19DSEFUX19VTklGSUVEX0lOUFVUX0JBUhIQMTUyMjc2Mzg1NTQ3MjU0MyInNWE1Yi04ZDRlLWYwNTQtOTllZi1iMmRlLWRiMDItMGQwNS01MmM3KigqJgokYjA4Mzg1YTYtNWE1My00ZjE0LTk2NmUtMzQ3ZjI4MDg4NDU0MAU6C0hVTUFOX0FHRU5UQiIKDzg2NzA1MTMxNDc2NzY5NhIPODY3MDUxMzE0NzY3Njk2UgVFQ1RPMVoRQWJyYSBXZWIgTWFpbiBLZXliBRoDCOgHaghNYWMgT1MgWHIKdXNlcl9pbnB1dHp1TW96aWxsYS81LjAgKE1hY2ludG9zaDsgSW50ZWwgTWFjIE9TIFggMTBfMTVfNykgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzE0Ni4wLjAuMCBTYWZhcmkvNTM3LjM2ggELZGVza3RvcF93ZWKaAUcKQGUyYjg4Zjk4NDYzNzljYmMyNjk2MGZhM2FlMWQyMjIwMWRmYjE5ZGY3ODkwYWU2YTNhYzhhMjg4NzBiYWM2ODIVAAAAQBIUCLjDpdOTj/IBELjDpdOTj/IBGAIaAiABIgAqDgikgvuW2TMYoYL7ltkzMiRjNmI1ZDI2MS02NjI0LTQ5YWYtOTBjNy0wOWI0NWMwYTZiZWY6AEoHEgVlbi1VU1JyCiQxZDNjZGQzYy1jYTFhLTRlMDItODk1My1kZTBiYTM0NzI5ODkaJDcxODNhMzM0LTFiNWEtNGQyNi1iMjcxLWJjY2Y1NDY2NmJiZiIkYjA4Mzg1YTYtNWE1My00ZjE0LTk2NmUtMzQ3ZjI4MDg4NDU0ehEiD0FtZXJpY2EvQ2hpY2Fnb4IBA7ABAZIBDAoGc3RvY2tzEgIIAZIBDQoHd2VhdGhlchICCAGSASQKHm1ldGFfa25vd2xlZGdlX3NlYXJjaF9jYXJvdXNlbBICCAGSASIKHG1ldGFfY2F0YWxvZ19zZWFyY2hfY2Fyb3VzZWwSAggBkgETCg1tZWRpYV9nYWxsZXJ5EgIIAaIBAQMSlgEKfAokMTc4MDVmYjEtOTY3Zi00YmYyLTlmMjctOWRhYmRhMzYyMTJkEjcKJGIwODM4NWE2LTVhNTMtNGYxNC05NjZlLTM0N2YyODA4ODQ1NBCkgvuW2TMYxN23xoT2rbJnIhtlLjAwcHlKMUtxa3BHTmg5Sk9oWElNdnJRWlYSEWZvbGxvdyB1cCBwcm9iZSAyIgMKATI="
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Methods": "GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
  "Access-Control-Expose-Headers": "Content-Type, X-Provider, X-Model"
};

// ─── Protobuf Varint Helpers ─────────────────────────────────────
function encodeVarint(value) {
  const out = [];
  while (true) {
    let toWrite = value & 0x7F;
    value >>>= 7;
    // Handle large numbers (JS bitwise ops are 32-bit)
    if (value > 0 || toWrite > 0x7F) {
      // For numbers > 32 bits, use Math
    }
    if (value) {
      out.push(toWrite | 0x80);
    } else {
      out.push(toWrite);
      return new Uint8Array(out);
    }
  }
}

function encodeBigVarint(value) {
  // Handle large numbers as BigInt
  if (typeof value !== 'bigint') value = BigInt(value);
  const out = [];
  while (true) {
    let toWrite = Number(value & 0x7Fn);
    value >>= 7n;
    if (value) {
      out.push(toWrite | 0x80);
    } else {
      out.push(toWrite);
      return new Uint8Array(out);
    }
  }
}

function decodeVarint(data, offset = 0) {
  let shift = 0;
  let value = 0n;
  while (true) {
    const byte = data[offset];
    offset++;
    value |= BigInt(byte & 0x7F) << BigInt(shift);
    if (!(byte & 0x80)) {
      return [value, offset];
    }
    shift += 7;
  }
}

// ─── Protobuf Message Helpers ────────────────────────────────────
function parseMessage(data) {
  const fields = [];
  let offset = 0;
  while (offset < data.length) {
    const [tag, newOffset] = decodeVarint(data, offset);
    offset = newOffset;
    const number = Number(tag >> 3n);
    const wireType = Number(tag & 7n);

    let value;
    if (wireType === 0) {
      const [v, o] = decodeVarint(data, offset);
      value = v;
      offset = o;
    } else if (wireType === 1) {
      // 64-bit fixed
      const view = new DataView(data.buffer, data.byteOffset + offset, 8);
      value = view.getBigUint64(0, true);
      offset += 8;
    } else if (wireType === 2) {
      const [length, o] = decodeVarint(data, offset);
      offset = o;
      value = data.slice(offset, offset + Number(length));
      offset += Number(length);
    } else if (wireType === 5) {
      const view = new DataView(data.buffer, data.byteOffset + offset, 4);
      value = view.getUint32(0, true);
      offset += 4;
    } else {
      throw new Error(`Unsupported wire type: ${wireType}`);
    }
    fields.push({ number, wireType, value });
  }
  return fields;
}

function serializeMessage(fields) {
  const parts = [];
  for (const field of fields) {
    const tag = (field.number << 3) | field.wireType;
    parts.push(encodeVarint(tag));
    if (field.wireType === 0) {
      parts.push(encodeBigVarint(field.value));
    } else if (field.wireType === 1) {
      const buf = new ArrayBuffer(8);
      new DataView(buf).setBigUint64(0, BigInt(field.value), true);
      parts.push(new Uint8Array(buf));
    } else if (field.wireType === 2) {
      const raw = field.value instanceof Uint8Array ? field.value : new TextEncoder().encode(field.value);
      parts.push(encodeVarint(raw.length));
      parts.push(raw);
    } else if (field.wireType === 5) {
      const buf = new ArrayBuffer(4);
      new DataView(buf).setUint32(0, Number(field.value), true);
      parts.push(new Uint8Array(buf));
    }
  }
  // Concatenate all parts
  let totalLen = 0;
  for (const p of parts) totalLen += p.length;
  const result = new Uint8Array(totalLen);
  let off = 0;
  for (const p of parts) { result.set(p, off); off += p.length; }
  return result;
}

function getField(fields, number, occurrence = 0) {
  const matches = fields.filter(f => f.number === number);
  if (occurrence >= matches.length) throw new Error(`Field ${number} occ ${occurrence} not found`);
  return matches[occurrence];
}

function getNestedMessage(fields, path) {
  let current = fields;
  for (const num of path) {
    const field = getField(current, num);
    if (field.wireType !== 2) throw new Error(`Field ${num} is not length-delimited`);
    current = parseMessage(field.value);
  }
  return current;
}

function replaceText(field, text) {
  field.value = new TextEncoder().encode(text);
}

function replaceVarint(field, value) {
  field.value = BigInt(value);
}

function replaceTrailingUUID(field, newUUID) {
  const raw = field.value;
  if (raw.length < 36) throw new Error("Field too short for UUID");
  const prefix = raw.slice(0, raw.length - 36);
  const suffix = new TextEncoder().encode(newUUID);
  const result = new Uint8Array(prefix.length + suffix.length);
  result.set(prefix);
  result.set(suffix, prefix.length);
  field.value = result;
}

function mutateMessage(fields, path, mutator) {
  if (path.length === 0) {
    mutator(fields);
    return;
  }
  const field = getField(fields, path[0]);
  if (field.wireType !== 2) throw new Error(`Field ${path[0]} is not length-delimited`);
  const nested = parseMessage(field.value);
  mutateMessage(nested, path.slice(1), mutator);
  field.value = serializeMessage(nested);
}

// ─── Frame Builders ──────────────────────────────────────────────
function u24LE(value) {
  return new Uint8Array([value & 0xFF, (value >> 8) & 0xFF, (value >> 16) & 0xFF]);
}

function generateUUID() {
  return crypto.randomUUID();
}

function buildIntroFrame(conversationId, subSessionIdx = 0) {
  const payload = new TextEncoder().encode(JSON.stringify({
    "x-dgw-app-x-ecto-conversation-id": conversationId,
    "x-dgw-app-client-payload-type": "PROTO_INSIDE_JSON"
  }));
  const subSessBytes = new Uint8Array([subSessionIdx & 0xFF, (subSessionIdx >> 8) & 0xFF]);
  const header = new Uint8Array([INTRO_FRAME_TYPE, ...subSessBytes, ...u24LE(payload.length)]);
  const frame = new Uint8Array(header.length + payload.length);
  frame.set(header);
  frame.set(payload, header.length);
  return frame;
}

function buildPromptFrame(prompt, conversationId, requestId, templateName = "home", subSessionIdx = 0, messageSeq = 0) {
  requestId = requestId || generateUUID();
  const userMessageId = generateUUID();
  const submittedMs = Date.now();
  const uniqueMessageId = BigInt(`${submittedMs}${Math.floor(Math.random() * 9000) + 1000}`);

  const template = templateName === "chat" ? CHAT_WS_TEMPLATE : HOME_WS_TEMPLATE;
  const payloadBytes = Uint8Array.from(atob(template.payload), c => c.charCodeAt(0));
  const protoFields = parseMessage(payloadBytes);

  // Mutate conversation ID in field path [1, 1] -> field 5 (trailing UUID)
  mutateMessage(protoFields, [1, 1], (fields) => {
    replaceTrailingUUID(getField(fields, 5), conversationId);
  });

  // Mutate user message ID in field path [2, 1] -> field 1
  mutateMessage(protoFields, [2, 1], (fields) => {
    replaceText(getField(fields, 1), userMessageId);
  });

  // Mutate timestamps and unique ID in [2, 1, 2]
  mutateMessage(protoFields, [2, 1, 2], (fields) => {
    replaceText(getField(fields, 1), conversationId);
    replaceVarint(getField(fields, 2), submittedMs);
    replaceVarint(getField(fields, 3), uniqueMessageId);
  });

  // Mutate prompt text in [2] -> field 2
  mutateMessage(protoFields, [2], (fields) => {
    replaceText(getField(fields, 2), prompt);
  });

  // Mutate timestamps in [1, 5]
  mutateMessage(protoFields, [1, 5], (fields) => {
    replaceVarint(getField(fields, 1), submittedMs + 1);
    replaceVarint(getField(fields, 3), submittedMs);
  });

  // Mutate request ID in [1] -> field 6
  mutateMessage(protoFields, [1], (fields) => {
    replaceText(getField(fields, 6), requestId);
  });

  // Mutate conversation ID in [1, 10] -> field 4
  mutateMessage(protoFields, [1, 10], (fields) => {
    replaceText(getField(fields, 4), conversationId);
  });

  const updatedPayload = btoa(String.fromCharCode(...serializeMessage(protoFields)));
  const outer = JSON.stringify({ "req-id": requestId, "payload": updatedPayload });
  const innerBytes = new TextEncoder().encode(outer);
  const msgBody = new Uint8Array(2 + innerBytes.length);
  msgBody[0] = messageSeq;
  msgBody[1] = PROMPT_FRAME_FLAG;
  msgBody.set(innerBytes, 2);

  const subSessBytes = new Uint8Array([subSessionIdx & 0xFF, (subSessionIdx >> 8) & 0xFF]);
  const header = new Uint8Array([PROMPT_FRAME_TYPE, ...subSessBytes, ...u24LE(msgBody.length)]);
  const frame = new Uint8Array(header.length + msgBody.length);
  frame.set(header);
  frame.set(msgBody, header.length);
  return frame;
}

// ─── WebSocket URL Builder ───────────────────────────────────────
function buildWebSocketUrl(authorization, requestId) {
  const params = new URLSearchParams({
    "x-dgw-appid": META_APP_ID,
    "x-dgw-appversion": META_APP_VERSION,
    "x-dgw-authtype": META_AUTHTYPE,
    "x-dgw-version": META_DGW_VERSION,
    "x-dgw-uuid": META_DGW_UUID,
    "x-dgw-tier": META_TIER,
    "Authorization": authorization,
    "x-dgw-app-origin": "meta.ai",
    "x-dgw-app-clippy-request-id": requestId,
    "x-dgw-app-clippy-async": "true"
  });
  return `https://gateway.meta.ai/ws/clippy?${params.toString()}`;
}

// ─── JSON Object Extractor from Binary Payload ───────────────────
function extractJsonObjects(payload) {
  const results = [];
  let start = null;
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = 0; i < payload.length; i++) {
    const char = String.fromCharCode(payload[i]);
    if (start === null) {
      if (char === '{') {
        start = i;
        depth = 1;
        inString = false;
        escape = false;
      }
      continue;
    }
    if (inString) {
      if (escape) { escape = false; }
      else if (char === '\\') { escape = true; }
      else if (char === '"') { inString = false; }
      continue;
    }
    if (char === '"') { inString = true; }
    else if (char === '{') { depth++; }
    else if (char === '}') {
      depth--;
      if (depth === 0 && start !== null) {
        const candidate = payload.slice(start, i + 1);
        try {
          const decoded = JSON.parse(new TextDecoder().decode(candidate));
          if (typeof decoded === 'object' && decoded !== null) {
            results.push(decoded);
          }
        } catch (e) {}
        start = null;
      }
    }
  }
  return results;
}

// ─── GraphQL Warmup ──────────────────────────────────────────────
async function warmupConversation(conversationId, cookieHeader, userAgent) {
  const body = JSON.stringify({
    doc_id: WARMUP_DOC_ID,
    variables: { conversationId }
  });
  
  const response = await fetch("https://meta.ai/api/graphql", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "accept": "multipart/mixed, application/json",
      "origin": "https://meta.ai",
      "cookie": cookieHeader,
      "user-agent": userAgent
    },
    body
  });
  
  return response.ok;
}

// ─── GraphQL Mode Switch ─────────────────────────────────────────
async function switchMode(conversationId, cookieHeader, mode, userAgent) {
  const body = JSON.stringify({
    doc_id: MODE_SWITCH_DOC_ID,
    variables: { input: { conversationId, mode } }
  });
  
  const response = await fetch("https://meta.ai/api/graphql", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "accept": "multipart/mixed, application/json",
      "origin": "https://meta.ai",
      "cookie": cookieHeader,
      "user-agent": userAgent
    },
    body
  });
  
  return response.ok;
}

// ─── WebSocket Chat Handler ──────────────────────────────────────
async function metaAIChat(prompt, env) {
  const cookieHeader = env.META_COOKIE || "";
  const authorization = env.META_AUTH || "";
  const userAgent = env.META_USER_AGENT || DEFAULT_USER_AGENT;
  const mode = env.META_MODE || DEFAULT_MODE;

  if (!cookieHeader || !authorization) {
    throw new Error("META_COOKIE and META_AUTH environment variables are required");
  }

  const conversationId = generateUUID();
  const connectionRequestId = generateUUID();
  const promptRequestId = generateUUID();

  // Step 1: Warmup the conversation via GraphQL
  try {
    await warmupConversation(conversationId, cookieHeader, userAgent);
  } catch (e) {
    console.error("[MetaWorker] Warmup failed:", e.message);
  }

  // Step 2: Switch mode via GraphQL
  try {
    await switchMode(conversationId, cookieHeader, mode, userAgent);
  } catch (e) {
    console.error("[MetaWorker] Mode switch failed:", e.message);
  }

  // Step 3: Connect to WebSocket
  const wsUrl = buildWebSocketUrl(authorization, connectionRequestId);

  // Use Cloudflare's fetch-based WebSocket client
  const wsResponse = await fetch(wsUrl, {
    headers: {
      "Upgrade": "websocket",
      "Cookie": cookieHeader,
      "User-Agent": userAgent,
      "Origin": "https://meta.ai"
    }
  });

  const ws = wsResponse.webSocket;
  if (!ws) {
    throw new Error("WebSocket upgrade failed");
  }
  ws.accept();

  // Step 4: Send intro frame
  const introFrame = buildIntroFrame(conversationId);
  ws.send(introFrame);

  // Step 5: Send prompt frame
  const promptFrame = buildPromptFrame(prompt, conversationId, promptRequestId, "home");
  ws.send(promptFrame);

  // Step 6: Collect response
  return new Promise((resolve, reject) => {
    let fullText = "";
    let currentText = "";
    let timeout;
    const chunks = [];

    const resetTimeout = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        ws.close();
        if (fullText || currentText) {
          resolve({ text: fullText || currentText, chunks });
        } else {
          reject(new Error("Response timeout — no text received"));
        }
      }, 5000); // 5 second timeout for no new data
    };

    resetTimeout();

    ws.addEventListener("message", (event) => {
      resetTimeout();
      try {
        let data = event.data;
        let bytes;
        if (typeof data === "string") {
          bytes = new TextEncoder().encode(data);
        } else if (data instanceof ArrayBuffer) {
          bytes = new Uint8Array(data);
        } else {
          return;
        }

        const objects = extractJsonObjects(bytes);
        for (const obj of objects) {
          const eventType = obj.type;

          if (eventType === "patch") {
            for (const op of (obj.operations || [])) {
              if (
                op.op === "delta" &&
                op.path === "/sections/0/view_model/primitive/text" &&
                typeof op.value === "string"
              ) {
                currentText += op.value;
                chunks.push(op.value);
              }
            }
          } else if (eventType === "full") {
            const sections = obj.response?.sections || [];
            for (const section of sections) {
              const text = section?.view_model?.primitive?.text;
              if (typeof text === "string") {
                if (text.startsWith(currentText)) {
                  const delta = text.slice(currentText.length);
                  if (delta) chunks.push(delta);
                }
                currentText = text;
                fullText = text;
                break;
              }
            }
          }
        }
      } catch (e) {
        console.error("[MetaWorker] Message parse error:", e);
      }
    });

    ws.addEventListener("close", () => {
      if (timeout) clearTimeout(timeout);
      resolve({ text: fullText || currentText, chunks });
    });

    ws.addEventListener("error", (e) => {
      if (timeout) clearTimeout(timeout);
      reject(new Error("WebSocket error"));
    });
  });
}

// ─── Streaming WebSocket Chat ────────────────────────────────────
function metaAIChatStream(prompt, env) {
  const encoder = new TextEncoder();
  const streamId = `chatcmpl-meta-${crypto.randomUUID().substring(0, 8)}`;
  const created = Math.floor(Date.now() / 1000);

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  (async () => {
    try {
      const cookieHeader = env.META_COOKIE || "";
      const authorization = env.META_AUTH || "";
      const userAgent = env.META_USER_AGENT || DEFAULT_USER_AGENT;
      const mode = env.META_MODE || DEFAULT_MODE;

      if (!cookieHeader || !authorization) {
        await writer.write(encoder.encode(`data: ${JSON.stringify({
          id: streamId, object: "chat.completion.chunk", created, model: "meta-ai",
          choices: [{ index: 0, delta: { content: "[Error: META_COOKIE and META_AUTH env vars required]" }, finish_reason: "stop" }]
        })}\n\n`));
        await writer.write(encoder.encode("data: [DONE]\n\n"));
        await writer.close();
        return;
      }

      const conversationId = generateUUID();
      const connectionRequestId = generateUUID();
      const promptRequestId = generateUUID();

      // Warmup + mode switch
      try { await warmupConversation(conversationId, cookieHeader, userAgent); } catch (e) {}
      try { await switchMode(conversationId, cookieHeader, mode, userAgent); } catch (e) {}

      // Connect WebSocket
      const wsUrl = buildWebSocketUrl(authorization, connectionRequestId);
      const wsResponse = await fetch(wsUrl, {
        headers: {
          "Upgrade": "websocket",
          "Cookie": cookieHeader,
          "User-Agent": userAgent,
          "Origin": "https://meta.ai"
        }
      });

      const ws = wsResponse.webSocket;
      if (!ws) {
        throw new Error("WebSocket upgrade failed");
      }
      ws.accept();

      // Send frames
      ws.send(buildIntroFrame(conversationId));
      ws.send(buildPromptFrame(prompt, conversationId, promptRequestId, "home"));

      let sentRole = false;
      let currentText = "";
      let timeout;

      const resetTimeout = () => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(async () => {
          ws.close();
          try {
            await writer.write(encoder.encode(`data: ${JSON.stringify({
              id: streamId, object: "chat.completion.chunk", created, model: "meta-ai",
              choices: [{ index: 0, delta: {}, finish_reason: "stop" }]
            })}\n\n`));
            await writer.write(encoder.encode("data: [DONE]\n\n"));
            await writer.close();
          } catch (e) {}
        }, 5000);
      };

      resetTimeout();

      ws.addEventListener("message", async (event) => {
        resetTimeout();
        try {
          let bytes;
          if (typeof event.data === "string") {
            bytes = new TextEncoder().encode(event.data);
          } else if (event.data instanceof ArrayBuffer) {
            bytes = new Uint8Array(event.data);
          } else return;

          const objects = extractJsonObjects(bytes);
          for (const obj of objects) {
            let delta = "";
            if (obj.type === "patch") {
              for (const op of (obj.operations || [])) {
                if (op.op === "delta" && op.path === "/sections/0/view_model/primitive/text" && typeof op.value === "string") {
                  delta = op.value;
                  currentText += delta;
                }
              }
            } else if (obj.type === "full") {
              const sections = obj.response?.sections || [];
              for (const section of sections) {
                const text = section?.view_model?.primitive?.text;
                if (typeof text === "string" && text !== currentText) {
                  if (text.startsWith(currentText)) {
                    delta = text.slice(currentText.length);
                  } else {
                    delta = text;
                  }
                  currentText = text;
                  break;
                }
              }
            }

            if (delta) {
              const chunk = {
                id: streamId, object: "chat.completion.chunk", created, model: "meta-ai",
                choices: [{
                  index: 0,
                  delta: { ...(sentRole ? {} : { role: "assistant" }), content: delta },
                  finish_reason: null
                }]
              };
              sentRole = true;
              await writer.write(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
            }
          }
        } catch (e) {
          console.error("[MetaWorker] Stream message error:", e);
        }
      });

      ws.addEventListener("close", async () => {
        if (timeout) clearTimeout(timeout);
        try {
          await writer.write(encoder.encode(`data: ${JSON.stringify({
            id: streamId, object: "chat.completion.chunk", created, model: "meta-ai",
            choices: [{ index: 0, delta: {}, finish_reason: "stop" }]
          })}\n\n`));
          await writer.write(encoder.encode("data: [DONE]\n\n"));
          await writer.close();
        } catch (e) {}
      });

      ws.addEventListener("error", async () => {
        if (timeout) clearTimeout(timeout);
        try { await writer.close(); } catch (e) {}
      });

    } catch (e) {
      console.error("[MetaWorker] Stream error:", e);
      try {
        await writer.write(encoder.encode(`data: ${JSON.stringify({
          id: streamId, object: "chat.completion.chunk", created, model: "meta-ai",
          choices: [{ index: 0, delta: { content: `[Error: ${e.message}]` }, finish_reason: "stop" }]
        })}\n\n`));
        await writer.write(encoder.encode("data: [DONE]\n\n"));
        await writer.close();
      } catch (e2) {}
    }
  })();

  return new Response(readable, {
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Provider": "meta-ai",
      "X-Model": "meta-ai"
    }
  });
}

// ─── Helpers ─────────────────────────────────────────────────────
function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
  });
}

function extractLastUserMessage(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return "";
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (!msg || msg.role !== "user") continue;
    if (typeof msg.content === "string") return msg.content;
    if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === "text" && typeof part.text === "string") return part.text;
      }
    }
    return String(msg.content ?? "");
  }
  return "";
}

// ─── Handlers ────────────────────────────────────────────────────
async function handleModels() {
  return jsonResponse({
    object: "list",
    data: [
      { id: "meta-ai", object: "model", created: 1700000000, owned_by: "meta", name: "Meta AI (Muse Spark)", provider: "meta" },
      { id: "llama-4-maverick", object: "model", created: 1700000000, owned_by: "meta", name: "Llama 4 Maverick", provider: "meta" }
    ]
  });
}

async function handleChatCompletions(request, env) {
  if (request.method !== "POST") {
    return jsonResponse({ error: { message: "Method not allowed" } }, 405);
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return jsonResponse({ error: { message: "Invalid JSON body" } }, 400);
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const prompt = extractLastUserMessage(messages);
  if (!prompt) {
    return jsonResponse({ error: { message: "No user message found" } }, 400);
  }

  const stream = Boolean(body.stream);
  const model = body.model || "meta-ai";

  if (stream) {
    return metaAIChatStream(prompt, env);
  }

  // Non-streaming
  try {
    const result = await metaAIChat(prompt, env);
    const streamId = `chatcmpl-meta-${crypto.randomUUID().substring(0, 8)}`;
    return jsonResponse({
      id: streamId,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{
        index: 0,
        message: { role: "assistant", content: result.text },
        finish_reason: "stop"
      }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    });
  } catch (e) {
    return jsonResponse({ error: { message: e.message } }, 502);
  }
}

// ─── Worker Export ───────────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      if (pathname.endsWith("/models")) {
        return handleModels();
      }

      if (pathname.endsWith("/chat/completions")) {
        return handleChatCompletions(request, env);
      }

      if (pathname === "/health" || pathname === "/meta/health") {
        try {
          const res = await fetch("https://gateway.meta.ai/");
          return jsonResponse({
            status: "ok",
            service: "meta-ai-worker",
            hasAuth: Boolean(env.META_COOKIE && env.META_AUTH),
            gatewayStatus: res.status
          });
        } catch (e) {
          return jsonResponse({
            status: "error",
            service: "meta-ai-worker",
            gatewayError: e.message
          });
        }
      }

      if (pathname === "/" || pathname === "/meta" || pathname === "/meta/") {
        return jsonResponse({
          service: "G4F Meta AI Worker",
          version: "1.0.0",
          description: "Cloudflare Worker for Meta AI (Muse Spark) via WebSocket",
          endpoints: {
            chat: "/v1/chat/completions",
            models: "/v1/models",
            health: "/health"
          },
          requires: ["META_COOKIE", "META_AUTH"]
        });
      }

      return jsonResponse({ error: "Not found" }, 404);
    } catch (error) {
      console.error("[MetaWorker] Error:", error);
      return jsonResponse({ error: { message: error.message || "Internal server error" } }, 500);
    }
  }
};
