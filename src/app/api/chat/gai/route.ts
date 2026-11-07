import { NextRequest, NextResponse } from 'next/server';
import { executeGaiChat } from '@/lib/gaiService';

export const runtime = 'nodejs';

/**
 * Direct ChatGai API Route Handler
 * 
 * POST /api/chat/gai
 * Body: { model: string, prompt?: string, messages?: any[], stream?: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const model = body.model || 'GPT:4.1-mini';
    const stream = body.stream !== false;

    let messages = body.messages;
    if (!messages && body.prompt) {
      messages = [{ role: 'user', content: body.prompt }];
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No prompt or messages provided' }, { status: 400 });
    }

    return await executeGaiChat(model, messages, stream);
  } catch (error: any) {
    console.error('[ChatGai Route Error]:', error);
    return NextResponse.json({ error: error.message || 'ChatGai execution failed' }, { status: 500 });
  }
}

