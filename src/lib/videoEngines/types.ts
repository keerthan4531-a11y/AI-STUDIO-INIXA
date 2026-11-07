export type VideoEngineType =
  | 'auto'
  | 'aritek-sora'
  | 'sora-2'
  | 't2v-ultra'
  | 'agnes'
  | 'muse'
  | 'mindvideo'
  | 'inferenceport'
  | 'ltx-video'
  | 'cogvideox';

export type AspectRatio =
  | 'VIDEO_ASPECT_RATIO_PORTRAIT'
  | 'VIDEO_ASPECT_RATIO_LANDSCAPE'
  | 'VIDEO_ASPECT_RATIO_SQUARE';

export interface VideoGenerationRequest {
  prompt: string;
  aspectRatio?: AspectRatio;
  model?: VideoEngineType;
  referenceImg?: string | null;
  duration?: number;
  negativePrompt?: string;
  seed?: number;
  tokens?: {
    hfToken?: string;
    agnesKey?: string;
    museToken?: string;
    museEndpoint?: string;
    mindVideoToken?: string;
    inferencePortToken?: string;
    inferencePortEndpoint?: string;
  };
}

export interface VideoGenerationResult {
  videoUrl: string; // Direct HTTPS MP4 video URL
  engineUsed: VideoEngineType;
  status: 'completed';
  durationSeconds?: number;
}
