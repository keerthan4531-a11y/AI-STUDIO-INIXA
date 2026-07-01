import { POST as g4fPOST } from '../../../chat/g4f/route';

function extractJson(text: string): string {
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  
  let start = -1;
  let end = -1;
  
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    start = firstBrace;
    end = text.lastIndexOf('}');
  } else if (firstBracket !== -1) {
    start = firstBracket;
    end = text.lastIndexOf(']');
  }
  
  if (start !== -1 && end !== -1 && end > start) {
    return text.substring(start, end + 1);
  }
  return text;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const model = body.model || '';
    
    // Create new headers to bypass origin/auth security checks
    const newHeaders = new Headers();
    newHeaders.set('Content-Type', 'application/json');
    newHeaders.set('Authorization', 'Bearer g4f_internal_forward');
    newHeaders.set('Origin', 'http://127.0.0.1:3000');
    
    // If incoming request has an IP header, forward it
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
    if (clientIp) {
      newHeaders.set('x-forwarded-for', clientIp);
    }

    const isGeminiOrDirect = model.startsWith('gemini/') || 
      (!model.startsWith('g4f/') && !model.startsWith('qwen_worker/'));

    if (isGeminiOrDirect) {
      const geminiModel = model.replace('gemini/', '');
      const geminiApiKey = process.env.GEMINI_API_KEY;
      console.log(`[Presenton Bridge] Routing direct Gemini model "${geminiModel}" to Google API (with JSON cleaning)`);
      
      const geminiHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (geminiApiKey) {
        geminiHeaders['Authorization'] = `Bearer ${geminiApiKey}`;
      }
      
      // We perform a non-streaming fetch from Gemini even if streaming was requested, 
      // so we can reliably extract and clean up the JSON schema output.
      const geminiRes = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
        method: 'POST',
        headers: geminiHeaders,
        body: JSON.stringify({
          model: geminiModel,
          messages: body.messages,
          stream: false,
          max_tokens: 8000,
          temperature: 0.7,
          response_format: body.response_format
        }),
      });
      
      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        console.error('[Presenton Bridge] Gemini API returned error:', geminiRes.status, errText);
        return new Response(errText, { status: geminiRes.status, headers: { 'Content-Type': 'application/json' } });
      }
      
      const geminiData = await geminiRes.json();
      const rawContent = geminiData.choices?.[0]?.message?.content || '';
      
      // Extract clean JSON block to ensure json.loads in presenton doesn't fail on trailing/leading text
      const cleanContent = extractJson(rawContent);
      
      if (geminiData.choices?.[0]?.message) {
        geminiData.choices[0].message.content = cleanContent;
      }
      
      if (body.stream === true) {
        const encoder = new TextEncoder();
        const chunk = {
          id: geminiData.id || `chatcmpl-${Date.now()}`,
          object: 'chat.completion.chunk',
          created: geminiData.created || Math.floor(Date.now() / 1000),
          model: geminiModel,
          choices: [{
            index: 0,
            delta: { content: cleanContent, role: 'assistant' },
            finish_reason: null
          }]
        };
        const finalChunk = {
          id: geminiData.id || `chatcmpl-${Date.now()}`,
          object: 'chat.completion.chunk',
          created: geminiData.created || Math.floor(Date.now() / 1000),
          model: geminiModel,
          choices: [{
            index: 0,
            delta: {},
            finish_reason: 'stop'
          }]
        };
        
        const responseStream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\n`));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        });
        
        return new Response(responseStream, { headers: { 'Content-Type': 'text/event-stream' } });
      }
      
      return new Response(JSON.stringify(geminiData), { headers: { 'Content-Type': 'application/json' } });
    } else {
      console.log(`[Presenton Bridge] Routing proxy model "${model}" to G4F endpoint`);
      // Forward the user's g4f API key if present
      const incomingAuth = req.headers.get('authorization');
      if (incomingAuth && incomingAuth.includes('g4f_')) {
        const realKey = incomingAuth.replace('Bearer ', '').trim();
        newHeaders.set('x-g4f-api-key', realKey);
      }
      
      const newReq = new Request('http://127.0.0.1:3000/api/chat/g4f', {
        method: 'POST',
        headers: newHeaders,
        body: JSON.stringify(body)
      });
      return g4fPOST(newReq);
    }
  } catch (err: any) {
    console.error('[Presenton Bridge] Error in completions forwarding:', err);
    return new Response(JSON.stringify({ error: err.message || 'Bridge error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}



