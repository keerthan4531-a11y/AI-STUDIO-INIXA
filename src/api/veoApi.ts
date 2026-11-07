// veoApi.ts — Aritek Sora v1.9.3 High-Speed Real Video Generator Client

export type AspectRatio =
  | 'VIDEO_ASPECT_RATIO_PORTRAIT'
  | 'VIDEO_ASPECT_RATIO_LANDSCAPE'
  | 'VIDEO_ASPECT_RATIO_SQUARE';

export type VideoModelType = 'aritek-sora';

export interface GenerateVideoOptions {
  model?: VideoModelType | string;
  referenceImg?: string | null;
  duration?: number;
  negativePrompt?: string;
  seed?: number;
}

export interface GenerateVideoResult {
  url: string;
  engineUsed?: string;
  durationSeconds?: number;
}

export async function generateVideo(
  prompt: string,
  aspectRatio: AspectRatio,
  _variations: number,
  onStatus: (msg: string) => void,
  onProgress: (pct: number) => void,
  signal?: AbortSignal,
  options?: GenerateVideoOptions,
): Promise<GenerateVideoResult> {

  onStatus('🎬 Connecting to Aritek Sora v1.9.3 Video Engine...');
  onProgress(10);

  let progress = 10;
  const progressTimer = setInterval(() => {
    if (signal?.aborted) {
      clearInterval(progressTimer);
      return;
    }
    if (progress < 30) {
      progress += 6;
      onStatus('⚡ Generating Zero-Auth Token & Rotating Device-Id...');
    } else if (progress < 60) {
      progress += 5;
      onStatus('🏎️ Synthesizing High-Speed Diffusion Video Frames...');
    } else if (progress < 85) {
      progress += 4;
      onStatus('✨ Applying Sora Temporal Motion & AAC Audio...');
    } else if (progress < 95) {
      progress += 2;
      onStatus('🎞️ Finalizing & Streaming 4K MP4 Video...');
    }
    onProgress(Math.min(progress, 96));
  }, 400);

  try {
    const response = await fetch('/api/generate-video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        aspectRatio,
        model: options?.model || 'aritek-sora',
        duration: options?.duration || 5,
        negativePrompt: options?.negativePrompt,
      }),
      signal,
    });

    clearInterval(progressTimer);

    if (!response.ok) {
      let errorMsg = 'Video generation failed';
      try {
        const errJson = await response.json();
        if (errJson?.error) errorMsg = errJson.error;
      } catch {
        const errText = await response.text().catch(() => '');
        if (errText) errorMsg = errText.slice(0, 100);
      }
      throw new Error(errorMsg);
    }

    const data = await response.json();
    if (!data?.videoUrl) {
      throw new Error(data?.error || 'No video was returned from the engine');
    }

    onProgress(100);
    onStatus('✅ Real MP4 Video Generated Successfully!');

    return {
      url: data.videoUrl,
      engineUsed: data.engineUsed || 'aritek-sora',
      durationSeconds: data.durationSeconds || 5,
    };

  } catch (err: any) {
    clearInterval(progressTimer);
    if (signal?.aborted) {
      throw new Error('Generation cancelled');
    }
    throw err;
  }
}
