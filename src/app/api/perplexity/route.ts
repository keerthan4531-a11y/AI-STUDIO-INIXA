import { NextRequest, NextResponse } from "next/server";
import { executePerplexityStream } from "@/lib/perplexityService";

export const runtime = 'nodejs';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = body.query || body.prompt || "";
    const model = body.model || "turbo";

    if (!query) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          await executePerplexityStream(
            query,
            model,
            (delta) => {
              const sseLine = `data: ${JSON.stringify({ type: 'response.output_text.delta', delta })}\n\n`;
              controller.enqueue(encoder.encode(sseLine));
            },
            (citations) => {
              const sseLine = `data: ${JSON.stringify({ type: 'citations', citations })}\n\n`;
              controller.enqueue(encoder.encode(sseLine));
            }
          );
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err: any) {
          console.error(`[Perplexity Error] Failed:`, err.message);
          const errorMsg = `\n\n❌ [Perplexity Error - ${model}]: ${err.message || 'Unknown error'}`;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'response.output_text.delta', delta: errorMsg })}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      }
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

