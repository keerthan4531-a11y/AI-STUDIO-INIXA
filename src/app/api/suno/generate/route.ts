import { NextResponse } from 'next/server';

const SUNO_API_URL = process.env.SUNO_API_URL;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // If SUNO_API_URL is configured and not the official studio API
    if (SUNO_API_URL && SUNO_API_URL !== 'https://studio-api.suno.ai') {
      const res = await fetch(`${SUNO_API_URL}/api/custom_generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      return NextResponse.json(data);
    }

    // Mock response if no proxy is configured
    // For demonstration if user has not yet configured the proxy
    return NextResponse.json([{
      id: "mock-" + Date.now().toString(),
      status: "streaming",
    }]);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
