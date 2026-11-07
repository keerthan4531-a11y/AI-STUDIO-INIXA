import crypto from 'crypto';

const BUNDLE = 'com.aichatmaster.chat.gp';
const APP_VERSION = '2.6.8';
const SALT = 't6KeG6aKR5pm65oWn5aqS6LWE57O757ufS2V2aW4uWWFuZw';
const AES_KEY = Buffer.from('Ka7Ya98107EdGXQa', 'utf8');
const AES_IV = Buffer.from('yc0q2icx1oq4lijm', 'utf8');
const GAI_URL = 'https://api.chatgai.fun/common/sse/chat';

function aesEncrypt(plainText: string): string {
  const cipher = crypto.createCipheriv('aes-128-cbc', AES_KEY, AES_IV);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function sha1(text: string): string {
  return crypto.createHash('sha1').update(text, 'utf8').digest('hex');
}

function getRandomResidentialIp(): string {
  return `${Math.floor(Math.random() * 150) + 50}.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}`;
}

/**
 * Executes a ChatGai chat completion with native AES encryption and IP quota rotation.
 */
export async function executeGaiChat(
  rawModel: string,
  messages: any[],
  stream: boolean = true
): Promise<Response> {
  const model = rawModel.replace(/^(gai\/|chatgai\/)/, '');

  // Format messages
  let question = '';
  if (!messages || messages.length === 0) {
    question = 'Hello';
  } else if (messages.length === 1) {
    const m = messages[0];
    question = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
  } else {
    // Multi-turn conversation format
    question = messages
      .map((m: any) => {
        const role = m.role === 'user' ? 'User' : m.role === 'system' ? 'System' : 'Assistant';
        const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
        return `${role}: ${content}`;
      })
      .join('\n\n') + '\n\nAssistant:';
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const conversationId = crypto.randomUUID();

  // Signature calculation: keys sorted alphabetically
  const signStr = `aiVersion=${model}&bundle=${BUNDLE}&conversationId=${conversationId}&nonce=${nonce}&question=${question}&timestamp=${timestamp}&version=${APP_VERSION}`;
  const signature = sha1(signStr + SALT);

  const innerObj = {
    aiVersion: model,
    bundle: BUNDLE,
    conversationId: conversationId,
    language: 'en',
    needSearch: false,
    nonce: nonce,
    question: question,
    signature: signature,
    timestamp: timestamp,
    type: '1',
    version: APP_VERSION
  };

  const securityHex = aesEncrypt(JSON.stringify(innerObj));
  const envelopeBody = JSON.stringify({
    bundle: BUNDLE,
    bundleId: BUNDLE,
    security: securityHex
  });

  const fakeIp = getRandomResidentialIp();
  const deviceId = crypto.randomUUID().replace(/-/g, '').slice(0, 16);

  const upstreamRes = await fetch(GAI_URL, {
    method: 'POST',
    headers: {
      'UserType': 'app_user',
      'x-bundle-id': BUNDLE,
      'x-app-version': APP_VERSION,
      'x-language': 'en',
      'x-device-type': 'android',
      'x-device-id': deviceId,
      'X-Forwarded-For': fakeIp,
      'X-Real-IP': fakeIp,
      'Client-IP': fakeIp,
      'content-type': 'application/json'
    },
    body: envelopeBody
  });

  if (!upstreamRes.ok) {
    const errText = await upstreamRes.text().catch(() => '');
    throw new Error(`ChatGai upstream error HTTP ${upstreamRes.status}: ${errText}`);
  }

  const streamId = `chatcmpl-gai-${crypto.randomUUID().slice(0, 8)}`;
  const created = Math.floor(Date.now() / 1000);

  // If streaming
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
                const payload = trimmed.slice(5).trim();
                if (payload === '[DONE]') {
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  controller.close();
                  return;
                }

                try {
                  const parsed = JSON.parse(payload);
                  if (parsed.code !== undefined && parsed.code !== 0) {
                    const errMsg = parsed.message || 'Error from ChatGai upstream';
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

                  const answer = parsed.data?.answer || '';
                  if (answer) {
                    const chunk = {
                      id: streamId,
                      object: 'chat.completion.chunk',
                      created,
                      model,
                      choices: [{ index: 0, delta: { content: answer }, finish_reason: null }]
                    };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
                  }
                } catch {
                  // Non-JSON line, ignore
                }
              }
            }
          }

          // Emit final stop
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
        'X-Provider': 'ChatGai',
        'X-Model': model
      }
    });
  }

  // Non-streaming: accumulate response
  const rawText = await upstreamRes.text();
  const lines = rawText.split('\n');
  let fullAnswer = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(':')) continue;
    if (trimmed.startsWith('data:')) {
      const payload = trimmed.slice(5).trim();
      if (payload === '[DONE]') continue;
      try {
        const parsed = JSON.parse(payload);
        const ans = parsed.data?.answer || '';
        if (ans) fullAnswer += ans;
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
        'X-Provider': 'ChatGai',
        'X-Model': model
      }
    }
  );
}

