import { NextResponse } from 'next/server';
import { generateApiKey } from '@/lib/apiKeyManager';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, fingerprint } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Name is required for the API key.' }, { status: 400 });
    }

    if (!fingerprint || typeof fingerprint !== 'string') {
      return NextResponse.json({ error: 'Browser fingerprint is required.' }, { status: 400 });
    }

    // Generate a new secure API key
    const result = await generateApiKey(name.trim(), fingerprint);

    return NextResponse.json({
      success: true,
      data: {
        rawKey: result.rawKey, // IMPORTANT: The client must show this exactly once!
        record: result.record
      }
    });

  } catch (error: any) {
    console.error('[API Keys Generate] Error:', error);
    return NextResponse.json({ error: 'Failed to generate API key.' }, { status: 500 });
  }
}
