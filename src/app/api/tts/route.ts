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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, voice = 'nova', model = 'tts-1-hd', speed = 1.0, lang = 'ta-IN' } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Limit text length to prevent abuse
    const trimmedText = text.slice(0, 4096);

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
        } else {
          console.error('Primary TTS failed with status:', ttsResponse.status);
        }
      } catch (err) {
        console.error('Primary TTS exception:', err);
      }
    }

    // --- FALLBACK: Google Translate TTS ---
    console.log('Falling back to Google Translate TTS...');
    
    // Chunk text for GTTS limit (~200 chars)
    const chunks = trimmedText.match(/[^.!?]+[.!?]+/g) || [trimmedText];
    const validChunks = [];
    let currentChunk = '';
    
    for (const phrase of chunks) {
      if ((currentChunk + phrase).length < 200) {
        currentChunk += phrase;
      } else {
        if (currentChunk) validChunks.push(currentChunk.trim());
        currentChunk = phrase;
      }
    }
    if (currentChunk) validChunks.push(currentChunk.trim());

    // Fetch all chunks concurrently
    const gttsBuffers = await Promise.all(validChunks.map(async (chunk) => {
      const gttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(lang.split('-')[0])}&client=tw-ob&q=${encodeURIComponent(chunk)}`;
      const fallbackRes = await fetch(gttsUrl);
      if (!fallbackRes.ok) throw new Error('GTTS chunk failed');
      return fallbackRes.arrayBuffer();
    }));

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

  } catch (error) {
    console.error('TTS Route Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate speech.' },
      { status: 500 }
    );
  }
}
