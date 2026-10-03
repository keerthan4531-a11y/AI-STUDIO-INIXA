import { NextRequest, NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════════════
// TTS API Route — Text-to-Speech via auto-scraped keys
// ═══════════════════════════════════════════════════════════════════
// Uses the pekpik API with scraped keys for TTS-1-HD model
// Supports multiple voices: alloy, echo, fable, onyx, nova, shimmer
// ═══════════════════════════════════════════════════════════════════

// Reuse the same scraper from chat route
interface ScrapedKeyEntry { key: string; model: string; }
let cachedTTSKeys: string[] = [];
let lastTTSScrapeTime = 0;
const SCRAPE_URL = 'https://raw.githubusercontent.com/alistaitsacle/free-llm-api-keys/main/README.md';

async function getTTSKey(): Promise<string> {
  const now = Date.now();
  if (now - lastTTSScrapeTime > 5 * 60 * 1000 || cachedTTSKeys.length === 0) {
    try {
      const res = await fetch(SCRAPE_URL, { cache: 'no-store' });
      const text = await res.text();
      // Get all sk- keys (TTS keys are not model-specific in the table)
      const matches = [...text.matchAll(/`(sk-[a-zA-Z0-9_-]+)`/g)];
      if (matches.length > 0) {
        cachedTTSKeys = matches.map(m => m[1]);
        lastTTSScrapeTime = now;
      }
    } catch (e) {
      console.error('Failed to scrape TTS keys:', e);
    }
  }
  if (cachedTTSKeys.length > 0) {
    return cachedTTSKeys[Math.floor(Math.random() * cachedTTSKeys.length)];
  }
  return '';
}

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
    const { text, voice = 'nova', model = 'tts-1-hd', speed = 1.0, lang } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Limit text length to prevent serverless timeout
    const trimmedText = text.slice(0, 3000);

    const isTamil = /[\u0B80-\u0BFF]/.test(trimmedText);
    const targetLang = lang ? lang.split('-')[0] : (isTamil ? 'ta' : 'en');

    const apiKey = await getTTSKey();
    if (apiKey) {
      try {
        const ttsResponse = await fetch('https://aiapiv2.pekpik.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            input: trimmedText,
            voice,
            speed,
          }),
        });

        if (ttsResponse.ok) {
          const audioBuffer = await ttsResponse.arrayBuffer();
          return new Response(audioBuffer, {
            headers: {
              'Content-Type': 'audio/mpeg',
              'Cache-Control': 'no-cache',
            },
          });
        }
      } catch (err) {
        console.warn('Primary TTS failed, using fallback:', err);
      }
    }

    // --- FALLBACK: High-Reliability Neural Translate TTS ---
    const validChunks = splitTextIntoChunks(trimmedText, 160);
    if (validChunks.length === 0) {
      return NextResponse.json({ error: 'No readable speech chunks' }, { status: 400 });
    }

    const browserHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Referer': 'https://translate.google.com/',
    };

    // Fetch chunks sequentially or in parallel batches
    const gttsBuffers: ArrayBuffer[] = [];
    for (const chunk of validChunks) {
      const gttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(targetLang)}&client=tw-ob&q=${encodeURIComponent(chunk)}`;
      const fallbackRes = await fetch(gttsUrl, { headers: browserHeaders });
      if (!fallbackRes.ok) {
        throw new Error(`GTTS returned status ${fallbackRes.status}`);
      }
      gttsBuffers.push(await fallbackRes.arrayBuffer());
    }

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
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error: any) {
    console.error('TTS Route Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate speech audio.' },
      { status: 500 }
    );
  }
}

