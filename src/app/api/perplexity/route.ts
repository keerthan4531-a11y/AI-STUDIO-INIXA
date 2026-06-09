import { NextRequest } from 'next/server';

export const runtime = 'edge'; // Edge runtime for streaming

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Perplexity worker blocks stream: true with "Sign up and repeat your request"
    // So we MUST use stream: false, and then fake the stream back to the client!
    const response = await fetch('https://perplexity.g4f-dev.workers.dev/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://g4f.dev',
        'Referer': 'https://g4f.dev/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      },
      body: JSON.stringify({
        model: body.model || 'turbo',
        messages: body.messages,
        stream: false
      })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[Perplexity Proxy] Error from worker:', response.status, text);
      return new Response(text, { status: response.status });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // If client requested stream, we fake it
    if (body.stream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          // Send the full content as a single delta chunk
          const chunk = JSON.stringify({ choices: [{ delta: { content } }] });
          controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Otherwise return plain JSON
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[Perplexity Proxy] Request failed:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
