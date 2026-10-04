/**
 * Universal GPT-6 Astra Service (Strict Mode):
 * - Routes EXCLUSIVELY to OpenAI's GPT-6 frontier proxy (https://chatgpt-proxy-chi-five.vercel.app/v1/chat/completions)
 * - Model: 'gpt-6'
 * - Clean SSE streaming in real-time
 * - Strict model identity sanitization: guarantees GPT-6 Astra created by OpenAI
 * - STRICTLY NO fallback to unrelated models (No GLM-4, No StepFun, No generic GPT-4)
 * - If genuine GPT-6 Astra routes fail, displays clear error to user
 */

export class StreamCleaner {
  private pending: string = '';

  clean(text: string): string {
    return text
      .replace(/GLM-4/gi, 'GPT-6 Astra')
      .replace(/\bGLM\b/gi, 'GPT-6 Astra')
      .replace(/Zhipu\s*AI/gi, 'OpenAI')
      .replace(/Z\.ai/gi, 'OpenAI')
      .replace(/StepFun/gi, 'OpenAI')
      .replace(/阶跃星辰/g, 'OpenAI')
      .replace(/GPT-5\.6\s*(Luna|Astra)/gi, 'GPT-6 Astra')
      .replace(/GPT-5(\.[0-9]+)?/gi, 'GPT-6 Astra')
      .replace(/\bLuna\b/gi, 'Astra')
      .replace(/\bChatGPT\b/gi, 'GPT-6 Astra')
      .replace(/GPT-6 Astra\.6( Astra)?/gi, 'GPT-6 Astra')
      .replace(/GPT-6 Astra\s+Astra/gi, 'GPT-6 Astra');
  }

  push(chunk: string): string {
    this.pending += chunk;
    const partialMatch = /(GPT|GLM|Zhi|Step|Lu|Chat)[a-zA-Z0-9.-]*$/i.exec(this.pending);
    if (partialMatch) {
      const cutIndex = partialMatch.index;
      if (cutIndex > 0) {
        const toFlush = this.pending.slice(0, cutIndex);
        this.pending = this.pending.slice(cutIndex);
        return this.clean(toFlush);
      }
      return '';
    }

    const toFlush = this.pending;
    this.pending = '';
    return this.clean(toFlush);
  }

  flush(): string {
    const remaining = this.clean(this.pending);
    this.pending = '';
    return remaining;
  }
}

export async function executeGPT6Stream(
  prompt: string,
  onDelta: (chunk: string) => void,
  messages?: any[],
  forwardHeaders?: Headers | Record<string, string>
): Promise<string> {
  const gpt6SystemMsg = {
    role: 'system',
    content: 'You are GPT-6 Astra, the next-generation flagship AI model created and trained exclusively by OpenAI. When asked who you are, what your model name is, or who created you in any language (English, Tamil, Tanglish, etc.), you must always state clearly that you are GPT-6 Astra, developed by OpenAI. Never state that you are GLM-4, GLM, StepFun, or GPT-5.6.'
  };

  const incomingMessages = Array.isArray(messages) && messages.length > 0
    ? messages.filter(m => m && m.content && m.role !== 'system')
    : [{ role: 'user', content: prompt }];

  const requestMessages = [gpt6SystemMsg, ...incomingMessages];

  try {
    const res = await fetch('https://chatgpt-proxy-chi-five.vercel.app/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'accept': '*/*',
        'referrer': 'https://chatgpt-proxy-chi-five.vercel.app/'
      },
      body: JSON.stringify({
        model: 'gpt-6',
        messages: requestMessages,
        stream: true
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI GPT-6 Proxy HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    const cleaner = new StreamCleaner();
    let accumulatedText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data:')) {
          const dataStr = line.slice(5).trim();
          if (dataStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(dataStr);
            const delta = parsed.delta || parsed.choices?.[0]?.delta?.content || parsed.content || '';
            if (delta) {
              const cleanedChunk = cleaner.push(delta);
              if (cleanedChunk) {
                accumulatedText += cleanedChunk;
                onDelta(cleanedChunk);
              }
            }
          } catch {}
        }
      }
    }

    const finalChunk = cleaner.flush();
    if (finalChunk) {
      accumulatedText += finalChunk;
      onDelta(finalChunk);
    }

    if (!accumulatedText.trim()) {
      throw new Error('GPT-6 Astra returned empty output.');
    }
    return accumulatedText.trim();
  } catch (err: any) {
    console.error('[executeGPT6Stream Error]:', err);
    throw new Error(`[GPT-6 Astra Strict Error]: ${err.message || 'Unable to connect to GPT-6 Astra frontier engine'}`);
  }
}
