import { NextRequest, NextResponse } from 'next/server';
import { executeOneSearchChat } from '@/lib/onesearchService';

export const runtime = 'nodejs';

/**
 * Direct OneSearch (Begamob) API Route Handler
 * 
 * POST /api/chat/onesearch
 * Body: { model: string, prompt?: string, messages?: any[], stream?: boolean, webSearch?: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const model = body.model || 'claude-3-7-sonnet';
    const stream = body.stream !== false;
    const webSearch = Boolean(body.webSearch);

    let messages = body.messages;
    if (!messages && body.prompt) {
      messages = [{ role: 'user', content: body.prompt }];
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No prompt or messages provided' }, { status: 400 });
    }

    return await executeOneSearchChat(model, messages, stream, { webSearch });
  } catch (error: any) {
    console.error('[OneSearch Route Error]:', error);
    return NextResponse.json({ error: error.message || 'OneSearch execution failed' }, { status: 500 });
  }
}

