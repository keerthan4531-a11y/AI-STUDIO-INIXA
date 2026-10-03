import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const KILO_GATEWAY = 'https://api.kilo.ai/api/gateway/chat/completions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let model = body.model || 'liquid/lfm-2.5-2.6b:free';
    if (model.startsWith('kilo/')) {
      model = model.replace('kilo/', '');
    }

    let messages = body.messages || [];
    if (messages.length === 0) {
      const prompt = body.prompt || body.query || '';
      if (!prompt) {
        return new Response(JSON.stringify({ error: 'Prompt or messages are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      messages = [{ role: 'user', content: prompt }];
    }

    const stream = body.stream !== false;

    const kiloRes = await fetch(KILO_GATEWAY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify({
        model,
        messages,
        stream
      })
    });

    if (!kiloRes.ok) {
      let errText = `HTTP ${kiloRes.status}: ${kiloRes.statusText}`;
      try {
        const errJson = await kiloRes.json();
        if (errJson.error?.message) errText = errJson.error.message;
        else if (errJson.message) errText = errJson.message;
      } catch {
        try {
          const t = await kiloRes.text();
          if (t) errText = t.slice(0, 300);
        } catch {}
      }
      return new Response(JSON.stringify({ error: errText }), {
        status: kiloRes.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Stream SSE forwarder with reasoning support
    if (stream && kiloRes.body) {
      return new Response(kiloRes.body, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      });
    }

    const data = await kiloRes.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({
      error: `[Kilo Gateway Error]: ${err.message || 'Unknown network error'}`
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
