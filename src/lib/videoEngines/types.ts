export type VideoEngineType =
  | 'auto'
  | 'aritek-sora'
  | 'aritek-cartoon-pet'
  | 'aritek-character-mix';

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
