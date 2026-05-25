// veoApi.ts — v11.0 (Cloudflare Worker backend)
//
// v11 UPGRADES:
//   • Switched to Cloudflare Worker backend (faster, same-network as veoaifree.com)
//   • Exponential backoff polling (12s → 45s) with ±7.5% jitter
//   • _mock detection — shorter wait if VEO rate-limited
//   • Reduced initial wait to 75s
//   • Cleaner error messages per failure type

import { Capacitor, CapacitorHttp } from '@capacitor/core';

let IS_CAP = false;
try { IS_CAP = Capacitor.isNativePlatform(); } catch { }

const CLOUD_BACKEND = 'https://inixa-veo-backend.vercel.app';

// ── Timing tuned from VEO's actual behavior ──────────────────
const INITIAL_WAIT = 75;       // seconds before first poll (was 85)
const BASE_POLL_INTERVAL = 12_000; // start at 12s, grows exponentially
const MAX_POLL_INTERVAL = 45_000; // cap at 45s
const MAX_POLLS = 20;     // 20 polls × avg 25s ≈ 8 min window
const BACKOFF_FACTOR = 1.4;    // 12 → 16.8 → 23.5 → 33 → 45

export type AspectRatio =
  | 'VIDEO_ASPECT_RATIO_PORTRAIT'
  | 'VIDEO_ASPECT_RATIO_LANDSCAPE'
  | 'VIDEO_ASPECT_RATIO_SQUARE';

// ── HTTP helper ──────────────────────────────────────────────────────────────

async function post(endpoint: string, body: unknown, signal?: AbortSignal): Promise<any> {
  const url = CLOUD_BACKEND + endpoint;

  if (IS_CAP) {
    const r = await CapacitorHttp.post({
      url,
      headers: { 'Content-Type': 'application/json' },
      data: body,
      connectTimeout: 120_000,
      readTimeout: 120_000,
    });
    return typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
  }

  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`Backend ${r.status}: ${text.slice(0, 80)}`);
  }
  return r.json();
}

// ── Delay with jitter (avoids thundering herd) ───────────────────────────────

function jitteredDelay(baseMs: number): number {
  const jitter = baseMs * 0.15 * (Math.random() - 0.5); // ±7.5%
  return Math.round(baseMs + jitter);
}

// ── Main export ──────────────────────────────────────────────────────────────

export async function generateVideo(
  prompt: string,
  aspectRatio: AspectRatio,
  _variations: number,
  onStatus: (msg: string) => void,
  onProgress: (pct: number) => void,
  signal?: AbortSignal,
): Promise<{ url: string }> {

  // ── Step 1: Kick off generation ──────────────────────────────────────────
  onStatus('🎬 Connecting to VEO Engine...');
  onProgress(3);

  const genData = await post('/api/generate', { prompt, aspectRatio }, signal);
  if (!genData?.success) throw new Error(genData?.error || 'Generation request failed');

  const taskId = genData.taskId as string;
  const sceneData = genData.sceneData as string;
  const sceneHash = genData.sceneHash as string | undefined;
  const isMock = !!genData._mock;

  console.log('[VEO v10] taskId:', taskId, '| sceneData:', sceneData?.length ?? 0, 'B | mock:', isMock);

  // v10: If server returned a mock (rate limited), use shorter wait
  const waitTime = isMock ? 30 : INITIAL_WAIT;

  // ── Step 2: Initial wait ─────────────────────────────────────────────────
  onStatus('🎨 VEO is rendering your video...');
  onProgress(8);

  const phases = [
    { label: 'Initializing Neural Core', end: 0.15 },
    { label: 'Loading VEO 3.1 Model', end: 0.30 },
    { label: 'Allocating GPU Resources', end: 0.50 },
    { label: 'Processing Video Frames', end: 0.75 },
    { label: 'Applying Cinematic Effects', end: 1.00 },
  ];

  for (let i = 0; i < waitTime; i++) {
    if (signal?.aborted) throw new Error('Cancelled');
    const ratio = i / waitTime;
    const pct = 8 + ratio * 40; // 8% → 48%
    const phase = phases.find(p => ratio < p.end) || phases[phases.length - 1];
    onStatus(`⚙️ ${phase.label}... (${i + 1}/${waitTime}s)`);
    onProgress(pct);
    await new Promise(r => setTimeout(r, 1000));
  }

  // ── Step 3: Exponential backoff polling ──────────────────────────────────
  let pollInterval = BASE_POLL_INTERVAL;
  let consecutiveEmpty = 0;

  for (let i = 0; i < MAX_POLLS; i++) {
    if (signal?.aborted) throw new Error('Cancelled');

    const pct = Math.min(48 + (i / MAX_POLLS) * 50, 98);
    onStatus(`⏳ Checking render status... (poll ${i + 1}/${MAX_POLLS})`);
    onProgress(pct);

    let pollData: any;
    try {
      pollData = await post('/api/poll', { taskId, sceneData, sceneHash }, signal);
    } catch (e: any) {
      console.warn('[VEO v10] Poll network error:', e.message);
      await new Promise(r => setTimeout(r, jitteredDelay(pollInterval)));
      pollInterval = Math.min(pollInterval * BACKOFF_FACTOR, MAX_POLL_INTERVAL);
      continue;
    }

    const status = pollData?.status as string;
    console.log(
      `[VEO v10] Poll ${i + 1} →`, status,
      pollData?._retried ? '(retried)' : '',
      pollData?._rateLimit ? '(RL)' : '',
    );

    // ── SUCCESS ────────────────────────────────────────────────────────────
    if (status === 'completed' && pollData?.videoUrl) {
      onProgress(100);
      onStatus('✅ Video ready!');
      const rawUrl = (pollData.videoUrl as string).replace(/\/videos\//g, '/video/');
      return { url: rawUrl };
    }

    // ── HARD ERROR — don't retry ───────────────────────────────────────────
    if (status === 'error') {
      const errCode = pollData?.error || '';
      if (errCode === 'sceneData_invalid' || errCode === 'sceneData_corrupted') {
        throw new Error('Video data was lost in transit. Please try generating again.');
      }
      throw new Error(pollData?.message || pollData?.error || 'Video generation failed');
    }

    // ── Still rendering — apply backoff ────────────────────────────────────
    if (pollData?._retried) {
      // Server already did a retry and still empty → double the wait
      consecutiveEmpty++;
      if (consecutiveEmpty >= 3) {
        // 3 consecutive empties after retry = likely stuck
        console.warn('[VEO v10] 3 consecutive empty polls — VEO may have dropped task');
      }
    } else {
      consecutiveEmpty = 0;
    }

    await new Promise(r => setTimeout(r, jitteredDelay(pollInterval)));
    pollInterval = Math.min(pollInterval * BACKOFF_FACTOR, MAX_POLL_INTERVAL);
  }

  throw new Error('Timeout — VEO took too long. Please try again.');
}
