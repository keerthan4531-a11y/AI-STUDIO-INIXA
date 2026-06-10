import { NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════════════
// WhatsApp Cloud API Webhook Route
// ═══════════════════════════════════════════════════════════════════
// This webhook listens for verification requests from Meta (GET) and
// incoming WhatsApp messages from users (POST).
//
// Required Environment Variables in .env:
// - WHATSAPP_VERIFY_TOKEN: Token you set in Meta Developer Dashboard.
// - WHATSAPP_ACCESS_TOKEN: System User token or Permanent token from Meta.
// - WHATSAPP_PHONE_NUMBER_ID: Your WhatsApp Phone ID.
// ═══════════════════════════════════════════════════════════════════

// ─── GET: Webhook Verification ─────────────────────────────────────
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token) {
      const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'inixa_whatsapp_verify_token_2026';
      
      if (token === verifyToken) {
        console.log('[WhatsApp Webhook] Webhook successfully verified and subscribed.');
        return new Response(challenge, { status: 200 });
      }
      
      console.warn('[WhatsApp Webhook] Verification failed: Token mismatch.');
      return new Response('Forbidden: Verify token mismatch', { status: 403 });
    }
    
    return new Response('Bad Request', { status: 400 });
  } catch (error: any) {
    console.error('[WhatsApp Webhook] GET Error:', error);
    return new Response(error.message || 'Internal Server Error', { status: 500 });
  }
}

// ─── POST: Message Event Webhook ────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Check if it's a valid WhatsApp message event
    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const message = value?.messages?.[0];

      if (message && message.type === 'text') {
        const fromPhoneNumber = message.from; // Sender's phone number
        const userInput = message.text.body; // Incoming text message
        const phoneId = value.metadata?.phone_number_id; // Phone number ID we reply to

        console.log(`[WhatsApp Webhook] Incoming message from [${fromPhoneNumber}]: "${userInput}"`);

        // Generate response using our INIXA AI engine
        const replyText = await generateAIResponse(userInput, req);

        // Send reply back to the user via Meta Graph API
        await sendWhatsAppMessage(phoneId, fromPhoneNumber, replyText);
      }

      return NextResponse.json({ status: 'ok' });
    }

    return NextResponse.json({ error: 'Unsupported webhook object type' }, { status: 400 });
  } catch (error: any) {
    console.error('[WhatsApp Webhook] POST Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// ─── Helper: Generate AI Response with Fallbacks ────────────────────
async function generateAIResponse(userInput: string, req: Request): Promise<string> {
  const protocol = req.headers.get('x-forwarded-proto') || 'http';
  const host = req.headers.get('host') || 'localhost:3009';
  const origin = `${protocol}://${host}`;

  const conversationHistory = [
    { role: 'system', content: 'You are INIXA AI, a helpful, intelligent assistant connected to WhatsApp. Keep answers concise, clear, and direct for easy reading on mobile.' },
    { role: 'user', content: userInput }
  ];

  // 1. Try Default model: MiMo V2.5 Pro via proxy pool (/api/chat/g4f)
  try {
    console.log('[WhatsApp AI] Attempting default model: MiMo V2.5 Pro...');
    const response = await fetch(`${origin}/api/chat/g4f`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': origin,
        'Referer': `${origin}/`
      },
      body: JSON.stringify({
        messages: conversationHistory,
        model: 'deepinfra/XiaomiMiMo/MiMo-V2.5-Pro',
        stream: false
      })
    });

    if (response.ok) {
      const data = await response.json();
      const reply = data.reply || data.choices?.[0]?.message?.content || '';
      if (reply) {
        console.log('[WhatsApp AI] Success using MiMo V2.5 Pro.');
        return reply;
      }
    }
    console.warn(`[WhatsApp AI] MiMo V2.5 Pro endpoint returned status ${response.status}. Trying fallback 1...`);
  } catch (e) {
    console.warn('[WhatsApp AI] Error calling MiMo V2.5 Pro:', e);
  }

  // 2. Fallback 1: Gemini 3.5 Flash via /api/chat/completions (Universal Proxy Router)
  try {
    console.log('[WhatsApp AI] Attempting Fallback 1: Gemini 3.5 Flash...');
    const response = await fetch(`${origin}/api/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': origin,
        'Referer': `${origin}/`
      },
      body: JSON.stringify({
        messages: conversationHistory,
        model: 'gemini/gemini-3.5-flash',
        stream: false
      })
    });

    if (response.ok) {
      const data = await response.json();
      const reply = data.reply || data.choices?.[0]?.message?.content || '';
      if (reply) {
        console.log('[WhatsApp AI] Success using Gemini 3.5 Flash.');
        return reply;
      }
    }
    console.warn(`[WhatsApp AI] Gemini 3.5 Flash route returned status ${response.status}. Trying fallback 2...`);
  } catch (e) {
    console.warn('[WhatsApp AI] Error calling Gemini 3.5 Flash route:', e);
  }

  // 3. Fallback 2: Direct call to CF Worker (External, Bypass Next.js Local Server)
  try {
    console.log('[WhatsApp AI] Attempting Fallback 2: Direct CF Worker (gemini/gemini-3.5-flash)...');
    const response = await fetch('https://divine-leaf-d1cf.antigravity4531.workers.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: conversationHistory,
        model: 'gemini/gemini-3.5-flash',
        stream: false
      })
    });

    if (response.ok) {
      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || '';
      if (reply) {
        console.log('[WhatsApp AI] Success using Direct Cloudflare Worker.');
        return reply;
      }
    }
    console.warn(`[WhatsApp AI] Direct Cloudflare Worker route returned status ${response.status}`);
  } catch (e) {
    console.error('[WhatsApp AI] Final Fallback error:', e);
  }

  return 'வணக்கம், தற்போது எனது சர்வர் இணைப்பில் ஏதேனும் சிக்கல் இருக்கலாம். சற்று நேரம் கழித்து மீண்டும் முயற்சிக்கவும்! (Sorry, I cannot connect to my brain. Please try again later.)';
}

// ─── Helper: Send Response to WhatsApp via Meta API ─────────────────
async function sendWhatsAppMessage(phoneId: string, toPhoneNumber: string, text: string) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const defaultPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || phoneId;

  console.log(`[WhatsApp Webhook] AI Response payload: "${text}"`);

  if (!accessToken) {
    console.warn('[WhatsApp Webhook] WHATSAPP_ACCESS_TOKEN is missing in environment variables. Outputting response to terminal instead.');
    return;
  }

  const url = `https://graph.facebook.com/v20.0/${defaultPhoneId}/messages`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toPhoneNumber,
        type: 'text',
        text: {
          body: text
        }
      })
    });

    const responseData = await response.json();
    if (!response.ok) {
      console.error('[WhatsApp Webhook] Meta Graph API returned error status:', response.status, responseData);
    } else {
      console.log('[WhatsApp Webhook] Response successfully sent to user:', responseData);
    }
  } catch (e) {
    console.error('[WhatsApp Webhook] Failed to make fetch to Meta Graph API:', e);
  }
}
