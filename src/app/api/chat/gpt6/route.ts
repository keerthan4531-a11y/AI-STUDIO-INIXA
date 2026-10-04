import { NextRequest, NextResponse } from "next/server";
import { executeGPT6Stream } from "@/lib/gpt6Service";

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    model: "gpt-6-astra",
    providers: ["Cloudflare (gpt-6-astra)", "Perplexity (gpt6_astra)"],
    strict_mode: true
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let prompt = body.prompt || body.query || "";
    const messages = body.messages || [];

    if (!prompt && Array.isArray(messages) && messages.length > 0) {
      const last = messages[messages.length - 1];
      prompt = typeof last.content === "string" ? last.content : JSON.stringify(last.content);
    }

    if (!prompt && messages.length === 0) {
      return NextResponse.json({ error: "Missing prompt or messages" }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          await executeGPT6Stream(
            prompt,
            (delta) => {
              const sseLine = `data: ${JSON.stringify({
                type: 'response.output_text.delta',
                delta,
                choices: [{ delta: { content: delta } }]
              })}\n\n`;
              controller.enqueue(encoder.encode(sseLine));
            },
            messages,
            req.headers
          );
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err: any) {
          console.error(`[GPT-6 Astra Route Error]:`, err.message);
          const errorMsg = `\n\n❌ [GPT-6 Astra Error]: ${err.message || 'Unknown error'}`;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'response.output_text.delta',
            delta: errorMsg,
            choices: [{ delta: { content: errorMsg } }]
          })}\n\n`));
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
