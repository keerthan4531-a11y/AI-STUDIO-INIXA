import { NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════════════
// G4F Chat API Route — Cloudflare Worker Proxy
// ═══════════════════════════════════════════════════════════════════
// Vercel IPs are often globally blocked by G4F (AWS blocklist).
// To bypass this, we route all traffic through our dedicated 
// Cloudflare Worker which acts as a proxy, doing IP spoofing
// and provider routing.
//
// Worker URL: https://g4f-bypass.haruyhari930.workers.dev
// ═══════════════════════════════════════════════════════════════════

const WORKER_URL = 'https://g4f-bypass.haruyhari930.workers.dev';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, stream } = body;
    let model = body.model || 'auto';

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'messages array is required' }, { status: 400 });
    }

    console.log(`[G4F Route] Forwarding to Worker - Model: "${model}", stream: ${stream}`);

    // Forward the request directly to the Cloudflare Worker
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      if (stream === true && response.body) {
        // Stream response — pass through directly from Worker
        return new Response(response.body, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-G4F-Proxy': 'Cloudflare-Worker'
          },
        });
      }

      // Non-stream: parse and return
      const data = await response.json();
      return NextResponse.json(data);
    }

    // Handle errors from the Worker
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error(`[G4F Route] Worker returned ${response.status}:`, errorText);
    
    return NextResponse.json(
      { 
        ok: false, 
        error: `Worker Error ${response.status}`, 
        reply: `❌ Cloudflare Worker failed with status ${response.status}.` 
      },
      { status: response.status === 429 ? 429 : 502 }
    );

  } catch (error: any) {
    console.error('[G4F Route] Fatal error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Internal server error', reply: `❌ G4F Route Error: ${error.message}` },
      { status: 500 }
    );
  }
}
