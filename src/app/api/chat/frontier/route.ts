import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const TOOLXZ_API = 'https://www.toolxz.com/api/chat';

const MODEL_MAP: Record<string, string> = {
  'claude-sonnet-5': 'claude-sonnet-5',
  'claude-sonnet': 'claude-sonnet-5',
  'frontier/claude-sonnet-5': 'claude-sonnet-5',
  'sol': 'sol',
  'gpt-5.6-sol': 'sol',
  'gpt-sol': 'sol',
  'frontier/gpt-5.6-sol': 'sol',
  'terra': 'terra',
  'gpt-5.6-terra': 'terra',
  'gpt-terra': 'terra',
  'frontier/gpt-5.6-terra': 'terra',
  'claude-fable-5': 'claude-fable-5',
  'frontier/claude-fable-5': 'claude-fable-5',
  'claude-fable-5.1': 'claude-fable-5.1',
  'claude-fable-5-1': 'claude-fable-5.1',
  'frontier/claude-fable-5.1': 'claude-fable-5.1',
  'glm-5.2': 'glm-5.2',
  'glm-5-2': 'glm-5.2',
  'glm': 'glm-5.2',
  'frontier/glm-5.2': 'glm-5.2',
  'kimi-k3': 'kimi-k3',
  'kimi': 'kimi-k3',
  'frontier/kimi-k3': 'kimi-k3'
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawModel = body.model || 'claude-sonnet-5';
    const targetModel = MODEL_MAP[rawModel] || rawModel.replace(/^(frontier|veo)\//, '') || 'claude-sonnet-5';

    let messages = body.messages || [];
    if (!messages || messages.length === 0) {
      const prompt = body.prompt || body.query || '';
      if (!prompt) {
        return new Response(JSON.stringify({ error: 'Prompt or messages are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      messages = [{ role: 'user', content: prompt }];
    }

    const formattedMessages = messages
      .filter((m: any) => m && m.content)
      .map((m: any) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
      }));

    const response = await fetch(TOOLXZ_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://www.toolxz.com',
        'Referer': 'https://www.toolxz.com/chat',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
      },
      body: JSON.stringify({
        messages: formattedMessages,
        modelId: targetModel,
        thinking: !!body.thinking,
        search: !!body.search,
        stream: true
      })
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return new Response(JSON.stringify({ error: `Frontier upstream error HTTP ${response.status}: ${errText}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Direct stream forwarding
    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err: any) {
    console.error('[Frontier Route Error]:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal frontier gateway error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
