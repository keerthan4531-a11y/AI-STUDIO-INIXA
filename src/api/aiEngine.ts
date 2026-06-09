/* eslint-disable @typescript-eslint/no-explicit-any */

// ═══════════════════════════════════════════════════════════════════
// Inixa AI Engine — 9router (decolua) Backend
// ═══════════════════════════════════════════════════════════════════
// 9router is a local AI proxy that routes to 40+ free providers.
// No API key, no cookie, no login required.
// Endpoint: http://localhost:20128/v1 (local)
// For production: Deploy 9router on Render/Railway via Docker.
// ═══════════════════════════════════════════════════════════════════

// ─── Model Definition ─────────────────────────────────────────────
export interface AIModel {
  id: string;
  label: string;
  engine: string;
  modelStr: string;
  provider?: string;
  badge?: string;
  badgeColor?: string;
  icon?: string;
  iconColor?: string;
  description?: string;
}

// ─── Available Models ──────────────────────────────────────────────
// These models are routed through 9router.
// 9router auto-selects the best free provider for each model.
// Model strings follow the format used by 9router's provider system.
export const AI_MODELS: AIModel[] = [
  // ── Direct Provider Models (via INIXA AI Gateway CF Worker) ──
  // These hit Pollinations.ai and DuckDuckGo DIRECTLY — no G4F, no proxies needed!




  {
    id: 'g4f-deepseek-v3.2',
    label: 'DeepSeek V3.2',
    engine: 'g4f',
    modelStr: 'g4f/srv_mp2huzrg06e426ad12f3:deepseek-ai/DeepSeek-V3.2',
    badge: 'FAST',
    badgeColor: 'blue',
    icon: 'Brain',
    iconColor: '#3b82f6',
    description: 'DeepSeek V3.2 via Proxy Pool'
  },
  {
    id: 'g4f-deepseek-v4-pro',
    label: 'DeepSeek V4 Pro',
    engine: 'g4f',
    modelStr: 'g4f/srv_mp2huzrg06e426ad12f3:deepseek-ai/DeepSeek-V4-Pro',
    badge: 'PRO',
    badgeColor: 'blue',
    icon: 'Brain',
    iconColor: '#3b82f6',
    description: 'DeepSeek V4 Pro via Proxy Pool'
  },
  {
    id: 'g4f-gemini-3-flash-preview',
    label: 'Gemini 3 Flash Preview',
    engine: 'g4f',
    modelStr: 'g4f/srv_mkol5tgcd33cc358ddbc:models/gemini-3-flash-preview',
    badge: 'GEMINI',
    badgeColor: 'violet',
    icon: 'Zap',
    iconColor: '#8b5cf6',
    description: 'Gemini 3 Flash Preview via Proxy Pool'
  },
  {
    id: 'g4f-gemini-3.5',
    label: 'Gemini 3.5 Flash',
    engine: 'g4f',
    modelStr: 'g4f/srv_mkol5tgcd33cc358ddbc:models/gemini-3.5-flash',
    badge: 'GEMINI',
    badgeColor: 'violet',
    icon: 'Zap',
    iconColor: '#8b5cf6',
    description: 'Gemini 3.5 Flash via Proxy Pool'
  },
  {
    id: 'g4f-gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    engine: 'g4f',
    modelStr: 'g4f/srv_mkol5tgcd33cc358ddbc:models/gemini-2.5-flash',
    badge: 'PRO',
    badgeColor: 'violet',
    icon: 'Brain',
    iconColor: '#8b5cf6',
    description: 'Gemini 2.5 Flash via Proxy Pool'
  },
  {
    id: 'g4f-gpt-oss',
    label: 'GPT-OSS 120B',
    engine: 'g4f',
    modelStr: 'g4f/srv_mkombumpae45db46dcb8:openai/gpt-oss-120b',
    badge: '120B',
    badgeColor: 'red',
    icon: 'Sparkles',
    iconColor: '#ef4444',
    description: 'GPT-OSS 120B via Proxy Pool'
  },
  {
    id: 'g4f-gpt-oss-20b',
    label: 'GPT-OSS 20B (Fast)',
    engine: 'g4f',
    modelStr: 'g4f/srv_mkom688d57c76d8a3542:openai/gpt-oss-20b',
    badge: 'FAST',
    badgeColor: 'green',
    icon: 'Zap',
    iconColor: '#10b981',
    description: 'GPT-OSS 20B via Proxy Pool'
  },
  {
    id: 'g4f-unmoderated-gpt',
    label: 'Unmoderated GPT',
    engine: 'g4f',
    modelStr: 'g4f/srv_mp3lmkuad07322459f47:unmoderated-gpt',
    badge: 'UNCENSORED',
    badgeColor: 'orange',
    icon: 'Unlock',
    iconColor: '#f97316',
    description: 'Unmoderated GPT via Proxy Pool'
  },
  {
    id: 'g4f-grok',
    label: 'Grok',
    engine: 'g4f',
    modelStr: 'g4f/srv_mkoloq41e34074b6133e:grok',
    badge: 'GROK',
    badgeColor: 'blue',
    icon: 'Globe',
    iconColor: '#3b82f6',
    description: 'X.AI Grok via Proxy Pool'
  },
  {
    id: 'g4f-kimi-k2.6',
    label: 'Kimi k2.6',
    engine: 'g4f',
    modelStr: 'g4f/srv_mp5miql908c8738d71be:kimi-k2.6',
    badge: 'KIMI',
    badgeColor: 'orange',
    icon: 'Brain',
    iconColor: '#f97316',
    description: 'Moonshot Kimi k2.6 via Proxy Pool'
  },
  {
    id: 'g4f-turbo',
    label: 'Perplexity Turbo',
    engine: 'g4f',
    modelStr: 'g4f/srv_mkopv2kp2e0038cdf550:turbo',
    badge: 'SEARCH',
    badgeColor: 'cyan',
    icon: 'Globe',
    iconColor: '#06b6d4',
    description: 'Perplexity Turbo via Proxy Pool'
  },
  {
    id: 'g4f-perplexity-fast',
    label: 'Perplexity Fast',
    engine: 'g4f',
    modelStr: 'g4f/perplexity-fast',
    badge: 'SEARCH LIVE',
    badgeColor: 'green',
    icon: 'Globe',
    iconColor: '#10b981',
    description: 'Real-time Web Search via G4F'
  },
  {
    id: 'gemini-3.5-flash',
    label: 'Gemini 3.5 Flash',
    engine: 'cloudflare',
    modelStr: 'gemini/gemini-3.5-flash',
    badge: 'SUPER FAST',
    badgeColor: 'violet',
    icon: 'Zap',
    iconColor: '#8b5cf6',
    description: 'Fast, coding, and agentic tasks'
  },
  {
    id: 'gemini-3.1-pro-preview',
    label: 'Gemini 3.1 Pro (Preview)',
    engine: 'cloudflare',
    modelStr: 'gemini/gemini-3.1-pro-preview',
    badge: 'PRO',
    badgeColor: 'violet',
    icon: 'Brain',
    iconColor: '#8b5cf6',
    description: 'Advanced reasoning and long docs'
  },
  {
    id: 'gemini-3.1-flash-lite',
    label: 'Gemini 3.1 Flash-Lite',
    engine: 'cloudflare',
    modelStr: 'gemini/gemini-3.1-flash-lite',
    badge: 'LITE',
    badgeColor: 'cyan',
    icon: 'Sparkles',
    iconColor: '#06b6d4',
    description: 'Ultra-Fast & Cheap'
  },
  {
    id: 'gemini-3.3-flash-preview',
    label: 'Gemini 3 Flash (Preview)',
    engine: 'cloudflare',
    modelStr: 'gemini/gemini-3.3-flash-preview',
    badge: 'NEW',
    badgeColor: 'violet',
    icon: 'Zap',
    iconColor: '#8b5cf6',
    description: 'Frontier class performance'
  },
  {
    id: 'gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    engine: 'cloudflare',
    modelStr: 'gemini/gemini-2.5-pro',
    badge: 'PRO',
    badgeColor: 'violet',
    icon: 'Brain',
    iconColor: '#8b5cf6',
    description: 'Stable coding and reasoning'
  },

  // ── Qwen Custom Worker Models ──
  {
    id: 'qw-qwen3.7-max',
    label: 'Qwen 3.7 Max',
    engine: 'g4f',
    modelStr: 'qwen_worker/qwen3.7-max',
    badge: 'NEW',
    badgeColor: 'violet',
    icon: 'Brain',
    iconColor: '#8b5cf6',
    description: 'Alibaba Qwen 3.7 Max'
  },
  {
    id: 'qw-qwen3.7-plus',
    label: 'Qwen 3.7 Plus',
    engine: 'g4f',
    modelStr: 'qwen_worker/qwen3.7-plus',
    badge: 'NEW',
    badgeColor: 'violet',
    icon: 'Zap',
    iconColor: '#8b5cf6',
    description: 'Alibaba Qwen 3.7 Plus'
  },
  {
    id: 'qw-qwen3.6-plus',
    label: 'Qwen 3.6 Plus',
    engine: 'g4f',
    modelStr: 'qwen_worker/qwen3.6-plus',
    icon: 'Star',
    iconColor: '#f59e0b',
    description: 'Alibaba Qwen 3.6 Plus'
  },

  // ── DeepInfra Models (via Proxy Pool) ──
  {
    id: 'di-nemotron-3-ultra',
    label: 'Nemotron 3 Ultra 550B',
    engine: 'g4f',
    modelStr: 'deepinfra/nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B',
    badge: 'DEEPINFRA',
    badgeColor: 'blue',
    icon: 'Brain',
    iconColor: '#3b82f6',
    description: 'NVIDIA 550B MoE via DeepInfra'
  },
  {
    id: 'di-nemotron-3-nano-omni',
    label: 'Nemotron Omni 30B',
    engine: 'g4f',
    modelStr: 'deepinfra/nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning',
    badge: 'DEEPINFRA',
    badgeColor: 'blue',
    icon: 'Sparkles',
    iconColor: '#3b82f6',
    description: 'NVIDIA Omni Reasoning 30B via DeepInfra'
  },

  {
    id: 'di-deepseek-v4-pro',
    label: 'DeepSeek V4 pro',
    engine: 'g4f',
    modelStr: 'deepinfra/deepseek-ai/DeepSeek-V4-Flash',
    badge: 'DEEPINFRA',
    badgeColor: 'blue',
    icon: 'Zap',
    iconColor: '#3b82f6',
    description: 'DeepSeek V4 Flash via DeepInfra'
  },
  {
    id: 'di-kimi-k2.6',
    label: 'Kimi K2.6',
    engine: 'g4f',
    modelStr: 'deepinfra/moonshotai/Kimi-K2.6',
    badge: 'DEEPINFRA',
    badgeColor: 'blue',
    icon: 'Star',
    iconColor: '#3b82f6',
    description: 'Moonshot Kimi K2.6 via DeepInfra'
  },
  {
    id: 'di-kimi-k2.5',
    label: 'Kimi K2.5',
    engine: 'g4f',
    modelStr: 'deepinfra/moonshotai/Kimi-K2.5',
    badge: 'DEEPINFRA',
    badgeColor: 'blue',
    icon: 'Star',
    iconColor: '#3b82f6',
    description: 'Moonshot Kimi K2.5 via DeepInfra'
  },
  {
    id: 'di-mimo-v2.5',
    label: 'MiMo V2.5',
    engine: 'g4f',
    modelStr: 'deepinfra/XiaomiMiMo/MiMo-V2.5',
    badge: 'DEEPINFRA',
    badgeColor: 'blue',
    icon: 'Sparkles',
    iconColor: '#3b82f6',
    description: 'Xiaomi MiMo V2.5 via DeepInfra'
  },
  {
    id: 'di-mimo-v2.5-pro',
    label: 'MiMo V2.5 Pro',
    engine: 'g4f',
    modelStr: 'deepinfra/XiaomiMiMo/MiMo-V2.5-Pro',
    badge: 'PRO',
    badgeColor: 'blue',
    icon: 'Sparkles',
    iconColor: '#3b82f6',
    description: 'Xiaomi MiMo V2.5 Pro via DeepInfra'
  },
  {
    id: 'perplexity-turbo',
    label: 'Perplexity Turbo',
    engine: 'g4f',
    modelStr: 'perplexity/turbo',
    provider: 'Perplexity',
    badge: 'SEARCH',
    badgeColor: 'orange',
    icon: 'Globe',
    iconColor: '#f97316',
    description: 'Perplexity Web Search (Real-time)'
  },
  {
    id: 'di-qwen-3.6-35b',
    label: 'Qwen3.6 35B',
    engine: 'g4f',
    modelStr: 'deepinfra/Qwen/Qwen3.6-35B-A3B',
    badge: 'DEEPINFRA',
    badgeColor: 'blue',
    icon: 'Brain',
    iconColor: '#3b82f6',
    description: 'Alibaba Qwen3.6 35B via DeepInfra'
  },
  {
    id: 'di-glm-5.1',
    label: 'GLM-5.1',
    engine: 'g4f',
    modelStr: 'deepinfra/zai-org/GLM-5.1',
    badge: 'DEEPINFRA',
    badgeColor: 'blue',
    icon: 'Brain',
    iconColor: '#3b82f6',
    description: 'Z-AI GLM-5.1 via DeepInfra'
  },
  {
    id: 'di-gemma-4-31b',
    label: 'Gemma 4 31B',
    engine: 'g4f',
    modelStr: 'deepinfra/google/gemma-4-31B-it',
    badge: 'DEEPINFRA',
    badgeColor: 'blue',
    icon: 'Star',
    iconColor: '#3b82f6',
    description: 'Google Gemma 4 31B via DeepInfra'
  },

  // ── Auto-Scraped Models (from free-llm-api-keys GitHub repo) ──
  // Only models with verified working keys are listed here
  {
    id: 'auto-smart-chat',
    label: 'Smart Chat (Auto)',
    engine: 'custom',
    modelStr: 'auto/smart-chat',
    badge: 'DEFAULT',
    badgeColor: 'violet',
    icon: 'Brain',
    iconColor: '#8b5cf6',
    description: 'Auto-routes across best working models'
  },
  {
    id: 'auto-kimi-k2.5',
    label: 'Kimi k2.5 (Auto)',
    engine: 'custom',
    modelStr: 'auto/kimi-k2.5',
    badge: 'AUTO',
    badgeColor: 'orange',
    icon: 'Sparkles',
    iconColor: '#f97316',
    description: 'Kimi long-context general model'
  },
  {
    id: 'auto-deepseek-chat',
    label: 'DeepSeek Chat',
    engine: 'custom',
    modelStr: 'auto/deepseek-chat',
    badge: 'AUTO',
    badgeColor: 'orange',
    icon: 'Brain',
    iconColor: '#f97316',
    description: 'DeepSeek V3 via auto-scraped keys'
  },
  {
    id: 'auto-gpt-5-5',
    label: 'GPT-5.5 (Auto)',
    engine: 'custom',
    modelStr: 'auto/gpt-5.5',
    badge: 'AUTO',
    badgeColor: 'orange',
    icon: 'Brain',
    iconColor: '#f97316',
    description: 'GPT-5.5 via auto-scraped keys'
  },
  {
    id: 'auto-claude-opus-4-7',
    label: 'Claude Opus 4.7 (Auto)',
    engine: 'custom',
    modelStr: 'auto/claude-opus-4-7',
    badge: 'AUTO',
    badgeColor: 'orange',
    icon: 'Star',
    iconColor: '#f97316',
    description: 'Claude Opus 4.7 via auto-scraped keys'
  },
  {
    id: 'auto-gemini-2.5-flash',
    label: 'Gemini 2.5 Flash (Auto)',
    engine: 'custom',
    modelStr: 'auto/gemini-2.5-flash',
    badge: 'AUTO',
    badgeColor: 'orange',
    icon: 'Zap',
    iconColor: '#f97316',
    description: 'Gemini 2.5 Flash via auto-scraped keys'
  },



  // ── DuckDuckGo AI Chat Models (via Cloudflare Worker /ddg) ──
  // Free DDG models routed through divine-leaf worker
  {
    id: 'ddg-gpt-5-mini',
    label: 'GPT-5 mini',
    engine: 'ddg',
    modelStr: 'ddg/gpt-5-mini',
    badge: 'DDG',
    badgeColor: 'green',
    icon: 'Globe',
    iconColor: '#10b981',
    description: 'OpenAI GPT-5 mini via DuckDuckGo'
  },
  {
    id: 'ddg-gpt-4o-mini',
    label: 'GPT-4o mini',
    engine: 'ddg',
    modelStr: 'ddg/gpt-4o-mini',
    badge: 'DDG',
    badgeColor: 'green',
    icon: 'Globe',
    iconColor: '#10b981',
    description: 'OpenAI GPT-4o mini via DuckDuckGo'
  },
  {
    id: 'ddg-gpt-oss',
    label: 'gpt-oss 120B',
    engine: 'ddg',
    modelStr: 'ddg/gpt-oss-120b',
    badge: 'BETA',
    badgeColor: 'orange',
    icon: 'Globe',
    iconColor: '#10b981',
    description: 'gpt-oss 120B via DuckDuckGo'
  },
  {
    id: 'ddg-llama-4-scout',
    label: 'Llama 4 Scout',
    engine: 'ddg',
    modelStr: 'ddg/Llama-4-Scout-17B-16E-Instruct',
    badge: 'DDG',
    badgeColor: 'green',
    icon: 'Globe',
    iconColor: '#10b981',
    description: 'Meta Llama 4 Scout via DuckDuckGo'
  },
  {
    id: 'ddg-claude-haiku-45',
    label: 'Claude Haiku 4.5',
    engine: 'ddg',
    modelStr: 'ddg/claude-haiku-4-5',
    badge: 'DDG',
    badgeColor: 'green',
    icon: 'Globe',
    iconColor: '#10b981',
    description: 'Anthropic Claude Haiku 4.5 via DuckDuckGo'
  },
  {
    id: 'ddg-mistral-small-4',
    label: 'Mistral Small 4',
    engine: 'ddg',
    modelStr: 'ddg/Mixtral-8x7B-Instruct-v0.1',
    badge: 'DDG',
    badgeColor: 'green',
    icon: 'Globe',
    iconColor: '#10b981',
    description: 'Mistral Small 4 via DuckDuckGo'
  },
];

