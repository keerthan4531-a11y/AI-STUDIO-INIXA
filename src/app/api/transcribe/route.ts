import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const CF_WORKER_URL = process.env.CF_WORKER_URL || 'https://divine-leaf-d1cf.antigravity4531.workers.dev';
    
    // We forward the form data directly
    const formData = await req.formData();
    
    const res = await fetch(`${CF_WORKER_URL}/v1/audio/transcriptions`, {
      method: 'POST',
      body: formData
    });
    
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to proxy request' }, { status: 500 });
  }
}
