import { NextResponse } from 'next/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, anthropic-version',
};

export async function handleAnthropicOptions() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function handleAnthropicGet() {
  return NextResponse.json(
    {
      status: 'online',
      service: 'Inixa Anthropic Adapter for Claude Code',
      endpoints: ['/v1/messages', '/api/v1/messages', '/messages'],
    },
    { headers: corsHeaders }
  );
}

function extractSystemPrompt(system: any): string {
  if (!system) return '';
  if (typeof system === 'string') return system;
  if (Array.isArray(system)) {
    return system
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && item.type === 'text') return item.text || '';
        return '';
      })
      .filter(Boolean)
      .join('\n\n');
  }
  return '';
}

function formatAnthropicContent(content: any): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (typeof block === 'string') return block;
        if (block && typeof block === 'object') {
          if (block.type === 'text') return block.text || '';
          if (block.type === 'image') return '[Image]';
          if (block.type === 'tool_use') return `[Tool Use: ${block.name}(${JSON.stringify(block.input || {})})]`;
          if (block.type === 'tool_result') {
            const resText = typeof block.content === 'string' ? block.content : JSON.stringify(block.content);
            return `[Tool Result: ${resText}]`;
          }
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
  return String(content);
}

export async function handleAnthropicMessages(request: Request) {
  try {
    const body = await request.json();
    const url = new URL(request.url);

    // Extract System Prompt and Messages
    const systemPrompt = extractSystemPrompt(body.system);
    const openAiMessages: Array<{ role: string; content: string }> = [];

    if (systemPrompt) {
      openAiMessages.push({ role: 'system', content: systemPrompt });
    }

    if (Array.isArray(body.messages)) {
      for (const msg of body.messages) {
        const role = msg.role === 'assistant' ? 'assistant' : 'user';
        const contentStr = formatAnthropicContent(msg.content);
        if (contentStr) {
          openAiMessages.push({ role, content: contentStr });
        }
      }
    }

    // Select target model for gemini proxy
    let targetModel = body.model || 'overchat/gpt-5.2';
    if (targetModel.startsWith('claude-')) {
      targetModel = 'overchat/claude-sonnet-4.6';
    }

    const isStream = body.stream !== false;
    const internalUrl = `${url.origin}/api/chat/completions`;

    const proxyRes = await fetch(internalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': url.origin,
      },
      body: JSON.stringify({
        model: targetModel,
        messages: openAiMessages,
        stream: isStream,
      }),
    });

    if (!proxyRes.ok) {
      const errText = await proxyRes.text();
      return NextResponse.json(
        {
          type: 'error',
          error: {
            type: 'api_error',
            message: `Internal model proxy error: ${errText}`,
          },
        },
        { status: proxyRes.status, headers: corsHeaders }
      );
    }

    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Non-streaming response
    if (!isStream) {
      const jsonRes = await proxyRes.json();
      const textContent = jsonRes?.choices?.[0]?.message?.content || '';

      return NextResponse.json(
        {
          id: msgId,
          type: 'message',
          role: 'assistant',
          model: body.model || 'claude-3-5-sonnet-20241022',
          content: [
            {
              type: 'text',
              text: textContent,
            },
          ],
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage: {
            input_tokens: openAiMessages.reduce((acc, m) => acc + m.content.length / 4, 0),
            output_tokens: textContent.length / 4,
          },
        },
        { headers: corsHeaders }
      );
    }

    // Streaming response (SSE)
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const upstreamReader = proxyRes.body?.getReader();

    const stream = new ReadableStream({
      async start(controller) {
        // 1. Initial event headers for Anthropic SSE
        const startEvents = [
          `event: message_start\ndata: ${JSON.stringify({
            type: 'message_start',
            message: {
              id: msgId,
              type: 'message',
              role: 'assistant',
              content: [],
              model: body.model || 'claude-3-5-sonnet-20241022',
              stop_reason: null,
              stop_sequence: null,
              usage: { input_tokens: 10, output_tokens: 1 },
            },
          })}\n\n`,
          `event: content_block_start\ndata: ${JSON.stringify({
            type: 'content_block_start',
            index: 0,
            content_block: { type: 'text', text: '' },
          })}\n\n`,
          `event: ping\ndata: ${JSON.stringify({ type: 'ping' })}\n\n`,
        ];

        for (const evt of startEvents) {
          controller.enqueue(encoder.encode(evt));
        }

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

              if (trimmed === 'data: [DONE]') {
                continue;
              }

              if (trimmed.startsWith('data: ')) {
                const dataStr = trimmed.slice(6);
                try {
                  const parsed = JSON.parse(dataStr);
                  const deltaText = parsed?.choices?.[0]?.delta?.content || '';

                  if (deltaText) {
                    const deltaEvt = `event: content_block_delta\ndata: ${JSON.stringify({
                      type: 'content_block_delta',
                      index: 0,
                      delta: { type: 'text_delta', text: deltaText },
                    })}\n\n`;
                    controller.enqueue(encoder.encode(deltaEvt));
                  }
                } catch {
                  // Ignore JSON parse errors for non-JSON lines
                }
              }
            }
          }
        } catch (err) {
          console.error('[Anthropic Adapter] Stream processing error:', err);
        } finally {
          // Final end events
          const endEvents = [
            `event: content_block_stop\ndata: ${JSON.stringify({
              type: 'content_block_stop',
              index: 0,
            })}\n\n`,
            `event: message_delta\ndata: ${JSON.stringify({
              type: 'message_delta',
              delta: { stop_reason: 'end_turn', stop_sequence: null },
              usage: { output_tokens: 50 },
            })}\n\n`,
            `event: message_stop\ndata: ${JSON.stringify({ type: 'message_stop' })}\n\n`,
          ];

          for (const evt of endEvents) {
            controller.enqueue(encoder.encode(evt));
          }
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        ...corsHeaders,
      },
    });
  } catch (err: any) {
    console.error('[Anthropic Adapter Error]:', err);
    return NextResponse.json(
      {
        type: 'error',
        error: {
          type: 'api_error',
          message: err.message || 'Internal Anthropic Adapter Error',
        },
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
