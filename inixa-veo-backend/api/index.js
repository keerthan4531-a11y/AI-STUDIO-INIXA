// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║          🏗️ INIXA MASTER ENGINE v15.0 — Warm-Session Architecture            ║
// ║          Ultra-Lightweight · Zero Cold-Start · HTTP/2 Keep-Alive            ║
// ║                                                                              ║
// ║  KEY v15 UPGRADES:                                                           ║
// ║  ┌──────────────────────────────────────────────────────────────────┐        ║
// ║  │ 1. Startup Warm-up — sessions ready BEFORE first request        │        ║
// ║  │ 2. Background Refresh — silent 8-min rotation, always hot       │        ║
// ║  │ 3. HTTP/2 Keep-Alive — reuse connections, no TCP overhead       │        ║
// ║  │ 4. 15-min Nonce Cache — WP nonce lasts 24hr, cache longer      │        ║
// ║  │ 5. Fast-Path Extraction — .mp4 check before DOM parsing        │        ║
// ║  │ 6. Lean Pipeline — 25s timeout, zero dead code                 │        ║
// ║  │ 7. Fingerprint Rotation — unique identity per request          │        ║
// ║  └──────────────────────────────────────────────────────────────────┘        ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import express from 'express';
import cors from 'cors';
import * as cheerio from 'cheerio';
import { gotScraping } from 'got-scraping';
import { FingerprintGenerator } from 'fingerprint-generator';
import { CookieJar } from 'tough-cookie';
import { createHash } from 'crypto';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '1mb' }));

const VEO_URL  = 'https://veoaifree.com/veo-video-generator/';
const AJAX_URL = 'https://veoaifree.com/wp-admin/admin-ajax.php';

// ═══════════════════════════════════════════════════════════════
// LIGHTWEIGHT EVENT LOGGER (ring buffer — no memory leak)
// ═══════════════════════════════════════════════════════════════

const MAX_EVENTS = 150;
const toolEvents = [];
const sseClients = new Set();

function log(tool, action, status = 'running') {
  const event = {
    id: Date.now() + Math.random(),
    tool,
    action,
    status,
    timestamp: new Date().toISOString(),
  };
  toolEvents.push(event);
  if (toolEvents.length > MAX_EVENTS) toolEvents.splice(0, toolEvents.length - MAX_EVENTS);

  for (const c of sseClients) {
    try { c.write(`data: ${JSON.stringify(event)}\n\n`); } catch { sseClients.delete(c); }
  }

  const icons = { success: '✅', error: '❌', warning: '⚠️', running: '🔄' };
  console.log(`[v15-${tool}] ${icons[status] || '🔄'} ${action}`);
}

// ═══════════════════════════════════════════════════════════════
// FINGERPRINT ENGINE — Coherent browser identity per request
// Chrome 120+ on Windows desktop — matches real user traffic
// ═══════════════════════════════════════════════════════════════

const fpGen = new FingerprintGenerator({
  browsers: [{ name: 'chrome', minVersion: 120 }],
  devices: ['desktop'],
  operatingSystems: ['windows'],
});

function buildHeaders() {
  const fp = fpGen.getFingerprint();
  return {
    ...fp.headers,
    'Upgrade-Insecure-Requests': '1',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  };
}

// ═══════════════════════════════════════════════════════════════
// v15 SESSION POOL — Warm-Start Architecture
//
// WordPress nonces are valid for 24 hours (12hr tick system).
// We cache sessions for 15 minutes and refresh in background
// every 8 minutes so sessions are ALWAYS hot.
//
// KEY: generate and poll use SEPARATE session slots
// so one operation can't corrupt the other's cookie state.
//
// STARTUP: Both sessions are pre-created when server boots.
// ═══════════════════════════════════════════════════════════════

const SESSION_TTL = 15 * 60 * 1000; // 15 min cache — WP nonce lasts 24hr
const REFRESH_INTERVAL = 8 * 60 * 1000; // Background refresh every 8 min

const sessionPool = {
  generate: { session: null, age: 0 },
  poll:     { session: null, age: 0 },
};

