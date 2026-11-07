import { NextRequest, NextResponse } from 'next/server';
import { executeVideoGeneration, VideoEngineType, AspectRatio } from '@/lib/videoEngines';

export const maxDuration = 120;

interface GenerateVideoRequestBody {
  prompt: string;
  aspectRatio?: AspectRatio;
  model?: VideoEngineType;
  duration?: number;
  negativePrompt?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: GenerateVideoRequestBody = await req.json();
    const {
      prompt,
      aspectRatio = 'VIDEO_ASPECT_RATIO_PORTRAIT',
      model = 'auto',
      duration = 5,
      negativePrompt,
    } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Prompt is required for video generation' }, { status: 400 });
    }

    console.log(`[Video API] Aritek T2V Request | Model: ${model} | Prompt: "${prompt.slice(0, 60)}..."`);

    const result = await executeVideoGeneration({
      prompt: prompt.trim(),
      aspectRatio,
      model,
      duration,
      negativePrompt
    });

    return NextResponse.json({
      success: true,
      videoUrl: result.videoUrl,
      engineUsed: result.engineUsed,
      durationSeconds: result.durationSeconds,
      status: 'completed',
    });
  } catch (error: any) {
    console.error('[Video API] Video generation error:', error);
    const message = error?.message || 'Video generation service encountered an unexpected error.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
