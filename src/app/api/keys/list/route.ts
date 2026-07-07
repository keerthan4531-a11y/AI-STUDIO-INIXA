import { NextResponse } from 'next/server';
import { getKeysByFingerprint } from '@/lib/apiKeyManager';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fingerprint = searchParams.get('fingerprint');

    if (!fingerprint) {
      return NextResponse.json({ error: 'Browser fingerprint is required.' }, { status: 400 });
    }

    const keys = await getKeysByFingerprint(fingerprint);

    return NextResponse.json({
      success: true,
      data: keys
    });

  } catch (error: any) {
    console.error('[API Keys List] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch API keys.' }, { status: 500 });
  }
}
