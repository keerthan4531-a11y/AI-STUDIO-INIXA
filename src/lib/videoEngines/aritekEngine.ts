import { VideoGenerationRequest, VideoGenerationResult } from './types';

const BASE = 'https://t2v.aritek.app';
const SIGN = '68d6165b72a7f2d8d17b0dc6fe9691abdf77c583';
const VERSION_CODE = '93';
const CTRY_TARGET = 'others';
const UA = 'okhttp/4.9.3';

function getRandomDeviceId(): string {
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

interface AritekTokenSession {
  deviceId: string;
  token: string;
  expiresAt: number;
  usesRemaining: number;
}

let activeSession: AritekTokenSession | null = null;

/**
 * Bootstraps a fresh guest token from t2v.aritek.app.
 * Zero login, zero account, zero cookies required.
 */
async function getOrBootstrapSession(): Promise<{ deviceId: string; token: string }> {
  const now = Date.now();
  if (activeSession && activeSession.expiresAt > now && activeSession.usesRemaining > 1) {
    activeSession.usesRemaining -= 1;
    return { deviceId: activeSession.deviceId, token: activeSession.token };
  }

  const deviceId = getRandomDeviceId();
  console.log(`[AritekEngine] Bootstrapping fresh guest session for Device-Id: ${deviceId}...`);

  const infoRes = await fetch(`${BASE}/api/v1/user/info`, {
    headers: {
      sign: SIGN,
      versionCode: VERSION_CODE,
      'Ctry-Target': CTRY_TARGET,
      pt: '',
      'User-Agent': UA,
      Accept: 'application/json',
      'Device-Id': deviceId
    }
  });

  if (!infoRes.ok) {
    const errText = await infoRes.text().catch(() => '');
    throw new Error(`Aritek bootstrap HTTP ${infoRes.status}: ${errText}`);
  }

  const data = await infoRes.json();
  const token = data?.data?.token;
  if (!token) {
    throw new Error(`Aritek bootstrap returned no token: ${JSON.stringify(data)}`);
  }

  const ttl = Number(data?.data?.ttl || 3600);
  activeSession = {
    deviceId,
    token,
    expiresAt: now + (ttl - 120) * 1000,
    usesRemaining: 9 // 10 free per device
  };

  return { deviceId, token };
}

/**
 * Generates an ultra-fast high-definition MP4 video from a text prompt.
 * Reverse-engineered from AI Video Generator v1.9.3 (aritek).
 */
export async function generateAritekVideo(
  request: VideoGenerationRequest
): Promise<VideoGenerationResult> {
  const prompt = request.prompt?.trim();
  if (!prompt) {
    throw new Error('Prompt is required for video generation');
  }

  // Map aspect ratio
  let aspectRatio = '9:16';
  if (request.aspectRatio === 'VIDEO_ASPECT_RATIO_LANDSCAPE') {
    aspectRatio = '16:9';
  } else if (request.aspectRatio === 'VIDEO_ASPECT_RATIO_SQUARE') {
    aspectRatio = '1:1';
  }

  const { deviceId, token } = await getOrBootstrapSession();

  console.log(`[AritekEngine] Requesting video generation: "${prompt.slice(0, 60)}..."`);
  const startTime = Date.now();

  const response = await fetch(`${BASE}/api/v4/video/t2v`, {
    method: 'POST',
    headers: {
      sign: SIGN,
      versionCode: VERSION_CODE,
      'Ctry-Target': CTRY_TARGET,
      pt: '',
      'User-Agent': UA,
      Accept: 'application/json',
      'Device-Id': deviceId,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt,
      aspect_ratio: aspectRatio,
      ai_sound: 1
    })
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    // If quota exhausted, invalidate session and retry once with fresh device
    if (response.status === 429 || errText.includes('-22')) {
      activeSession = null;
      console.warn('[AritekEngine] Device quota reached, retrying with fresh Device-Id...');
      const fresh = await getOrBootstrapSession();
      const retryRes = await fetch(`${BASE}/api/v4/video/t2v`, {
        method: 'POST',
        headers: {
          sign: SIGN,
          versionCode: VERSION_CODE,
          'Ctry-Target': CTRY_TARGET,
          pt: '',
          'User-Agent': UA,
          Accept: 'application/json',
          'Device-Id': fresh.deviceId,
          Authorization: `Bearer ${fresh.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          aspect_ratio: aspectRatio,
          ai_sound: 1
        })
      });
      const retryData = await retryRes.json();
      const url = retryData?.data?.url;
      if (url) {
        return {
          videoUrl: url,
          engineUsed: 'aritek-sora',
          status: 'completed',
          durationSeconds: Math.round((Date.now() - startTime) / 1000)
        };
      }
    }
    throw new Error(`Aritek video generation HTTP ${response.status}: ${errText}`);
  }

  const result = await response.json();
  const videoUrl = result?.data?.url;

  if (!videoUrl) {
    throw new Error(`No video URL in Aritek response: ${JSON.stringify(result)}`);
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`[AritekEngine] Video successfully generated in ${elapsed}s: ${videoUrl}`);

  return {
    videoUrl,
    engineUsed: 'aritek-sora',
    status: 'completed',
    durationSeconds: elapsed || 4
  };
}