// ─── Model Selection Helpers ───────────────────────────────────────
// Clear saved model on page load/refresh so it always defaults to MiMo V2.5
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('inixa_ai_model');
  } catch (e) { }
}

export const getSelectedModel = (): AIModel => {
  if (typeof window !== 'undefined') {
    try {
      const savedId = localStorage.getItem('inixa_ai_model');
      if (savedId) {
        const model = AI_MODELS.find(m => m.id === savedId);
        if (model) return model;
      }
    } catch (e) { }
  }
  return AI_MODELS.find(m => m.id === 'di-mimo-v2.5') || AI_MODELS[0];
};

export const setSelectedModel = (id: string) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('inixa_ai_model', id);
    } catch (e) { }
  }
};

// ─── Image Generation (Pollinations — Free, no key) ────────────────
export type ImageModelType = 'flux' | 'flux-realism' | 'any-dark' | 'flux-anime' | 'flux-3d' | 'turbo-v';

export const IMAGE_MODELS: { id: ImageModelType; label: string }[] = [
  { id: 'flux', label: 'FLUX.1 Pro (Ultimate)' },
  { id: 'flux-realism', label: 'FLUX.1 Realism (Ultra)' },
  { id: 'flux-anime', label: 'FLUX Anime (Stylized)' },
  { id: 'flux-3d', label: 'FLUX 3D (Rendered)' },
  { id: 'any-dark', label: 'Cinematic Dark (Elite)' },
  { id: 'turbo-v', label: 'DreamShaper Fast' },
];

