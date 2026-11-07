import crypto from 'crypto';

const UPSTREAM_URL = 'https://chat-ai.begamob.com/api/v3/chat/stream';
const SECRET_KEY = 'stteam-ikameglobal-chatapiopenai';
const BUNDLE_ID = 'com.chat.chatai.chatbot.aichatbot';
const VERSION = '1.5.5';

function base64Url(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Generates client-side self-signed HS256 JWT for Begamob OneSearch API.
 * Bypasses login, cookies, device registration, and account pools.
 */
export function generateOneSearchJwt(): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const nowMs = Date.now();
  const nowSec = Math.floor(nowMs / 1000);
  const payload = {
    iat: nowMs,
    exp: nowSec + 86400,
    bundleId: BUNDLE_ID,
    os: 'Android',
    versionApp: VERSION,
    timezone: 'Asia/Shanghai'
  };

  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const signature = crypto.createHmac('sha256', SECRET_KEY).update(unsigned).digest();
  return `${unsigned}.${base64Url(signature)}`;
}

/**
 * Formats incoming OpenAI-style messages into OneSearch Begamob payload structure.
 */
function formatMessages(messages: any[]): any[] {
  if (!messages || messages.length === 0) {
    return [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }];
  }

  return messages.map((m: any) => {
    let role = m.role || 'user';
    if (role === 'system') role = 'user'; // OneSearch prefers user or assistant

    if (Array.isArray(m.content)) {
      return { role, content: m.content };
    }

    const textContent = typeof m.content === 'string' ? m.content : JSON.stringify(m.content || '');
    return {
      role,
      content: [{ type: 'text', text: textContent }]
    };
  });
}

/**
 * Executes a streaming or non-streaming chat completion with Begamob OneSearch.
 */
export async function executeOneSearchChat(
  rawModel: string,
  messages: any[],
  stream: boolean = true,
  options: { webSearch?: boolean; maxTokens?: number } = {}
): Promise<Response> {
  const model = rawModel.replace(/^(onesearch\/|begamob\/)/i, '');
  const token = generateOneSearchJwt();
  const deviceId = crypto.randomUUID();

  const formattedMessages = formatMessages(messages);

  const payload: Record<string, any> = {
    max_tokens: options.maxTokens || 4096,
    model: model,
    messages: formattedMessages,
    response_length: 'medium',
    response_tone: 'default',
    topic_type: 'general',
    image_and_analytic: false,
    tools: options.webSearch ? ['web_search'] : [],
    is_image_vip: false
  };

  const upstreamRes = await fetch(UPSTREAM_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'user-header': `bundleId:${BUNDLE_ID}/versionApp:${VERSION}/OS:Android/osVersion:34/userId:/deviceId:${deviceId}`,
      'x-app-version': VERSION,
      'x-app-bundle-id': BUNDLE_ID,
      'x-os': 'android',
      'Content-Type': 'application/json',
      'User-Agent': 'okhttp/4.12.0'
    },
    body: JSON.stringify(payload)
  });

  if (!upstreamRes.ok && upstreamRes.status !== 201) {
    const errText = await upstreamRes.text().catch(() => '');
    throw new Error(`OneSearch upstream HTTP ${upstreamRes.status}: ${errText}`);
  }

  const streamId = `chatcmpl-onesearch-${crypto.randomUUID().slice(0, 8)}`;
  const created = Math.floor(Date.now() / 1000);

  // ── Streaming Handler ──
  if (stream) {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const upstreamReader = upstreamRes.body?.getReader();

    const transformStream = new ReadableStream({
      async start(controller) {
        if (!upstreamReader) {
          controller.close();
          return;
        }

        let buffer = '';
        try {
          while (true) {
            const { done, value } = await upstreamReader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith(':')) continue;

              if (trimmed.startsWith('data:')) {
                const payloadStr = trimmed.slice(5).trim();
                if (payloadStr === '[DONE]') {
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  controller.close();
                  return;
                }

                try {
                  const parsed = JSON.parse(payloadStr);

                  // Error packet detection
                  if (parsed.error) {
                    const errMsg = parsed.error.message || 'Error from OneSearch upstream';
                    const errChunk = {
                      id: streamId,
                      object: 'chat.completion.chunk',
                      created,
                      model,
                      choices: [{ index: 0, delta: { content: `\n\n⚠️ ${errMsg}` }, finish_reason: 'stop' }]
                    };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(errChunk)}\n\n`));
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    controller.close();
                    return;
                  }

                  // Data packet
                  const chunkContent = parsed.data?.contentText || parsed.data?.content || '';
                  const finishReason = parsed.data?.finishReason || null;

                  if (chunkContent) {
                    const chunk = {
                      id: streamId,
                      object: 'chat.completion.chunk',
                      created,
                      model,
                      choices: [{ index: 0, delta: { content: chunkContent }, finish_reason: null }]
                    };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
                  }

                  if (finishReason === 'stop') {
                    const stopChunk = {
                      id: streamId,
                      object: 'chat.completion.chunk',
                      created,
                      model,
                      choices: [{ index: 0, delta: {}, finish_reason: 'stop' }]
                    };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(stopChunk)}\n\n`));
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    controller.close();
                    return;
                  }
                } catch {
                  // Non-JSON line, continue
                }
              }
            }
          }

          // Fallback close
          const finalStopChunk = {
            id: streamId,
            object: 'chat.completion.chunk',
            created,
            model,
            choices: [{ index: 0, delta: {}, finish_reason: 'stop' }]
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalStopChunk)}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err: any) {
          controller.error(err);
        }
      }
    });

    return new Response(transformStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Provider': 'OneSearch',
        'X-Model': model
      }
    });
  }

  // ── Non-Streaming Handler ──
  const rawText = await upstreamRes.text();
  const lines = rawText.split('\n');
  let fullAnswer = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(':')) continue;
    if (trimmed.startsWith('data:')) {
      const payloadStr = trimmed.slice(5).trim();
      if (payloadStr === '[DONE]') continue;
      try {
        const parsed = JSON.parse(payloadStr);
        const chunk = parsed.data?.contentText || parsed.data?.content || '';
        if (chunk) fullAnswer += chunk;
      } catch {}
    }
  }

  return new Response(
    JSON.stringify({
      id: streamId,
      object: 'chat.completion',
      created,
      model,
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: fullAnswer },
          finish_reason: 'stop'
        }
      ],
      reply: fullAnswer
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Provider': 'OneSearch',
        'X-Model': model
      }
    }
  );
}

