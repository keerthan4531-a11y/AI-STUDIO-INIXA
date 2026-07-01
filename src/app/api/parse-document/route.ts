import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const CF_WORKER_URL = process.env.CF_WORKER_URL || 'https://divine-leaf-d1cf.antigravity4531.workers.dev';
    
    const contentType = req.headers.get('content-type') || '';
    let bodyData: any;
    const fetchHeaders: any = {};
    
    if (contentType.includes('application/json')) {
      bodyData = JSON.stringify(await req.json());
      fetchHeaders['Content-Type'] = 'application/json';
    } else {
      bodyData = await req.formData();
    }
    
    const res = await fetch(`${CF_WORKER_URL}/parse-document`, {
      method: 'POST',
      headers: fetchHeaders,
      body: bodyData
    });
    
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to proxy request' }, { status: 500 });
  }
}
