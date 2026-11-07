import { VideoGenerationRequest, VideoGenerationResult, VideoEngineType } from './types';

interface EngineConfig {
  baseUrl: string;
  sign: string;
  versionCode: string;
  deviceIdLen: number;
}

const ENGINE_CONFIGS: Record<string, EngineConfig> = {
  'aritek-sora': {
    baseUrl: 'https://t2v.aritek.app',
    sign: '68d6165b72a7f2d8d17b0dc6fe9691abdf77c583',
    versionCode: '93',
    deviceIdLen: 32,
  },
  'aritek-cartoon-pet': {
    baseUrl: 'https://t2p.aritek.app',
    sign: '7259cb222a66496242650023583742fe40ea0a80',
    versionCode: '23',
    deviceIdLen: 16,
  },
  'aritek-character-mix': {
    baseUrl: 'https://aifusion.aritek.app',
    sign: '3325ecccfae4a0c4ee7eed0a4043daac58c51bec',
    versionCode: '22',
    deviceIdLen: 32,
  },
};

const CTRY_TARGET = 'others';
const UA = 'okhttp/4.12.0';

function getRandomHex(len: number): string {
  return Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

interface AritekSession {
  deviceId: string;
  token: string;
  expiresAt: number;
  usesRemaining: number;
}

const sessionStore: Map<string, AritekSession> = new Map();

/**
 * Bootstraps a fresh guest token for the requested Aritek engine.
 * Zero login, zero account, zero cookies required.
 */
async function getOrBootstrapSession(engineKey: string): Promise<{ deviceId: string; token: string }> {
  const config = ENGINE_CONFIGS[engineKey] || ENGINE_CONFIGS['aritek-sora'];
  const now = Date.now();
  const cached = sessionStore.get(engineKey);

  if (cached && cached.expiresAt > now && cached.usesRemaining > 1) {
    cached.usesRemaining -= 1;
    return { deviceId: cached.deviceId, token: cached.token };
  }

  const deviceId = getRandomHex(config.deviceIdLen);
  console.log(`[AritekEngine] Bootstrapping fresh guest session for ${engineKey} (Device-Id: ${deviceId})...`);

  const infoRes = await fetch(`${config.baseUrl}/api/v1/user/info`, {
    headers: {
      Sign: config.sign,
      versionCode: config.versionCode,
      'Ctry-Target': CTRY_TARGET,
      pt: '',
      'User-Agent': UA,
      Accept: 'application/json',
      'Device-Id': deviceId,
    },
  });

  if (!infoRes.ok) {
    const errText = await infoRes.text().catch(() => '');
    throw new Error(`[${engineKey}] Bootstrap HTTP ${infoRes.status}: ${errText}`);
  }

  const data = await infoRes.json();
  const token = data?.data?.token;
  if (!token) {
    throw new Error(`[${engineKey}] Bootstrap returned no token: ${JSON.stringify(data)}`);
  }

  const ttl = Number(data?.data?.ttl || 3600);
  sessionStore.set(engineKey, {
    deviceId,
    token,
    expiresAt: now + (ttl - 120) * 1000,
    usesRemaining: 9, // 10 free per device
  });

  return { deviceId, token };
}

/**
 * Universal video generation across all verified Aritek zero-auth engines:
 * 1. aritek-sora: General Sora AI Video v1.9.3 (~2.5s)
 * 2. aritek-cartoon-pet: Cartoon, Pet & 3D Video v1.2.3 (~3.5s)
 * 3. aritek-character-mix: Character Fusion & Mix v1.2.2 (~100s)
 */
export async function generateAritekVideo(
  request: VideoGenerationRequest
): Promise<VideoGenerationResult> {
  const prompt = request.prompt?.trim();
  if (!prompt) {
    throw new Error('Prompt is required for video generation');
  }

  const engineKey = (request.model && ENGINE_CONFIGS[request.model])
    ? request.model
    : 'aritek-sora';

  const config = ENGINE_CONFIGS[engineKey];

  // Map aspect ratio
  let aspectRatio = '9:16';
  if (request.aspectRatio === 'VIDEO_ASPECT_RATIO_LANDSCAPE') {
    aspectRatio = '16:9';
  } else if (request.aspectRatio === 'VIDEO_ASPECT_RATIO_SQUARE') {
    aspectRatio = '1:1';
  }

  const { deviceId, token } = await getOrBootstrapSession(engineKey);

  console.log(`[AritekEngine] [${engineKey}] Requesting video: "${prompt.slice(0, 50)}..."`);
  const startTime = Date.now();

  // Build model-specific endpoint and body
  let endpoint = `${config.baseUrl}/api/v1/video/t2v`;
  let requestBody: any;

  if (engineKey === 'aritek-sora') {
    endpoint = `${config.baseUrl}/api/v4/video/t2v`;
    requestBody = {
      prompt,
      aspect_ratio: aspectRatio,
      ai_sound: 1,
    };
  } else if (engineKey === 'aritek-cartoon-pet') {
    endpoint = `${config.baseUrl}/api/v1/video/t2v`;
    requestBody = {
      prompt,
      versionCode: Number(config.versionCode),
      deviceID: deviceId,
      isPremium: 0,
      ctry_target: CTRY_TARGET,
      used: [],
      aspect_ratio: aspectRatio,
      ai_sound: 1,
    };
  } else if (engineKey === 'aritek-character-mix') {
    endpoint = `${config.baseUrl}/api/v1/video/t2v`;
    requestBody = {
      prompt,
      ratio: aspectRatio,
      resolution: '480p',
      ai_sound: 1,
      used: [],
    };
  }

  const makeRequest = async (devId: string, tok: string) => {
    return await fetch(endpoint, {
      method: 'POST',
      headers: {
        Sign: config.sign,
        versionCode: config.versionCode,
        'Ctry-Target': CTRY_TARGET,
        pt: '',
        'User-Agent': UA,
        Accept: 'application/json',
        'Device-Id': devId,
        Authorization: `Bearer ${tok}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
  };

  let response = await makeRequest(deviceId, token);

  // If quota exhausted (429 or -22), clear session and retry once with a fresh Device-Id
  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    if (response.status === 429 || errText.includes('-22') || errText.includes('limit')) {
      console.warn(`[AritekEngine] [${engineKey}] Device quota reached, auto-rotating Device-Id...`);
      sessionStore.delete(engineKey);
      const fresh = await getOrBootstrapSession(engineKey);
      if (engineKey === 'aritek-cartoon-pet' && requestBody) {
        requestBody.deviceID = fresh.deviceId;
      }
      response = await makeRequest(fresh.deviceId, fresh.token);
    } else {
      throw new Error(`[${engineKey}] Video generation HTTP ${response.status}: ${errText}`);
    }
  }

  const result = await response.json();
  const videoUrl = result?.data?.url;

  if (!videoUrl) {
    throw new Error(`[${engineKey}] No video URL returned: ${JSON.stringify(result)}`);
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`[AritekEngine] [${engineKey}] Video created in ${elapsed}s: ${videoUrl}`);

  return {
    videoUrl,
    engineUsed: engineKey as VideoEngineType,
    status: 'completed',
    durationSeconds: elapsed || 4,
  };
}
