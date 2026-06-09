import { NextRequest } from 'next/server';

export const runtime = 'edge'; // Edge runtime for streaming

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const response = await fetch('https://perplexity.g4f-dev.workers.dev/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://g4f.dev',
        'Referer': 'https://g4f.dev/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({
        model: 'turbo',
        messages: body.messages,
        stream: true
      })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[Perplexity Proxy] Error from worker:', response.status, text);
      return new Response(text, { status: response.status });
    }

    // Stream the response back to the client
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('[Perplexity Proxy] Request failed:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
