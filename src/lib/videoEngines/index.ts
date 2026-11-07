import { VideoGenerationRequest, VideoGenerationResult } from './types';
import { generateAritekVideo } from './aritekEngine';

export * from './types';
export * from './aritekEngine';

/**
 * Universal Video Generation Dispatcher.
 * Uses Aritek v1.9.3 Sora T2V high-speed real video generation engine.
 */
export async function executeVideoGeneration(
  request: VideoGenerationRequest
): Promise<VideoGenerationResult> {
  console.log(`[VideoDispatcher] Dispatching video request to Aritek Sora Engine...`);
  return await generateAritekVideo(request);
}
