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
      service: 'Inixa Anthropic Adapter for Claude Code (Tool Enabled)',
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
          if (block.type === 'tool_use') {
            return `Tool Call [${block.name}]: ${JSON.stringify(block.input || {})}`;
          }
          if (block.type === 'tool_result') {
            const resText = typeof block.content === 'string' ? block.content : JSON.stringify(block.content || '');
            return `Tool Output: ${resText}`;
          }
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
  return String(content);
}

function extractShellCommandsFromOutput(text: string): string | null {
  if (!text) return null;

  // 1. Look for ```bash or ```sh or ```shell code blocks
  const codeBlockRegex = /```(?:bash|sh|shell|cmd|powershell)?\s*\n([\s\S]*?)\n```/gi;
  let match;
  const foundCommands: string[] = [];

  while ((match = codeBlockRegex.exec(text)) !== null) {
    const code = match[1].trim();
    if (code && (code.includes('mkdir') || code.includes('cat ') || code.includes('touch') || code.includes('echo') || code.includes('npm') || code.includes('git') || code.includes('cd '))) {
      foundCommands.push(code);
    }
  }

  if (foundCommands.length > 0) {
    return foundCommands.join('\n\n');
  }

  // 2. Check for direct multi-line script containing mkdir / cat > / touch / echo
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const isScript = lines.some(l => l.startsWith('mkdir ') || l.startsWith('cat >') || l.startsWith('touch ') || l.startsWith('echo '));

  if (isScript) {
    return text.trim();
  }

  return null;
}

export async function handleAnthropicMessages(request: Request) {
  try {
    const body = await request.json();
    const url = new URL(request.url);

    // Check available tools from Claude Code
    const hasTools = Array.isArray(body.tools) && body.tools.length > 0;
    const hasBashTool = hasTools && body.tools.some((t: any) => t.name === 'Bash');

    // Extract System Prompt and Messages
    let systemPrompt = extractSystemPrompt(body.system);
    const openAiMessages: Array<{ role: string; content: string }> = [];

    if (hasBashTool) {
      systemPrompt = `${systemPrompt}\n\n[CRITICAL CLI INSTRUCTION]: You are powering Claude Code CLI. When the user requests to create files, folders, or execute actions, output executable bash shell commands inside a \`\`\`bash ... \`\`\` block so that the filesystem proxy can run them automatically on the user's computer.`;
    }

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
      const bashCmd = hasBashTool ? extractShellCommandsFromOutput(textContent) : null;

      const contentBlocks: any[] = [];
      if (textContent) {
        contentBlocks.push({ type: 'text', text: textContent });
      }

      if (bashCmd) {
        contentBlocks.push({
          type: 'tool_use',
          id: `toolu_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: 'Bash',
          input: { command: bashCmd },
        });
      }

      return NextResponse.json(
        {
          id: msgId,
          type: 'message',
          role: 'assistant',
          model: body.model || 'claude-3-5-sonnet-20241022',
          content: contentBlocks.length > 0 ? contentBlocks : [{ type: 'text', text: '' }],
          stop_reason: bashCmd ? 'tool_use' : 'end_turn',
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
        // Initial event headers for Anthropic SSE
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
        let fullAccumulatedText = '';

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
              if (trimmed === 'data: [DONE]') continue;

              if (trimmed.startsWith('data: ')) {
                const dataStr = trimmed.slice(6);
                try {
                  const parsed = JSON.parse(dataStr);
                  const deltaText = parsed?.choices?.[0]?.delta?.content || '';

                  if (deltaText) {
                    fullAccumulatedText += deltaText;
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
          controller.enqueue(
            encoder.encode(
              `event: content_block_stop\ndata: ${JSON.stringify({ type: 'content_block_stop', index: 0 })}\n\n`
            )
          );

          // Check if shell commands were outputted that should trigger Bash tool execution in Claude Code
          const extractedCmd = hasBashTool ? extractShellCommandsFromOutput(fullAccumulatedText) : null;

          if (extractedCmd) {
            const toolId = `toolu_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const toolStart = `event: content_block_start\ndata: ${JSON.stringify({
              type: 'content_block_start',
              index: 1,
              content_block: { type: 'tool_use', id: toolId, name: 'Bash', input: {} },
            })}\n\n`;
            const toolDelta = `event: content_block_delta\ndata: ${JSON.stringify({
              type: 'content_block_delta',
              index: 1,
              delta: { type: 'input_json_delta', partial_json: JSON.stringify({ command: extractedCmd }) },
            })}\n\n`;
            const toolStop = `event: content_block_stop\ndata: ${JSON.stringify({ type: 'content_block_stop', index: 1 })}\n\n`;

            controller.enqueue(encoder.encode(toolStart));
            controller.enqueue(encoder.encode(toolDelta));
            controller.enqueue(encoder.encode(toolStop));

            const msgDelta = `event: message_delta\ndata: ${JSON.stringify({
              type: 'message_delta',
              delta: { stop_reason: 'tool_use', stop_sequence: null },
              usage: { output_tokens: 100 },
            })}\n\n`;
            controller.enqueue(encoder.encode(msgDelta));
          } else {
            const msgDelta = `event: message_delta\ndata: ${JSON.stringify({
              type: 'message_delta',
              delta: { stop_reason: 'end_turn', stop_sequence: null },
              usage: { output_tokens: 50 },
            })}\n\n`;
            controller.enqueue(encoder.encode(msgDelta));
          }

          controller.enqueue(encoder.encode(`event: message_stop\ndata: ${JSON.stringify({ type: 'message_stop' })}\n\n`));
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
