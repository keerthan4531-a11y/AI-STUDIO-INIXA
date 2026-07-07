import { NextResponse } from 'next/server';
import { deleteApiKeyByHash, revokeApiKeyByHash } from '@/lib/apiKeyManager';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { keyHash, fingerprint, action } = body;

    if (!keyHash || !fingerprint || !action) {
      return NextResponse.json({ error: 'Missing required parameters (keyHash, fingerprint, action).' }, { status: 400 });
    }

    let success = false;

    if (action === 'revoke') {
      success = await revokeApiKeyByHash(keyHash, fingerprint);
    } else if (action === 'delete') {
      success = await deleteApiKeyByHash(keyHash, fingerprint);
    } else {
      return NextResponse.json({ error: 'Invalid action. Must be "revoke" or "delete".' }, { status: 400 });
    }

    if (!success) {
      return NextResponse.json({ error: 'Failed to perform action. Key not found or unauthorized.' }, { status: 403 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[API Keys Revoke/Delete] Error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