export const aiGenerateImageWithProgress = async (
  prompt: string,
  onProgress?: (pct: number) => void,
  options?: { width?: number; height?: number; seed?: number; model?: ImageModelType }
): Promise<string> => {
  // Simulate progress
  if (onProgress) {
    let p = 0;
    const interval = setInterval(() => {
      p += 15;
      if (p >= 90) clearInterval(interval);
      onProgress(Math.min(p, 90));
    }, 500);
  }

  const { width = 1024, height = 1024, seed = Math.floor(Math.random() * 99999), model = 'flux' } = options || {};

  const response = await fetch(`${CF_WORKER_URL}/api/generate-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, model, width, height, seed })
  });

  if (!response.ok) {
    let errorMsg = 'Image generation failed';
    try {
      const errData = await response.json();
      if (errData.error) errorMsg = errData.error;
    } catch (e) {
      // Ignore parse error
    }
    throw new Error(errorMsg);
  }

  const blob = await response.blob();
  if (onProgress) onProgress(100);

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// ─── Cloudflare Worker URL ─────────────────────────────────────────
export const CF_WORKER_URL = 'https://divine-leaf-d1cf.antigravity4531.workers.dev';

// ─── Direct Pollinations API (OpenAI-compatible) ──────────────────
// text.pollinations.ai/openai — free, no key, CORS-enabled
// Works directly from browser!
async function callPollinationsDirect(
  messages: any[],
  modelName: string,
  onChunk?: (c: string, citations?: string[]) => void
): Promise<string> {
  console.log(`[Pollinations] Routing to CF Worker /pollinations with model: ${modelName}`);

  try {
    const res = await fetch(`${CF_WORKER_URL}/pollinations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        messages,
      }),
    });

    const data = await res.json();
    if (data.ok && data.content) {
      console.log(`[Pollinations] Success! Tier used: ${data.tier}`);
      if (onChunk) onChunk(data.content);
      return data.content;
    }

    console.warn('[Pollinations] CF Worker returned error:', data.error);
    return `⚠️ Pollinations error: ${data.error || 'Empty response'}`;
  } catch (e) {
    console.error('[Pollinations] Fetch error:', e);
    return '⚠️ Failed to reach Pollinations CF Worker. Check your connection.';
  }
}

