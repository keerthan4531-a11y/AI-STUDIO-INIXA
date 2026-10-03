import { NextRequest } from 'next/server';
import { executeChatXStream } from '@/lib/chatxService';

export const runtime = 'nodejs';

/**
 * ChatX.ai Next.js Route Handler for Vercel
 * 
 * Supports:
 * - Models: grok_fast, deepseek_flash, claude_sonnet, gpt4, gemini_pro
 * - Unlimited Guest Tokens: Resets session cookies automatically
 * - Turnstile Handling: Uses Sitekey 0x4AAAAAAC_cZtVlrKQgA_T-
 */

const CHATX_SITEKEY = '0x4AAAAAAC_cZtVlrKQgA_T-';

/**
 * All 10 Verified Working ChatX Models:
 * 1. grok_fast: Grok 4.3 (Fast)
 * 2. grok_main: Grok 4.6 (Main)
 * 3. deepseek_flash: DeepSeek V4.1 Flash
 * 4. claude_sonnet: Claude Sonnet 5
 * 5. claude_opus: Claude Opus 5.5
 * 6. claude_haiku: Claude Haiku 4.5
 * 7. gemini_pro: Gemini 3.8 Flash
 * 8. gpt4: GPT-5.4
 * 9. gpt5_5: GPT-6.1 Sol
 * 10. gpt6_astra: GPT-6 Astra
 */
export const CHATX_MODELS = [
  { id: 'chatx-grok-fast', modelId: 'grok_fast', name: 'Grok 4.3 (Fast)', provider: 'xAI' },
  { id: 'chatx-grok-main', modelId: 'grok_main', name: 'Grok 4.6 (Main)', provider: 'xAI' },
  { id: 'chatx-deepseek', modelId: 'deepseek_flash', name: 'DeepSeek V4.1 Flash', provider: 'DeepSeek' },
  { id: 'chatx-claude-sonnet', modelId: 'claude_sonnet', name: 'Claude Sonnet 5', provider: 'Anthropic' },
  { id: 'chatx-claude-opus', modelId: 'claude_opus', name: 'Claude Opus 5.5', provider: 'Anthropic' },
  { id: 'chatx-claude-haiku', modelId: 'claude_haiku', name: 'Claude Haiku 4.5', provider: 'Anthropic' },
  { id: 'chatx-claude-fable', modelId: 'claude_fable', name: 'Claude Fable 5.1', provider: 'Anthropic' },
  { id: 'chatx-gemini-pro', modelId: 'gemini_pro', name: 'Gemini 3.8 Flash', provider: 'Google' },
  { id: 'chatx-gemini-lite', modelId: 'gemini', name: 'Gemini 3.5 Flash Lite', provider: 'Google' },
  { id: 'chatx-gpt3', modelId: 'gpt3', name: 'GPT-6 Luna', provider: 'OpenAI' },
  { id: 'chatx-gpt4', modelId: 'gpt4', name: 'GPT-5.4', provider: 'OpenAI' },
  { id: 'chatx-gpt4-5', modelId: 'gpt4_5', name: 'GPT-4.1', provider: 'OpenAI' },
  { id: 'chatx-gpt5-sol', modelId: 'gpt5_5', name: 'GPT-6.1 Sol', provider: 'OpenAI' },
  { id: 'chatx-gpt6-astra', modelId: 'gpt6_astra', name: 'GPT-6 Astra', provider: 'OpenAI' },
];

const MODEL_MAP: Record<string, string> = {
  // Grok
  'grok': 'grok_fast',
  'grok_fast': 'grok_fast',
  'grok-4.3': 'grok_fast',
  'grok_main': 'grok_main',
  'grok-4.6': 'grok_main',
  'grok-main': 'grok_main',

  // DeepSeek
  'deepseek': 'deepseek_flash',
  'deepseek_flash': 'deepseek_flash',
  'deepseek-v4': 'deepseek_flash',
  'deepseek-flash': 'deepseek_flash',

  // Claude
  'claude': 'claude_sonnet',
  'claude_sonnet': 'claude_sonnet',
  'claude-sonnet': 'claude_sonnet',
  'claude-sonnet-5': 'claude_sonnet',
  'claude_opus': 'claude_opus',
  'claude-opus': 'claude_opus',
  'claude-opus-5.5': 'claude_opus',
  'claude_haiku': 'claude_haiku',
  'claude-haiku': 'claude_haiku',
  'claude-haiku-4.5': 'claude_haiku',
  'claude_fable': 'claude_fable',

  // Gemini
  'gemini': 'gemini_pro',
  'gemini_pro': 'gemini_pro',
  'gemini-pro': 'gemini_pro',
  'gemini-3.8': 'gemini_pro',
  'gemini_flash': 'gemini_pro',
  'gemini_lite': 'gemini',

  // GPT & OpenAI
  'gpt': 'gpt4',
  'gpt3': 'gpt3',
  'gpt-luna': 'gpt3',
  'gpt4': 'gpt4',
  'gpt-5.4': 'gpt4',
  'gpt4_5': 'gpt4_5',
  'gpt-4.1': 'gpt4_5',
  'gpt5_5': 'gpt5_5',
  'gpt-6.1-sol': 'gpt5_5',
  'gpt-sol': 'gpt5_5',
  'gpt6_astra': 'gpt6_astra',
  'gpt-6-astra': 'gpt6_astra',
  'gpt-astra': 'gpt6_astra',
};

export async function GET() {
  return new Response(JSON.stringify({
    provider: 'chatx.ai',
    models: CHATX_MODELS,
    sitekey: CHATX_SITEKEY
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function POST(req: NextRequest) {
  try {
    const { 
      prompt, 
      model = 'grok_fast', 
      turnstileToken = '' 
    } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), { status: 400 });
    }

    const cleanModelKey = String(model).toLowerCase().replace(/^chatx[\/-]/, '').trim();
    const currentModel = MODEL_MAP[cleanModelKey] || cleanModelKey;

    // Direct Automated Browser Execution for ChatX (Real AI response, strict error reporting)
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          const result = await executeChatXStream(prompt, currentModel, (delta) => {
            const sseLine = `data: ${JSON.stringify({ type: 'response.output_text.delta', delta })}\n\n`;
            controller.enqueue(encoder.encode(sseLine));
          });

          if (!result || result.trim().length === 0) {
            throw new Error(`ChatX model ${currentModel} returned an empty response.`);
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err: any) {
          console.error(`[ChatX Strict Error] Model ${currentModel} failed:`, err.message);
          // Show the exact raw error in UI so user can inspect and fix
          const errorMsg = `\n\n❌ [ChatX Error - ${currentModel}]: ${err.message || 'Unknown error occurred in ChatX engine'}`;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'response.output_text.delta', delta: errorMsg })}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      }
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ 
      error: `[ChatX Fatal Error]: ${err.message}` 
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
