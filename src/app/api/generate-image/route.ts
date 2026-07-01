import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const timestamp = req.headers.get('X-Timestamp');
    const signature = req.headers.get('X-App-Signature');
    
    if (!timestamp || !signature) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    const body = await req.json();
    const CF_WORKER_URL = process.env.CF_WORKER_URL || 'https://divine-leaf-d1cf.antigravity4531.workers.dev';
    
    const res = await fetch(`${CF_WORKER_URL}/api/generate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (!res.ok) {
        return NextResponse.json({ error: 'Image generation failed' }, { status: res.status });
    }
    
    const blob = await res.blob();
    return new Response(blob, {
      headers: { 'Content-Type': res.headers.get('content-type') || 'image/jpeg' }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to proxy request' }, { status: 500 });
  }
}