// ─── Direct DDG via CF Worker → Pollinations fallback ─────────────
async function callDDGDirect(
  messages: any[],
  modelName: string,
  onChunk?: (c: string) => void
): Promise<string> {
  console.log(`[DDG Direct] Trying CF Worker /ddg with model: ${modelName}`);

  // Try CF Worker /ddg endpoint first
  try {
    const res = await fetch(`${CF_WORKER_URL}/ddg`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelName, messages }),
    });

    const data = await res.json();
    if (data.ok && data.content) {
      console.log('[DDG Direct] CF Worker /ddg succeeded!');
      if (onChunk) onChunk(data.content);
      return data.content;
    }
    console.warn('[DDG Direct] CF Worker /ddg failed:', data.error);
  } catch (e) {
    console.warn('[DDG Direct] CF Worker /ddg error:', e);
  }

  // Fallback: Try CF Worker /pollinations (which has DDG as a tier)
  console.log('[DDG Direct] Falling back to CF Worker /pollinations');
  try {
    const res = await fetch(`${CF_WORKER_URL}/pollinations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelName, messages }),
    });

    const data = await res.json();
    if (data.ok && data.content) {
      console.log('[DDG Direct] CF Worker /pollinations succeeded! Tier:', data.tier);
      if (onChunk) onChunk(data.content);
      return data.content;
    }
    console.warn('[DDG Direct] CF Worker /pollinations also failed:', data.error);
  } catch (e) {
    console.warn('[DDG Direct] CF Worker /pollinations error:', e);
  }

  // Final fallback: Pollinations direct API
  console.log('[DDG Direct] Final fallback to text.pollinations.ai');
  return callPollinationsDirect(messages, 'openai', onChunk);
}

// ─── Helper: Handle SSE Streaming ─────────────────────────────────
async function handleSSEStream(res: Response, onChunk: (c: string, citations?: string[]) => void): Promise<string> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder('utf-8');
  let fullReply = '';
  let buffer = '';
  let citations: string[] | undefined = undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let changed = false;
    let boundary = buffer.indexOf('\n');
    while (boundary !== -1) {
      const line = buffer.slice(0, boundary).trim();
      buffer = buffer.slice(boundary + 1);

      if (line.startsWith('data: ')) {
        const dataStr = line.slice(6).trim();
        if (dataStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.citations && Array.isArray(parsed.citations)) citations = parsed.citations;
          const content = parsed.choices?.[0]?.delta?.content || parsed.message || '';
          if (content) {
            fullReply += content;
            changed = true;
          }
        } catch (e) {
          // Ignore partial JSON parsing errors if any
        }
      }
      boundary = buffer.indexOf('\n');
    }

    if (changed) {
      onChunk(fullReply, citations);
    }
  }
  return fullReply || 'No response received from the AI model.';
}

// ─── Provider Rate Limit Cache Helpers ────────────────────────────
function setProviderLimit(provider: string) {
  try {
    localStorage.setItem(`inixa_rate_limit_${provider}`, Date.now().toString());
  } catch (e) {
    // Ignore localStorage errors
  }
}

function checkProviderLimit(provider: string): boolean {
  try {
    const stored = localStorage.getItem(`inixa_rate_limit_${provider}`);
    if (!stored) return false;

    const timestamp = parseInt(stored, 10);
    const ONE_HOUR = 60 * 60 * 1000;

    if (Date.now() - timestamp < ONE_HOUR) {
      return true; // Limit is active
    } else {
      localStorage.removeItem(`inixa_rate_limit_${provider}`); // Expired
      return false;
    }
  } catch (e) {
    return false;
  }
}

// ─── Main Chat Engine ─────────────────────────────────────────────
// All requests go through our Next.js API route (/api/chat)
export const aiChat = async (
  messages: any[],
  onChunk?: (c: string, citations?: string[]) => void,
  modelOverride?: any
): Promise<string> => {
  try {
    const model = modelOverride || getSelectedModel();

    // Extract the text content from the last message
    const lastMessage = messages[messages.length - 1];
    const messageText = typeof lastMessage.content === 'string'
      ? lastMessage.content
      : Array.isArray(lastMessage.content)
        ? lastMessage.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n')
        : String(lastMessage.content);

    // Build full conversation history for context
    const conversationHistory = messages.map(m => ({
      role: m.role as string,
      content: typeof m.content === 'string'
        ? m.content
        : Array.isArray(m.content)
          ? m.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n')
          : String(m.content)
    }));

    const modelStr = model.modelStr;
    console.log(`[aiChat] Model: ${model.label}, Engine: ${model.engine}, ModelStr: ${modelStr}, Provider: ${model.provider || 'default'}`);

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

    // Route based on engine type
    let endpointPath: string;
    let fetchUrl: string;

    if (model.engine === 'direct') {
      // Direct models go through our INIXA AI Gateway CF Worker
      // This hits Pollinations/DDG directly - no G4F, no proxies!
      fetchUrl = `${CF_WORKER_URL}/v1/chat/completions`;
      console.log(`[aiChat] Direct routing via CF Worker: ${fetchUrl}`);
    } else if (model.engine === 'g4f') {
      // ── Client-Side Direct Fetch Attempt (User IP) ──
      let directEndpoint = '';
      let directModelStr = '';

      let provider = 'g4f';
      if (modelStr.startsWith('deepinfra/')) {
        directModelStr = modelStr.replace('deepinfra/', '');
        directEndpoint = 'https://api.deepinfra.com/v1/openai/chat/completions';
        provider = 'deepinfra';
      } else if (modelStr.startsWith('qwen_worker/')) {
        directModelStr = modelStr.replace('qwen_worker/', '');
        directEndpoint = 'https://qwen.g4f-dev.workers.dev/v1/chat/completions';
        provider = 'qwen_worker';
      } else if (modelStr.startsWith('perplexity/')) {
        directModelStr = modelStr.replace('perplexity/', '');
        directEndpoint = 'https://perplexity.g4f-dev.workers.dev/chat/completions';
        provider = 'perplexity';
      } else {
        directModelStr = modelStr.replace('g4f/', '');
        directEndpoint = 'https://g4f.space/v1/chat/completions';
        provider = 'g4f';
      }

      if (checkProviderLimit(provider)) {
        console.log(`[Frontend Fetch] User IP rate limited for ${provider}. Skipping direct fetch for 1 hour.`);
      } else {
        console.log(`[Frontend Fetch] Attempting to hit ${directEndpoint} from User IP...`);
        try {
          const directRes = await fetch(directEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': onChunk ? 'text/event-stream' : 'application/json'
            },
            body: JSON.stringify({
              messages: conversationHistory,
              model: directModelStr,
              stream: !!onChunk
            })
          });

          if (directRes.ok) {
            console.log(`[Frontend Fetch] Success from User IP!`);
            if (onChunk && directRes.body) {
              return await handleSSEStream(directRes, onChunk);
            } else {
              const data = await directRes.json();
              return data.choices?.[0]?.message?.content || data.reply || '';
            }
          } else {
            console.warn(`[Frontend Fetch] Failed with status ${directRes.status}. Falling back to Backend Proxy Pool...`);
            setProviderLimit(provider);
          }
        } catch (err) {
          console.warn(`[Frontend Fetch] Network error: ${err}. Falling back to Backend Proxy Pool...`);
          setProviderLimit(provider);
        }
      } // End of else block for checkProviderLimit

      // Fallback: Use our Backend Proxy Pool
      endpointPath = '/api/chat/g4f';
      fetchUrl = `${API_BASE}${endpointPath}`;
    } else {
      endpointPath = '/api/chat/completions';
      fetchUrl = `${API_BASE}${endpointPath}`;
    }

    const res = await fetch(fetchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // Security update: Removed static secret. Backend now uses Origin + Rate Limiting.
      },
      body: JSON.stringify({
        messages: conversationHistory,
        model: modelStr,
        provider: model.provider,
        stream: !!onChunk
      })
    });

    if (!res.ok) {
      if (res.status === 429) {
        return '⚠️ Rate limit exceeded. Please wait a moment and try again.';
      }
      try {
        const errorData = await res.json();
        if (errorData.reply) return errorData.reply;
        if (errorData.error) return `⚠️ API Error: ${errorData.error}`;
      } catch { }
      return `❌ Error: Server returned ${res.status}.`;
    }

    if (onChunk && res.body) {
      return await handleSSEStream(res, onChunk);
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || data.reply || '';
    return reply || 'No response received from the AI model.';
  } catch (e) {
    console.error('Chat API Error', e);
    return '❌ Connection failed. Please try a different model or check your connection.';
  }
};

// ─── Web Search & Scrape ─────────────────────────────────────────────
export const aiWebSearch = async (query: string): Promise<any[]> => {
  try {
    const res = await fetch(`${CF_WORKER_URL}/web-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    const data = await res.json();
    if (data.ok && data.results) return data.results;
  } catch (e) {
    console.error('Web Search Error:', e);
  }
  return [];
};

export const aiWebScrape = async (url: string): Promise<string> => {
  try {
    const res = await fetch(`${CF_WORKER_URL}/web-scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const data = await res.json();
    if (data.ok && data.text) return data.text;
  } catch (e) {
    console.error('Web Scrape Error:', e);
  }
  return '';
};