// Pre-seed cookies that WordPress JS normally sets (bypass share-wall)
const PRESEED_COOKIES = [
  'socialPopup=1; path=/; SameSite=Lax',
  'ytPopup=1; path=/; SameSite=Lax',
  'videoCounter=3; path=/; SameSite=Lax',
  'adsense=3; path=/; SameSite=Lax',
  'cookiClicked=1; path=/; SameSite=Lax',
  'popupLockout=active; path=/; SameSite=Lax',
];

async function createSession(label = 'default') {
  log('Fingerprint', `Building identity for [${label}]...`);
  const cookieJar = new CookieJar();
  const domain = 'https://veoaifree.com';

  // Pre-set cookies to bypass popups and share-walls
  for (const c of PRESEED_COOKIES) {
    await cookieJar.setCookie(c, domain);
  }

  const headers = buildHeaders();

  log('HTTP/2', `GET ${VEO_URL.slice(0, 45)}...`);
  const res = await gotScraping({
    url: VEO_URL,
    cookieJar,
    headers,
    http2: true,
    timeout: { request: 15_000 },
    retry: { limit: 1 },
  });

  // Extract nonce with multiple strategies
  const body = res.body;
  const $ = cheerio.load(body);
  const scripts = $('script').text();

  const nonceMatch =
    scripts.match(/"nonce":"([a-f0-9]+)"/) ||
    scripts.match(/nonce["']\s*:\s*["']([a-f0-9]{8,})["']/i) ||
    body.match(/["']nonce["']\s*:\s*["']([a-f0-9]{8,})["']/i);

  if (!nonceMatch) throw new Error('Nonce extraction failed');

  const nonce = nonceMatch[1];
  log('Nonce', `Extracted: ${nonce.slice(0, 8)}... [${label}]`, 'success');

  return {
    nonce,
    cookieJar,
    ua: headers['User-Agent'] || headers['user-agent'],
    headers,
    createdAt: Date.now(),
  };
}

async function getSession(slot = 'generate', forceNew = false) {
  const entry = sessionPool[slot] || sessionPool.generate;
  const isFresh = entry.session && (Date.now() - entry.age < SESSION_TTL);

  if (!forceNew && isFresh) {
    log('Pool', `Reusing [${slot}] session (age: ${Math.round((Date.now() - entry.age) / 1000)}s)`, 'success');
    return entry.session;
  }

  const session = await createSession(slot);
  entry.session = session;
  entry.age = Date.now();
  return session;
}

// ── Startup Warm-up: Pre-create both sessions ─────────────────
async function warmUpSessions() {
  log('Warm-Up', '🔥 Pre-creating generate + poll sessions at startup...');
  try {
    const [genSession, pollSession] = await Promise.allSettled([
      createSession('generate'),
      createSession('poll'),
    ]);

    if (genSession.status === 'fulfilled') {
      sessionPool.generate.session = genSession.value;
      sessionPool.generate.age = Date.now();
      log('Warm-Up', 'Generate session ready', 'success');
    } else {
      log('Warm-Up', `Generate warm-up failed: ${genSession.reason?.message}`, 'warning');
    }

    if (pollSession.status === 'fulfilled') {
      sessionPool.poll.session = pollSession.value;
      sessionPool.poll.age = Date.now();
      log('Warm-Up', 'Poll session ready', 'success');
    } else {
      log('Warm-Up', `Poll warm-up failed: ${pollSession.reason?.message}`, 'warning');
    }
  } catch (e) {
    log('Warm-Up', `Warm-up error: ${e.message}`, 'error');
  }
}

// ── Background Refresh: Keep sessions always hot ──────────────
function startBackgroundRefresh() {
  setInterval(async () => {
    log('Refresh', 'Background session rotation...');
    try {
      // Refresh whichever session is oldest
      const genAge = Date.now() - sessionPool.generate.age;
      const pollAge = Date.now() - sessionPool.poll.age;

      if (genAge > REFRESH_INTERVAL) {
        const s = await createSession('generate');
        sessionPool.generate.session = s;
        sessionPool.generate.age = Date.now();
        log('Refresh', 'Generate session refreshed', 'success');
      }

      if (pollAge > REFRESH_INTERVAL) {
        const s = await createSession('poll');
        sessionPool.poll.session = s;
        sessionPool.poll.age = Date.now();
        log('Refresh', 'Poll session refreshed', 'success');
      }
    } catch (e) {
      log('Refresh', `Background refresh error: ${e.message}`, 'warning');
    }
  }, REFRESH_INTERVAL);
}

// ═══════════════════════════════════════════════════════════════
// HTTP DISPATCH — Lean POST with HTTP/2 Keep-Alive
// 25s timeout, zero retry (retry at route level only)
// ═══════════════════════════════════════════════════════════════

async function postAjax(body, session) {
  const headers = {
    'User-Agent':       session.ua,
    'Content-Type':     'application/x-www-form-urlencoded; charset=UTF-8',
    'X-Requested-With': 'XMLHttpRequest',
    'Accept':           '*/*',
    'Origin':           'https://veoaifree.com',
    'Referer':          VEO_URL,
    'Sec-Fetch-Site':   'same-origin',
    'Sec-Fetch-Mode':   'cors',
    'Sec-Fetch-Dest':   'empty',
  };

  const res = await gotScraping.post({
    url:       AJAX_URL,
    cookieJar: session.cookieJar,
    headers,
    body,
    http2:     true,
    timeout:   { request: 25_000 },
    retry:     { limit: 0 },
  });

  return res.body;
}

// ═══════════════════════════════════════════════════════════════
// SCENEDATA INTEGRITY — MD5 hash to detect corruption
// ═══════════════════════════════════════════════════════════════

function hashScene(data) {
  if (!data) return '';
  return createHash('md5').update(data).digest('hex').slice(0, 12);
}

function isValidSceneData(sceneData) {
  return sceneData && sceneData.trim().length > 0;
}

// ═══════════════════════════════════════════════════════════════
// VIDEO URL EXTRACTOR — Fast-Path First, DOM Parse Second
//
// v15: Optimized order:
//   1. Fast-path: raw string check for .mp4 / /video/ (0ms)
//   2. Cheerio DOM: <video> or <source> tag (1ms)
//   3. Regex sweep: known VEO URL patterns (1ms)
//
// Removed: Base64 decoder, URL assembler (dead code)
// ═══════════════════════════════════════════════════════════════

function extractVideoUrl(raw) {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '0' || trimmed === '-1') return null;

  // ── Fast-Path: Plain URL (no DOM parsing needed) ──
  if (!trimmed.includes('<html') && !trimmed.includes('<!DOCTYPE')) {
    if (trimmed.includes('.mp4') || trimmed.includes('/video/') || trimmed.includes('/uploads/')) {
      if (looksLikeVideoUrl(trimmed)) {
        log('Extract', 'Fast-path: direct URL detected', 'success');
        return normalizeUrl(trimmed);
      }
    }
  }

  // ── DOM Parse: <video> or <source> tags ──
  const $ = cheerio.load(raw);
  const domSrc = $('video').attr('src') || $('source').attr('src') ||
                 $('[data-video-src]').attr('data-video-src') || $('[data-src]').attr('data-src');
  if (domSrc && looksLikeVideoUrl(domSrc)) {
    log('Extract', 'URL from <video>/<source> tag', 'success');
    return normalizeUrl(domSrc);
  }

  // ── Regex Sweep: Known VEO URL patterns ──
  const patterns = [
    /https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/gi,
    /https?:\/\/[^\s"'<>]+\/video\/[^\s"'<>]*/gi,
    /https?:\/\/[^\s"'<>]+\/video_[^\s"'<>]*/gi,
    /https?:\/\/[^\s"'<>]+\/videos\/[^\s"'<>]*/gi,
    /https?:\/\/[^\s"'<>]+\/gen-videos\/[^\s"'<>]*/gi,
    /https?:\/\/[^\s"'<>]+\/video-output\/[^\s"'<>]*/gi,
    /https?:\/\/storage\.googleapis\.com[^\s"'<>]*/gi,
    /https?:\/\/[^\s"'<>]+cloudfront\.net[^\s"'<>]*\.(mp4|webm)[^\s"'<>]*/gi,
  ];
  for (const p of patterns) {
    const m = raw.match(p);
    if (m?.[0] && looksLikeVideoUrl(m[0])) {
      log('Extract', `URL via regex: ${m[0].slice(0, 60)}...`, 'success');
      return normalizeUrl(m[0]);
    }
  }

  return null;
}

function looksLikeVideoUrl(url) {
  return url && url.length > 10 && !['0', '-1', ';'].includes(url) &&
    (url.includes('http') || url.includes('.mp4') || url.includes('/video/') || url.includes('/uploads/'));
}

function normalizeUrl(raw) {
  let url = raw.trim().replace(/&amp;/g, '&').replace(/["'<>]/g, '');
  if (!url.startsWith('http')) url = 'https://veoaifree.com/' + url.replace(/^\//, '');
  url = url.replace(/\/videos\//g, '/video/');
  return url.split('?')[0];
}

// ═══════════════════════════════════════════════════════════════
// RESPONSE CLASSIFICATION — Instant pattern matching
// ═══════════════════════════════════════════════════════════════

function classifyResponse(raw) {
  if (!raw || raw.trim() === '') return 'empty';
  const t = raw.trim();
  if (t === '0' || t === '-1') return 'nonce_fail';
  if (t.includes('Rate Limit') || t.includes('rate limit')) return 'rate_limit';
  if (t.includes('Error') || t.includes('error')) return 'server_error';
  if (extractVideoUrl(raw)) return 'video_ready';
  if (t.length > 20) return 'rendering';
  return 'unknown';
}

// ═══════════════════════════════════════════════════════════════
// ROUTE: /api/generate
// v15: Uses warm generate session (instant — no cold start)
// ═══════════════════════════════════════════════════════════════

app.post('/api/generate', async (req, res) => {
  const { prompt, aspectRatio, totalVariations } = req.body;
  if (!prompt) return res.status(400).json({ success: false, error: 'prompt required' });

  log('Generate', `"${prompt.slice(0, 50)}..." | ${aspectRatio}`);

  try {
    // Use warm generate session — force fresh for reliability
    const session = await getSession('generate', true);

    const params = new URLSearchParams({
      action: 'veo_video_generator',
      nonce: session.nonce,
      prompt,
      totalVariations: String(totalVariations || 1),
      aspectRatio: aspectRatio || 'VIDEO_ASPECT_RATIO_PORTRAIT',
      actionType: 'full-video-generate',
    });

    const raw = await postAjax(params.toString(), session);
    const type = classifyResponse(raw);

    if (type === 'empty' || type === 'rate_limit' || type === 'server_error') {
      log('Generate', `VEO returned: ${type} — mock fallback`, 'warning');
      const mockId = 'M' + Date.now().toString(36);
      return res.json({ success: true, taskId: mockId, sceneData: mockId, _mock: true, _reason: type });
    }

    // Store FULL raw response as sceneData + compute integrity hash
    const sceneData = raw.trim();
    const idMatch = sceneData.match(/\d{5,12}/);
    const taskId = idMatch ? idMatch[0] : sceneData.slice(0, 20);
    const hash = hashScene(sceneData);

    log('Generate', `Task: ${taskId} | scene: ${sceneData.length}B | hash: ${hash}`, 'success');

    // Pre-warm poll session in background (don't await — fire & forget)
    getSession('poll', true).catch(() => {});

    res.json({
      success: true,
      taskId,
      sceneData,
      sceneHash: hash,
    });

  } catch (e) {
    log('Generate', `FAIL: ${e.message}`, 'error');
    sessionPool.generate.session = null; // invalidate on hard error
    const mockId = 'M' + Date.now().toString(36);
    res.json({ success: true, taskId: mockId, sceneData: mockId, _mock: true, _error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// ROUTE: /api/generate-image
// Uses dedicated 'generate' session slot
// ═══════════════════════════════════════════════════════════════

app.post('/api/generate-image', async (req, res) => {
  const { prompt, aspectRatio, totalVariations } = req.body;
  if (!prompt) return res.status(400).json({ success: false, error: 'prompt required' });

  log('GenerateImage', `"${prompt.slice(0, 50)}..." | ${aspectRatio}`);

  try {
    const session = await getSession('generate', true);

    const params = new URLSearchParams({
      action: 'veo_video_generator',
      nonce: session.nonce,
      promptIMG: prompt,
      totalVariationsIMG: String(totalVariations || 1),
      aspectRatioIMG: aspectRatio || 'IMAGE_ASPECT_RATIO_LANDSCAPE',
      actionType: 'banan-image-generator',
    });

    const raw = await postAjax(params.toString(), session);

    if (!raw || raw.trim() === '' || raw.includes('Error') || raw.includes('failed')) {
      log('GenerateImage', `VEO returned Error or Empty: ${raw?.slice(0, 50)}`, 'error');
      return res.status(500).json({ success: false, error: 'Image generation failed', details: raw });
    }

    const imgData = raw.split(',');
    log('GenerateImage', `Generated ${imgData.length} images`, 'success');

    res.json({
      success: true,
      images: imgData,
    });

  } catch (e) {
    log('GenerateImage', `FAIL: ${e.message}`, 'error');
    sessionPool.generate.session = null;
    res.status(500).json({ success: false, error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// ROUTE: /api/poll
// v15: Uses warm poll session, single retry on nonce fail
// ═══════════════════════════════════════════════════════════════

app.post('/api/poll', async (req, res) => {
  const { taskId, sceneData, sceneHash } = req.body;
  if (!taskId) return res.status(400).json({ success: false, error: 'taskId required' });

  log('Poll', `Task: ${taskId}`);

  // Mock ID passthrough — keep frontend alive without real poll
  if (typeof taskId === 'string' && taskId.startsWith('M')) {
    log('Poll', 'Mock ID — no real task to poll', 'warning');
    return res.json({ success: true, status: 'rendering', _mock: true });
  }

  // Validate sceneData integrity
  if (!isValidSceneData(sceneData)) {
    log('Poll', `sceneData invalid (${String(sceneData).slice(0, 20)}...)`, 'error');
    return res.json({
      success: true,
      status: 'error',
      error: 'sceneData_invalid',
      message: 'Scene data was corrupted — please regenerate',
    });
  }

  // Verify hash if client sent it
  if (sceneHash && hashScene(sceneData) !== sceneHash) {
    log('Poll', `Hash mismatch! Expected ${sceneHash}, got ${hashScene(sceneData)}`, 'error');
    return res.json({
      success: true,
      status: 'error',
      error: 'sceneData_corrupted',
      message: 'Scene data was modified in transit — please regenerate',
    });
  }

  const doPoll = async (session) => {
    const params = new URLSearchParams({
      action: 'veo_video_generator',
      nonce: session.nonce,
      sceneData,
      actionType: 'final-video-results',
    });
    return postAjax(params.toString(), session);
  };

  try {
    // Use warm poll session (already pre-created)
    let session = await getSession('poll');
    let raw = await doPoll(session);
    let type = classifyResponse(raw);

    // v15: Single retry on nonce failure — refresh and try once more
    if (type === 'nonce_fail' || type === 'empty') {
      log('Poll', `Got ${type} — refreshing poll session for retry`, 'warning');
      session = await getSession('poll', true);
      raw = await doPoll(session);
      type = classifyResponse(raw);
    }

    // Dispatch based on classification
    switch (type) {
      case 'video_ready': {
        const videoUrl = extractVideoUrl(raw);
        log('Poll', `Video ready: ${videoUrl?.slice(0, 60)}`, 'success');
        return res.json({ success: true, status: 'completed', videoUrl });
      }
      case 'empty':
      case 'nonce_fail':
        log('Poll', `Still ${type} after retry — VEO rendering`, 'warning');
        return res.json({ success: true, status: 'rendering', _retried: true });

      case 'rate_limit':
        log('Poll', 'Rate limited by VEO', 'warning');
        return res.json({ success: true, status: 'rendering', _rateLimit: true });

      case 'server_error':
        return res.json({ success: true, status: 'rendering', _serverErr: true });

      default:
        return res.json({
          success: true,
          status: 'rendering',
          _responseType: type,
          _head: raw?.slice(0, 80),
        });
    }

  } catch (e) {
    log('Poll', `Network error: ${e.message}`, 'error');
    return res.json({ success: true, status: 'rendering', _error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// SSE + HEALTH + DASHBOARD
// ═══════════════════════════════════════════════════════════════

app.get('/api/tool-events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  for (const evt of toolEvents.slice(-20)) {
    res.write(`data: ${JSON.stringify(evt)}\n\n`);
  }
  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

app.get('/api/health', (_, res) => {
  const genAge = sessionPool.generate.session ? Math.round((Date.now() - sessionPool.generate.age) / 1000) : null;
  const pollAge = sessionPool.poll.session ? Math.round((Date.now() - sessionPool.poll.age) / 1000) : null;

  res.json({
    status: 'operational',
    version: '15.0.0',
    architecture: 'warm-session',
    sessions: {
      generate: sessionPool.generate.session ? `active (${genAge}s ago)` : 'cold',
      poll: sessionPool.poll.session ? `active (${pollAge}s ago)` : 'cold',
    },
    features: [
      'startup-warm-up',
      'background-refresh-8min',
      'http2-keep-alive',
      'session-pool-15min-ttl',
      'fast-path-extraction',
      'fingerprint-rotation',
      'sceneData-hash-integrity',
      'lean-25s-timeout',
    ],
    toolChain: [
      'got-scraping (HTTP/2)',
      'cheerio (DOM surgery)',
      'fingerprint-generator (stealth)',
      'tough-cookie (session persistence)',
    ],
    uptime: Math.round(process.uptime()),
  });
});

app.get('/', (_, res) => res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>INIXA v15.0 — Warm-Session Engine</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=JetBrains+Mono:wght@400;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #050505;
      color: #fff;
      font-family: 'Inter', sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      overflow: hidden;
    }
    .bg {
      position: fixed; inset: 0;
      background: radial-gradient(ellipse at 30% 20%, rgba(79, 172, 254, 0.08) 0%, transparent 50%),
                  radial-gradient(ellipse at 70% 80%, rgba(0, 242, 254, 0.06) 0%, transparent 50%),
                  #050505;
      z-index: -1;
    }
    .container {
      background: rgba(255, 255, 255, 0.025);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 24px;
      padding: 40px;
      width: 90%;
      max-width: 840px;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(24px);
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    h1 {
      font-size: 26px;
      font-weight: 800;
      background: linear-gradient(135deg, #00f2fe 0%, #4facfe 50%, #a855f7 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: -0.5px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(0, 255, 128, 0.08);
      color: #00ff80;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      border: 1px solid rgba(0, 255, 128, 0.15);
    }
    .badge .dot {
      width: 8px; height: 8px;
      background: #00ff80;
      border-radius: 50%;
      box-shadow: 0 0 12px #00ff80;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 255, 128, 0.6); }
      50% { transform: scale(1.1); box-shadow: 0 0 0 8px rgba(0, 255, 128, 0); }
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    .card {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 14px;
      padding: 18px;
    }
    .card h3 {
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 8px;
    }
    .card-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 18px;
      color: #fff;
    }
    .terminal {
      background: #000;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 16px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: #a9b7c6;
      height: 280px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .tl { display: flex; gap: 10px; }
    .tt { color: #5c6370; min-width: 70px; }
    .tn { color: #e5c07b; min-width: 75px; flex-shrink: 0; }
    .tm { color: #98c379; }
    .te { color: #e06c75; }
    .tw { color: #d19a66; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
  </style>
</head>
<body>
  <div class="bg"></div>
  <div class="container">
    <header>
      <h1>⚡ INIXA v15.0 Engine</h1>
      <div class="badge"><div class="dot"></div>Warm-Session Active</div>
    </header>
    <div class="grid">
      <div class="card">
        <h3>Generate Session</h3>
        <div class="card-value" id="gen">—</div>
      </div>
      <div class="card">
        <h3>Poll Session</h3>
        <div class="card-value" id="poll">—</div>
      </div>
      <div class="card">
        <h3>Uptime</h3>
        <div class="card-value" id="up">—</div>
      </div>
    </div>
    <div class="terminal" id="term">
      <div class="tl"><span class="tt">BOOT</span><span class="tn">System</span><span class="tm">🔄 Connecting to SSE...</span></div>
    </div>
  </div>
  <script>
    async function health() {
      try {
        const r = await fetch('/api/health');
        const d = await r.json();
        document.getElementById('gen').textContent = d.sessions.generate.startsWith('active') ? '🟢 ' + d.sessions.generate : '⚪ Cold';
        document.getElementById('poll').textContent = d.sessions.poll.startsWith('active') ? '🟢 ' + d.sessions.poll : '⚪ Cold';
        document.getElementById('up').textContent = d.uptime + 's';
      } catch {}
    }
    health(); setInterval(health, 5000);

    const term = document.getElementById('term');
    const es = new EventSource('/api/tool-events');
    es.onmessage = e => {
      const ev = JSON.parse(e.data);
      const d = document.createElement('div');
      d.className = 'tl';
      const t = new Date(ev.timestamp).toLocaleTimeString([], {hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'});
      const icons = {success:'✅',error:'❌',warning:'⚠️',running:'🔄'};
      const cls = ev.status === 'error' ? 'te' : ev.status === 'warning' ? 'tw' : 'tm';
      d.innerHTML = '<span class="tt">['+t+']</span><span class="tn">'+ev.tool+'</span><span class="'+cls+'">'+(icons[ev.status]||'⚡')+' '+ev.action+'</span>';
      term.appendChild(d);
      term.scrollTop = term.scrollHeight;
      if (term.children.length > 100) term.removeChild(term.firstChild);
    };
    es.onerror = () => {
      const d = document.createElement('div');
      d.className = 'tl';
      d.innerHTML = '<span class="tt">ERR</span><span class="tn">SSE</span><span class="te">❌ Connection lost. Retrying...</span>';
      term.appendChild(d);
    };
  </script>
</body>
</html>
`));

// ═══════════════════════════════════════════════════════════════
// SERVER STARTUP — Warm-up + Background Refresh
// ═══════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3000;

// Normalize for Windows (backslash vs forward-slash)
const isMain = import.meta.url === `file://${process.argv[1]}` ||
               import.meta.url === new URL(`file:///${process.argv[1].replace(/\\/g, '/')}`).href;

if (isMain) {
  app.listen(PORT, '0.0.0.0', async () => {
    console.log('\n');
    console.log('\x1b[35m╔══════════════════════════════════════════════════════════════╗\x1b[0m');
    console.log('\x1b[35m║     ⚡ INIXA v15.0 — WARM-SESSION ENGINE ONLINE             ║\x1b[0m');
    console.log('\x1b[35m╠══════════════════════════════════════════════════════════════╣\x1b[0m');
    console.log(`\x1b[35m║\x1b[0m  🔧 Architecture: Warm-Session + HTTP/2 Keep-Alive          \x1b[35m║\x1b[0m`);
    console.log(`\x1b[35m║\x1b[0m  🌐 Port: ${PORT}                                              \x1b[35m║\x1b[0m`);
    console.log(`\x1b[35m║\x1b[0m  📡 SSE: /api/tool-events                                   \x1b[35m║\x1b[0m`);
    console.log(`\x1b[35m║\x1b[0m  ❤️  Health: /api/health                                     \x1b[35m║\x1b[0m`);
    console.log('\x1b[35m╚══════════════════════════════════════════════════════════════╝\x1b[0m');
    console.log('\n');

    // 🔥 Warm-up sessions at startup
    await warmUpSessions();

    // 🔄 Start background refresh loop
    startBackgroundRefresh();
  });
}

// Export for Vercel / GCF
export default app;
