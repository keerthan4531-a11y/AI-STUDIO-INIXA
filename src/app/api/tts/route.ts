import { NextRequest, NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════════════
// High-Speed Neural Text-to-Speech API Route (Zero-Auth & Zero-Latency)
// ═══════════════════════════════════════════════════════════════════

function splitTextIntoChunks(text: string, maxLen = 160): string[] {
  const sentences = text.match(/[^.!?\n]+[.!?\n]*/g) || [text];
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;
    if (trimmed.length > maxLen) {
      const words = trimmed.split(/\s+/);
      for (const word of words) {
        if ((current + ' ' + word).trim().length <= maxLen) {
          current = (current + ' ' + word).trim();
        } else {
          if (current) chunks.push(current);
          current = word;
        }
      }
    } else {
      if ((current + ' ' + trimmed).trim().length <= maxLen) {
        current = (current + ' ' + trimmed).trim();
      } else {
        if (current) chunks.push(current);
        current = trimmed;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, lang } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Limit text length to prevent serverless timeout
    const trimmedText = text.slice(0, 3000);

    const isTamil = /[\u0B80-\u0BFF]/.test(trimmedText);
    const targetLang = lang ? lang.split('-')[0] : (isTamil ? 'ta' : 'en');

    const validChunks = splitTextIntoChunks(trimmedText, 160);
    if (validChunks.length === 0) {
      return NextResponse.json({ error: 'No readable speech chunks' }, { status: 400 });
    }

    const browserHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Referer': 'https://translate.google.com/',
    };

    // Parallel fetch chunks for ultra-fast audio synthesis
    const gttsBuffers = await Promise.all(
      validChunks.map(async (chunk) => {
        const gttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(targetLang)}&client=tw-ob&q=${encodeURIComponent(chunk)}`;
        const res = await fetch(gttsUrl, { headers: browserHeaders });
        if (!res.ok) {
          throw new Error(`GTTS returned status ${res.status}`);
        }
        return await res.arrayBuffer();
      })
    );

    // Concatenate ArrayBuffers (MP3 frames can be safely concatenated)
    const totalLength = gttsBuffers.reduce((acc, buf) => acc + buf.byteLength, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const buf of gttsBuffers) {
      combined.set(new Uint8Array(buf), offset);
      offset += buf.byteLength;
    }

    return new Response(combined.buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });

  } catch (error: any) {
    console.error('TTS Route Error:', error);
    return NextResponse.json({ error: error.message || 'TTS generation failed' }, { status: 500 });
  }
}
