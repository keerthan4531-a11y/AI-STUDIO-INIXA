import { NextRequest } from 'next/server';
import { executeAgentLoop } from '@/lib/mcp/agentLoop';
import { MCP_TOOLS_REGISTRY } from '@/lib/mcp/toolsRegistry';

export const runtime = 'nodejs';
export const maxDuration = 120; // Allow sufficient time for multi-step agent reasoning & tool execution

export async function GET() {
  const tools = Object.values(MCP_TOOLS_REGISTRY).map(t => ({
    name: t.name,
    label: t.label,
    description: t.description,
    category: t.category,
    icon: t.icon,
    parameters: t.parameters,
  }));

  return new Response(JSON.stringify({
    service: 'Inixa Autonomous Agent MCP Server',
    status: 'online',
    version: '1.0.0',
    toolsCount: tools.length,
    tools,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, model = 'gpt-5-6', enabledTools, chatHistory = [] } = body;

    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), { status: 400 });
    }

    const encoder = new TextEncoder();
    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (eventType: string, data: any) => {
          const sseLine = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(sseLine));
        };

        try {
          await executeAgentLoop({
            prompt,
            model,
            enabledTools,
            chatHistory,
            baseUrl,
            onEvent: ({ type, payload }) => {
              sendEvent(type, payload);
            },
          });
          controller.close();
        } catch (err: any) {
          sendEvent('agent_error', { error: err.message || String(err) });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
