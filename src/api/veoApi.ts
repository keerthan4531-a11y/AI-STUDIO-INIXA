// veoApi.ts — Aritek Sora v1.9.3 High-Speed Real Video Generator Client

export type AspectRatio =
  | 'VIDEO_ASPECT_RATIO_PORTRAIT'
  | 'VIDEO_ASPECT_RATIO_LANDSCAPE'
  | 'VIDEO_ASPECT_RATIO_SQUARE';

export type VideoModelType =
  | 'aritek-sora'
  | 'aritek-cartoon-pet'
  | 'aritek-character-mix';

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

  const isSlowModel = options?.model === 'aritek-character-mix';
  const modelName = options?.model === 'aritek-cartoon-pet' 
    ? 'AI Cartoon & Pet 3D Engine' 
    : isSlowModel 
      ? 'Character Fusion Engine (Queued)' 
      : 'Sora v1.9.3 Video Engine';

  onStatus(`🎬 Connecting to ${modelName}...`);
  onProgress(10);

  let progress = 10;
  const intervalMs = isSlowModel ? 1800 : 400;

  const progressTimer = setInterval(() => {
    if (signal?.aborted) {
      clearInterval(progressTimer);
      return;
    }
    if (progress < 30) {
      progress += isSlowModel ? 2 : 6;
      onStatus('⚡ Generating Zero-Auth Token & Rotating Device-Id...');
    } else if (progress < 60) {
      progress += isSlowModel ? 1.5 : 5;
      onStatus(isSlowModel ? '⏳ In Upstream Video Queue (~1.5 min, please wait)...' : '🏎️ Synthesizing High-Speed Diffusion Frames...');
    } else if (progress < 85) {
      progress += isSlowModel ? 1 : 4;
      onStatus(isSlowModel ? '✨ Rendering Character Fusion Dynamics...' : '✨ Applying Temporal Motion & Audio...');
    } else if (progress < 95) {
      progress += 0.5;
      onStatus('🎞️ Finalizing & Streaming MP4 Video...');
    }
    onProgress(Math.min(progress, 96));
  }, intervalMs);

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
