import { NextRequest } from 'next/server';
import { executePerplexityStream, PPLX_MODELS } from '@/lib/perplexityService';

export const runtime = 'nodejs';

export async function GET() {
  return new Response(JSON.stringify({
    provider: 'perplexity.ai',
    models: PPLX_MODELS
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let prompt = body.prompt || body.query || '';
    if (!prompt && Array.isArray(body.messages) && body.messages.length > 0) {
      const last = body.messages[body.messages.length - 1];
      prompt = typeof last.content === 'string' ? last.content : JSON.stringify(last.content);
    }

    const model = body.model || 'turbo';

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), { status: 400 });
    }

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          await executePerplexityStream(
            prompt,
            model,
            (delta) => {
              const sseLine = `data: ${JSON.stringify({ type: 'response.output_text.delta', delta })}\n\n`;
              controller.enqueue(encoder.encode(sseLine));
            },
            (citations) => {
              const sseLine = `data: ${JSON.stringify({ type: 'citations', citations })}\n\n`;
              controller.enqueue(encoder.encode(sseLine));
            },
            req.headers
          );
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err: any) {
          console.error(`[Perplexity Strict Error] Model ${model} failed:`, err.message);
          const errorMsg = `\n\n❌ [Perplexity Error - ${model}]: ${err.message || 'Unknown error occurred in Perplexity engine'}`;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'response.output_text.delta', delta: errorMsg })}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      }
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ 
      error: `[Perplexity Fatal Error]: ${err.message}` 
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
