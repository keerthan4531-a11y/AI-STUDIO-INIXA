import { NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════════════
// G4F Chat API Route — Routes through Cloudflare Worker
// ═══════════════════════════════════════════════════════════════════
// Instead of using Node.js proxy agents (which don't work on Vercel),
// we proxy G4F requests through the deployed Cloudflare Worker that
// handles IP rotation, provider auto-retry, and rate limit bypass.
// ═══════════════════════════════════════════════════════════════════

// Cloudflare Worker URL for G4F bypass
const G4F_WORKER_URL = 'https://g4f-bypass.haruyhari930.workers.dev';

// ═══════════════════════════════════════════════════════════════════
// Smart Router Logic
// ═══════════════════════════════════════════════════════════════════
export async function POST(req: Request) {
  try {
    const body = await req.json();
    let model = body.model || 'gpt-4o';
    const stream = body.stream || false;

    console.log(`[G4F Route] Routing model: "${model}"`);

    // Strip g4f/ prefix if present
    if (model.startsWith('g4f/')) {
      model = model.replace('g4f/', '');
    }

    // The model string from aiEngine.ts looks like:
    // "g4f/srv_mkoloq41e34074b6133e:openai-fast"
    // After stripping g4f/, we get: "srv_mkoloq41e34074b6133e:openai-fast"
    // The CF worker can handle server:model format via its smart routing

    // Determine if the model has a server:model format
    let workerModel = model;
    let provider: string | undefined;

    if (model.includes(':')) {
      // Server:model format — let the worker handle it directly
      // The worker's g4f-v1 provider or custom endpoint can route these
      workerModel = model;
    }

    console.log(`[G4F Route] Proxying to CF Worker: model="${workerModel}"`);

    // Build request to the Cloudflare Worker
    const workerBody: Record<string, unknown> = {
      model: workerModel,
      messages: body.messages || [],
      stream: stream,
    };

    // Pass through optional parameters
    if (body.temperature !== undefined) workerBody.temperature = body.temperature;
    if (body.max_tokens !== undefined) workerBody.max_tokens = body.max_tokens;
    if (provider) workerBody.provider = provider;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    const workerRes = await fetch(`${G4F_WORKER_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': stream ? 'text/event-stream' : 'application/json',
        'User-Agent': 'Inixa-Proxy/1.0',
      },
      body: JSON.stringify(workerBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!workerRes.ok) {
      const errorText = await workerRes.text();
      console.error(`[G4F Route] Worker error ${workerRes.status}: ${errorText.substring(0, 200)}`);

      // Try to parse and forward the error
      try {
        const errorJson = JSON.parse(errorText);
        return NextResponse.json(
          { ok: false, engine: "g4f-worker", error: errorJson.error?.message || errorText.substring(0, 200) },
          { status: workerRes.status }
        );
      } catch {
        return NextResponse.json(
          { ok: false, engine: "g4f-worker", error: errorText.substring(0, 200) },
          { status: workerRes.status }
        );
      }
    }

    // Stream response
    if (stream && workerRes.body) {
      console.log(`[G4F Route] Streaming response from worker`);
      return new Response(workerRes.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Provider': workerRes.headers.get('X-Provider') || 'g4f-worker',
          'X-Model': workerRes.headers.get('X-Model') || workerModel,
        }
      });
    }

    // Non-streaming response
    const data = await workerRes.json();
    console.log(`[G4F Route] Success! Provider: ${workerRes.headers.get('X-Provider')}`);

    // The worker returns OpenAI-compatible format
    // Extract the reply for our frontend format
    const reply = data.choices?.[0]?.message?.content || data.content || '';

    return NextResponse.json({
      reply,
      provider: workerRes.headers.get('X-Provider') || 'g4f-worker',
      model: workerRes.headers.get('X-Model') || workerModel,
    });

  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('[G4F Route] Request timed out');
      return NextResponse.json(
        { ok: false, engine: "g4f-worker", error: "Request timed out after 60s" },
        { status: 504 }
      );
    }
    console.error('[G4F Route] Error:', error);
    return NextResponse.json(
      { ok: false, engine: "g4f-worker", error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
