import { NextResponse } from 'next/server';

const G4F_WORKER_URL = 'https://g4f-bypass.haruyhari930.workers.dev';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let model = body.model || 'gpt-4o';
    const stream = body.stream || false;

    console.log(`[G4F Route] Original Model: "${model}"`);

    // Clean the model name by removing 'g4f/' prefix
    if (model.startsWith('g4f/')) {
      model = model.replace('g4f/', '');
    }

    console.log(`[G4F Route] Forwarding cleaned model "${model}" to Cloudflare Worker`);

    // Send request to the rate-limit bypass Cloudflare Worker
    const workerRes = await fetch(`${G4F_WORKER_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': stream ? 'text/event-stream' : 'application/json',
      },
      body: JSON.stringify({
        ...body,
        model, // Send the cleaned model name to the worker
      }),
    });

    if (!workerRes.ok) {
      const errText = await workerRes.text();
      console.error(`[G4F Route] Worker Error:`, errText);
      throw new Error(`Worker Error (${workerRes.status}): ${errText}`);
    }

    // Handle streaming response
    if (stream) {
      return new Response(workerRes.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Handle non-streaming response
    return NextResponse.json(await workerRes.json());
  } catch (error: any) {
    console.error('[G4F Route] API Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
