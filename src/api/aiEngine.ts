/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSignedHeaders, sanitizeInput } from '../lib/security';

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

  // ════════════════════════════════════════════════════════════════
  // 🟢 MINITOOLAI (via Cloudflare Worker)
  // ════════════════════════════════════════════════════════════════
  {
    id: 'minitool-gpt-5.6-luna',
    label: 'GPT-5.6 Luna',
    engine: 'g4f',
    modelStr: 'minitool/gpt-5.6-luna',
    badge: 'LUNA',
    badgeColor: 'violet',
    icon: 'Sparkles',
    iconColor: '#8b5cf6',
    description: 'GPT-5.6 Luna via MiniToolAI'
  },
  {
    id: 'minitool-gpt-5.6-terra',
    label: 'GPT-5.6 Terra',
    engine: 'g4f',
    modelStr: 'minitool/gpt-5.6-terra',
    badge: 'TERRA',
    badgeColor: 'blue',
    icon: 'Brain',
    iconColor: '#3b82f6',
    description: 'GPT-5.6 Terra (Reasoning) via MiniToolAI'
  },
  {
    id: 'minitool-gpt-4o',
    label: 'GPT-4o (MiniTool)',
    engine: 'g4f',
    modelStr: 'minitool/gpt-4o',
    badge: '4O',
    badgeColor: 'green',
    icon: 'Zap',
    iconColor: '#10b981',
    description: 'GPT-4o via MiniToolAI'
  },
  {
    id: 'minitool-gpt-5.4-fast',
    label: 'GPT-5.4 Fast',
    engine: 'g4f',
    modelStr: 'minitool/gpt-5.4-fast',
    badge: 'FAST',
    badgeColor: 'green',
    icon: 'Zap',
    iconColor: '#10b981',
    description: 'GPT-5.4 Fast via MiniToolAI'
  },
  {
    id: 'minitool-gpt-5.4-mini',
    label: 'GPT-5.4 Mini (MiniTool)',
    engine: 'g4f',
    modelStr: 'minitool/gpt-5.4-mini',
    badge: 'MINI',
    badgeColor: 'teal',
    icon: 'Sparkles',
    iconColor: '#14b8a6',
    description: 'GPT-5.4 Mini via MiniToolAI'
  },
  {
    id: 'minitool-gpt-4.1',
    label: 'GPT-4.1 (MiniTool)',
    engine: 'g4f',
    modelStr: 'minitool/gpt-4.1',
    badge: '4.1',
    badgeColor: 'cyan',
    icon: 'Zap',
    iconColor: '#06b6d4',
    description: 'GPT-4.1 via MiniToolAI'
  },
  {
    id: 'minitool-gpt-4.1-mini',
    label: 'GPT-4.1 Mini (MiniTool)',
    engine: 'g4f',
    modelStr: 'minitool/gpt-4.1-mini',
    badge: 'MINI',
    badgeColor: 'cyan',
    icon: 'Zap',
    iconColor: '#06b6d4',
    description: 'GPT-4.1 Mini via MiniToolAI'
  },
  {
    id: 'minitool-gpt-5',
    label: 'GPT-5 (MiniTool)',
    engine: 'g4f',
    modelStr: 'minitool/gpt-5',
    badge: 'GPT-5',
    badgeColor: 'violet',
    icon: 'Brain',
    iconColor: '#8b5cf6',
    description: 'GPT-5 via MiniToolAI'
  },
  {
    id: 'minitool-gpt-5-mini',
    label: 'GPT-5 Mini (MiniTool)',
    engine: 'g4f',
    modelStr: 'minitool/gpt-5-mini',
    badge: 'MINI',
    badgeColor: 'violet',
    icon: 'Sparkles',
    iconColor: '#8b5cf6',
    description: 'GPT-5 Mini via MiniToolAI'
  },
  {
    id: 'minitool-gpt-3.5-turbo',
    label: 'GPT-3.5 Turbo (MiniTool)',
    engine: 'g4f',
    modelStr: 'minitool/gpt-3.5-turbo',
    badge: 'TURBO',
    badgeColor: 'green',
    icon: 'Zap',
    iconColor: '#10b981',
    description: 'GPT-3.5 Turbo via MiniToolAI'
  },
  {
    id: 'minitool-claude-haiku-4.5',
    label: 'Claude Haiku 4.5 (MiniTool)',
    engine: 'g4f',
    modelStr: 'minitool/claude-haiku-4.5',
    badge: 'HAIKU',
    badgeColor: 'amber',
    icon: 'Zap',
    iconColor: '#d97706',
    description: 'Claude Haiku 4.5 via MiniToolAI Worker'
  },
  {
    id: 'minitool-claude-sonnet-5',
    label: 'Claude Sonnet 5 (MiniTool)',
    engine: 'g4f',
    modelStr: 'minitool/claude-sonnet-5',
    badge: 'SONNET',
    badgeColor: 'orange',
    icon: 'Brain',
    iconColor: '#f97316',
    description: 'Claude Sonnet 5 via MiniToolAI Worker'
  },
  {
    id: 'minitool-claude-opus-4.8',
    label: 'Claude Opus 4.8 (MiniTool)',
    engine: 'g4f',
    modelStr: 'minitool/claude-opus-4.8',
    badge: 'OPUS',
    badgeColor: 'purple',
    icon: 'Sparkles',
    iconColor: '#a855f7',
    description: 'Claude Opus 4.8 via MiniToolAI Worker'
  },
  // ════════════════════════════════════════════════════════════════
  // 🟣 OVERCHAT.AI (via Cloudflare Worker — No Auth Needed)
  // ════════════════════════════════════════════════════════════════
  {
    id: 'overchat-gpt-5.2',
    label: 'GPT-5.2 (OverChat)',
    engine: 'g4f',
    modelStr: 'overchat/gpt-5.2',
    badge: 'GPT-5.2',
    badgeColor: 'green',
    icon: 'Brain',
    iconColor: '#10b981',
    description: 'GPT-5.2 via OverChat.ai — Free, No Auth'
  },
  {
    id: 'overchat-gpt-4o',
    label: 'GPT-4o (OverChat)',
    engine: 'g4f',
    modelStr: 'overchat/gpt-4o',
    badge: '4o',
    badgeColor: 'blue',
    icon: 'Zap',
    iconColor: '#3b82f6',
    description: 'GPT-4o via OverChat.ai — Free, No Auth'
  },
  {
    id: 'overchat-claude-opus-4.6',
    label: 'Claude Opus 4.6 (OverChat)',
    engine: 'g4f',
    modelStr: 'overchat/claude-opus-4.6',
    badge: 'OPUS',
    badgeColor: 'violet',
    icon: 'Sparkles',
    iconColor: '#a855f7',
    description: 'Claude Opus 4.6 via OverChat.ai — Free, No Auth'
  },
  {
    id: 'overchat-claude-haiku-4.5',
    label: 'Claude Haiku 4.5 (OverChat)',
    engine: 'g4f',
    modelStr: 'overchat/claude-haiku-4.5',
    badge: 'HAIKU',
    badgeColor: 'cyan',
    icon: 'Zap',
    iconColor: '#06b6d4',
    description: 'Claude Haiku 4.5 via OverChat.ai — Free, No Auth'
  },
  {
    id: 'overchat-qwen-3',
    label: 'Qwen 3 (OverChat)',
    engine: 'g4f',
    modelStr: 'overchat/qwen-3',
    badge: 'QWEN',
    badgeColor: 'orange',
    icon: 'Brain',
    iconColor: '#f97316',
    description: 'Qwen 3 via OverChat.ai — Free, No Auth'
  },

  // ════════════════════════════════════════════════════════════════
  // 🟢 SURFSENSE
  // ════════════════════════════════════════════════════════════════
  {
    id: 'surfsense-gpt5.4-mini',
    label: 'GPT-5.4 Mini (SurfSense)',
    engine: 'custom',
    modelStr: 'surfsense/gpt-5.4-mini-no-login',
    badge: 'MINI',
    badgeColor: 'teal',
    icon: 'Sparkles',
    iconColor: '#14b8a6',
    description: 'Surfsense Anonymous Chat API'
  },

  {
    id: 'surfsense-gpt-5.4',
    label: 'GPT 5.4 (SurfSense)',
    engine: 'custom',
    modelStr: 'gpt-5.4',
    badge: 'GPT-5.4',
    badgeColor: 'green',
    icon: 'Sparkles',
    iconColor: '#10b981',
    description: 'GPT 5.4 via SurfSense'
  },

  // ════════════════════════════════════════════════════════════════
  // 🟢 PERPLEXITY
  // ════════════════════════════════════════════════════════════════
  {
    id: 'perplexity-copilot',
    label: 'Perplexity Copilot',
    engine: 'custom',
    modelStr: 'perplexity-direct/copilot',
    badge: 'COPILOT',
    badgeColor: 'cyan',
    icon: 'Sparkles',
    iconColor: '#06b6d4',
    description: 'Perplexity Copilot via direct Cloudflare worker'
  },


  // ════════════════════════════════════════════════════════════════
  // 🟢 META AI
  // ════════════════════════════════════════════════════════════════
  {
    id: 'meta-ai-muse',
    label: 'Meta AI (Muse Spark)',
    engine: 'custom',
    modelStr: 'meta-ai/muse-spark',
    badge: 'META',
    badgeColor: 'blue',
    icon: 'Sparkles',
    iconColor: '#3b82f6',
    description: 'Native reverse-engineered Meta AI client'
  },
  {
    id: 'baidu-ernie-5.1',
    label: 'Baidu Ernie 5.1',
    engine: 'custom',
    modelStr: 'ernie/ERINE-5.1',
    badge: 'BAIDU',
    badgeColor: 'red',
    icon: 'Brain',
    iconColor: '#ef4444',
    description: 'Baidu ERNIE-5.1 unauthenticated SSE proxy'
  },


  // ════════════════════════════════════════════════════════════════
  // 🔵 GEMINI MODELS
  // ════════════════════════════════════════════════════════════════


  {
    id: 'g4f-gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    engine: 'g4f',
    modelStr: 'g4f/models/gemini-2.5-flash',
    badge: 'FREE',
    badgeColor: 'violet',
    icon: 'Zap',
    iconColor: '#8b5cf6',
    description: 'Gemini 2.5 Flash via G4F — 220 req, 1768ms'
  },
  {
    id: 'g4f-gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash Lite',
    engine: 'g4f',
    modelStr: 'g4f/gemini-2.5-flash-lite',
    badge: 'LITE',
    badgeColor: 'cyan',
    icon: 'Zap',
    iconColor: '#06b6d4',
    description: 'Gemini 2.5 Flash Lite via G4F'
  },

  {
    id: 'g4f-gemini-3-flash-preview',
    label: 'Gemini 3 Flash Preview',
    engine: 'g4f',
    modelStr: 'g4f/models/gemini-3-flash-preview',
    badge: 'PREVIEW',
    badgeColor: 'violet',
    icon: 'Sparkles',
    iconColor: '#8b5cf6',
    description: 'Gemini 3 Flash Preview via G4F'
  },
  {
    id: 'g4f-gemini-3.1-flash-lite',
    label: 'Gemini 3.1 Flash Lite',
    engine: 'g4f',
    modelStr: 'g4f/models/gemini-3.1-flash-lite',
    badge: 'LITE',
    badgeColor: 'cyan',
    icon: 'Zap',
    iconColor: '#06b6d4',
    description: 'Gemini 3.1 Flash Lite via G4F — 27 req'
  },
  {
    id: 'g4f-gemini-3.1-flash-lite-preview',
    label: 'Gemini 3.1 Flash Lite Preview',
    engine: 'g4f',
    modelStr: 'g4f/gemini-3.1-flash-lite-preview',
    badge: 'PREVIEW',
    badgeColor: 'cyan',
    icon: 'Sparkles',
    iconColor: '#06b6d4',
    description: 'Gemini 3.1 Flash Lite Preview via G4F'
  },
  {
    id: 'g4f-gemini-3.5-flash',
    label: 'Gemini 3.5 Flash',
    engine: 'g4f',
    modelStr: 'g4f/models/gemini-3.5-flash',
    badge: 'FREE',
    badgeColor: 'violet',
    icon: 'Zap',
    iconColor: '#8b5cf6',
    description: 'Gemini 3.5 Flash via G4F — 44 req'
  },
  {
    id: 'g4f-gemini-flash-latest',
    label: 'Gemini Flash Latest',
    engine: 'g4f',
    modelStr: 'g4f/models/gemini-flash-latest',
    badge: 'LATEST',
    badgeColor: 'violet',
    icon: 'Zap',
    iconColor: '#8b5cf6',
    description: 'Gemini Flash Latest via G4F — 52 req'
  },
  {
    id: 'g4f-gemini-flash-lite-latest',
    label: 'Gemini Flash Lite Latest',
    engine: 'g4f',
    modelStr: 'g4f/models/gemini-flash-lite-latest',
    badge: 'LITE',
    badgeColor: 'cyan',
    icon: 'Zap',
    iconColor: '#06b6d4',
    description: 'Gemini Flash Lite Latest via G4F — 16 req'
  },

  {
    id: 'g4f-gemma-4-31b',
    label: 'Gemma 4 31B',
    engine: 'g4f',
    modelStr: 'g4f/models/gemma-4-31b-it',
    badge: '31B',
    badgeColor: 'blue',
    icon: 'Brain',
    iconColor: '#3b82f6',
    description: 'Google Gemma 4 31B Instruct via G4F'
  },
  {
    id: 'g4f-gemma3-12b',
    label: 'Gemma 3 12B',
    engine: 'g4f',
    modelStr: 'g4f/gemma3:12b',
    badge: '12B',
    badgeColor: 'blue',
    icon: 'Zap',
    iconColor: '#3b82f6',
    description: 'Google Gemma 3 12B via Ollama — 1271ms'
  },

  {
    id: 'g4f-gemma4-31b',
    label: 'Gemma 4 31B (Ollama)',
    engine: 'g4f',
    modelStr: 'g4f/gemma4:31b',
    badge: '31B',
    badgeColor: 'blue',
    icon: 'Brain',
    iconColor: '#3b82f6',
    description: 'Google Gemma 4 31B via Ollama — 116 req'
  },
  {
    id: 'g4f-models-gemini-2-5-flash-lite',
    label: 'models/gemini-2.5-flash-lite',
    engine: 'g4f',
    modelStr: 'g4f/models/gemini-2.5-flash-lite',
    provider: 'gemini-v1beta',
    badge: 'NEW',
    badgeColor: 'cyan',
    icon: 'Sparkles',
    iconColor: '#06b6d4',
    description: 'models/gemini-2.5-flash-lite via G4F Proxy'
  },
  {
    id: 'g4f-models-gemini-3-1-flash-lite-preview',
    label: 'models/gemini-3.1-flash-lite-preview',
    engine: 'g4f',
    modelStr: 'g4f/models/gemini-3.1-flash-lite-preview',
    provider: 'gemini-v1beta',
    badge: 'NEW',
    badgeColor: 'cyan',
    icon: 'Sparkles',
    iconColor: '#06b6d4',
    description: 'models/gemini-3.1-flash-lite-preview via G4F Proxy'
  },


  // ════════════════════════════════════════════════════════════════
  // 🧠 DEEPSEEK MODELS
  // ════════════════════════════════════════════════════════════════


  {
    id: 'g4f-deepseek-v4-flash-ktai',
    label: 'DeepSeek V4 Flash',
    engine: 'g4f',
    modelStr: 'g4f/deepseek-ai/deepseek-v4-flash',
    badge: 'FLASH',
    badgeColor: 'green',
    icon: 'Zap',
    iconColor: '#10b981',
    description: 'DeepSeek V4 Flash — 60 req, 3458ms'
  },

  {
    id: 'g4f-deepseek-v4-flash-thinking',
    label: 'DeepSeek V4 Flash Thinking',
    engine: 'g4f',
    modelStr: 'g4f/deepseek-v4-flash-thinking',
    badge: 'THINK',
    badgeColor: 'blue',
    icon: 'Brain',
    iconColor: '#3b82f6',
    description: 'DeepSeek V4 Flash Thinking — 26 req, 7864ms'
  },
  {
    id: 'g4f-deepseek-v4-pro',
    label: 'DeepSeek V4 Pro',
    engine: 'g4f',
    modelStr: 'g4f/deepseek-v4-pro',
    badge: 'PRO',
    badgeColor: 'blue',
    icon: 'Brain',
    iconColor: '#3b82f6',
    description: 'DeepSeek V4 Pro — 552 req, 1369ms'
  },

  // ════════════════════════════════════════════════════════════════
  // 💻 QWEN MODELS
  // ════════════════════════════════════════════════════════════════


  {
    id: 'g4f-qwen3.7-max',
    label: 'Qwen 3.7 Max',
    engine: 'g4f',
    modelStr: 'g4f/qwen3.7-max',
    badge: 'MAX',
    badgeColor: 'violet',
    icon: 'Brain',
    iconColor: '#8b5cf6',
    description: 'Qwen 3.7 Max via G4F — 10 req, 6674ms'
  },
  {
    id: 'qw-qwen3.7-max',
    label: 'Qwen 3.7 Max (Worker)',
    engine: 'g4f',
    modelStr: 'qwen_worker/qwen3.7-max',
    badge: 'MAX',
    badgeColor: 'violet',
    icon: 'Brain',
    iconColor: '#8b5cf6',
    description: 'Alibaba Qwen 3.7 Max — dedicated worker'
  },
  {
    id: 'qw-qwen3.7-plus',
    label: 'Qwen 3.7 Plus (Worker)',
    engine: 'g4f',
    modelStr: 'qwen_worker/qwen3.7-plus',
    badge: 'PLUS',
    badgeColor: 'violet',
    icon: 'Zap',
    iconColor: '#8b5cf6',
    description: 'Alibaba Qwen 3.7 Plus — dedicated worker'
  },



];


// Clear saved model on page load/refresh so it always defaults to OpenAI Fast
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
  return AI_MODELS.find(m => m.id === 'surfsense-gpt5.4-mini') || AI_MODELS[0];
};

export const setSelectedModel = (id: string) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('inixa_ai_model', id);
    } catch (e) { }
  }
};

// ΓöÇΓöÇΓöÇ Image Generation (Pollinations ΓÇö Free, no key) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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

// ΓöÇΓöÇΓöÇ Cloudflare Worker URL ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
export const CF_WORKER_URL = 'https://divine-leaf-d1cf.antigravity4531.workers.dev';

// ΓöÇΓöÇΓöÇ Direct Pollinations API (OpenAI-compatible) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// text.pollinations.ai/openai ΓÇö free, no key, CORS-enabled
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
    return `ΓÜá∩╕Å Pollinations error: ${data.error || 'Empty response'}`;
  } catch (e) {
    console.error('[Pollinations] Fetch error:', e);
    return 'ΓÜá∩╕Å Failed to reach Pollinations CF Worker. Check your connection.';
  }
}

// ΓöÇΓöÇΓöÇ Direct DDG via CF Worker ΓåÆ Pollinations fallback ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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

// ΓöÇΓöÇΓöÇ Helper: Handle SSE Streaming ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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
          const reasoning = parsed.choices?.[0]?.delta?.reasoning_content || parsed.choices?.[0]?.delta?.reasoning || '';

          if (reasoning) {
            if (!fullReply.includes('<think>')) {
              fullReply += '<think>\n';
            }
            fullReply += reasoning;
            changed = true;
          }

          if (content) {
            if (fullReply.includes('<think>') && !fullReply.includes('</think>')) {
              fullReply += '\n</think>\n';
            }
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

// ΓöÇΓöÇΓöÇ Provider Rate Limit Cache Helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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
    const TWO_MINUTES = 2 * 60 * 1000;

    if (Date.now() - timestamp < TWO_MINUTES) {
      return true; // Limit is active
    } else {
      localStorage.removeItem(`inixa_rate_limit_${provider}`); // Expired
      return false;
    }
  } catch (e) {
    return false;
  }
}

// ΓöÇΓöÇΓöÇ Main Chat Engine ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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

    const API_BASE = ''; // Always use relative URLs to prevent CORS issues on Vercel

    // Route based on engine type
    let endpointPath: string;
    let fetchUrl: string;

    if (model.engine === 'direct') {
      // Direct models go through our INIXA AI Gateway CF Worker
      // This hits Pollinations/DDG directly - no G4F, no proxies!
      fetchUrl = `${CF_WORKER_URL}/v1/chat/completions`;
      console.log(`[aiChat] Direct routing via CF Worker: ${fetchUrl}`);
    } else if (model.engine === 'g4f') {
      // ΓöÇΓöÇ Client-Side Direct Fetch Attempt (User IP) ΓöÇΓöÇ
      let directEndpoint = '';
      let directModelStr = '';

      let provider = 'g4f';
      if (modelStr.startsWith('deepinfra/')) {
        directModelStr = modelStr.replace('deepinfra/', '');
        directEndpoint = 'https://api.deepinfra.com/v1/openai/chat/completions';
        provider = 'deepinfra';
      } else if (modelStr.startsWith('qwen_worker/')) {
        directModelStr = modelStr.replace('qwen_worker/', '');
        directEndpoint = 'https://ultimate-ai-worker.haruyhari930.workers.dev/v1/chat/completions';
        provider = 'qwen_worker';
      } else if (modelStr.startsWith('minitool/')) {
        directModelStr = modelStr;
        directEndpoint = 'https://ultimate-ai-worker.haruyhari930.workers.dev/v1/chat/completions';
        provider = 'minitool';
      } else if (modelStr.startsWith('updf')) {
        directEndpoint = 'https://ultimate-ai-worker.haruyhari930.workers.dev/v1/chat/completions';
        provider = 'updf';
      } else if (modelStr.startsWith('overchat/')) {
        directModelStr = modelStr;
        directEndpoint = 'https://ultimate-ai-worker.haruyhari930.workers.dev/v1/chat/completions';
        provider = 'overchat';
      } else if (modelStr.startsWith('g4f/')) {
        directModelStr = modelStr.replace('g4f/', '');
        directEndpoint = 'https://g4f.space/v1/chat/completions';
        provider = 'g4f';
      } else {
        directModelStr = modelStr.replace('g4f/', '');
        directEndpoint = 'https://g4f.space/v1/chat/completions';
        provider = 'g4f';
      }

      if (checkProviderLimit(provider)) {
        console.log(`[Frontend Fetch] User IP rate limited for ${provider}. Skipping direct fetch for 2 minutes.`);
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
              stream: !!onChunk,
              max_tokens: 8192
            })
          });

          if (directRes.ok) {
            console.log(`[Frontend Fetch] Success from User IP!`);
            if (onChunk && directRes.body) {
              const resText = await handleSSEStream(directRes, onChunk);
              if (resText && resText !== 'No response received from the AI model.') {
                return resText;
              }
              console.warn(`[Frontend Fetch] Direct endpoint returned empty stream (0 bytes). Falling back to Backend Proxy Pool...`);
            } else {
              const data = await directRes.json();
              const content = data.choices?.[0]?.message?.content || data.reply || '';
              const reasoning = data.choices?.[0]?.message?.reasoning_content || data.choices?.[0]?.message?.reasoning || '';
              let reply = content;
              if (reasoning) {
                reply = `<think>\n${reasoning}\n</think>\n${content}`;
              }
              if (reply) return reply;
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

      endpointPath = '/api/chat/g4f';
      fetchUrl = `${API_BASE}${endpointPath}`;
    } else {
      endpointPath = '/api/chat/completions';
      fetchUrl = `${API_BASE}${endpointPath}`;
    }

    // ── Client-Side 3-Attempt Silent Retry Loop ──
    let lastResult = '';
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[aiChat Client] Attempt ${attempt}/3 hitting ${fetchUrl} for ${modelStr}...`);
        const res = await fetch(fetchUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messages: conversationHistory,
            model: modelStr,
            provider: model.provider,
            stream: !!onChunk
          })
        });

        if (res.ok) {
          if (onChunk && res.body) {
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
              const data = await res.json();
              const content = data.choices?.[0]?.message?.content || data.reply || '';
              const reasoning = data.choices?.[0]?.message?.reasoning_content || data.choices?.[0]?.message?.reasoning || '';
              let reply = content;
              if (reasoning) reply = `<think>\n${reasoning}\n</think>\n${content}`;
              if (reply) {
                onChunk(reply);
                return reply;
              }
            } else {
              const sseReply = await handleSSEStream(res, onChunk);
              if (sseReply && sseReply !== 'No response received from the AI model.') {
                return sseReply;
              }
            }
          } else {
            const data = await res.json();
            const content = data.choices?.[0]?.message?.content || data.reply || '';
            const reasoning = data.choices?.[0]?.message?.reasoning_content || data.choices?.[0]?.message?.reasoning || '';
            let reply = content;
            if (reasoning) reply = `<think>\n${reasoning}\n</think>\n${content}`;
            if (reply) return reply;
          }
        }
      } catch (err) {
        console.warn(`[aiChat Client] Attempt ${attempt}/3 network error:`, err);
      }
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 400 * attempt));
      }
    }

    return 'No response received from the AI model.';
  } catch (e) {
    console.error('Chat API Error', e);
    return 'Γ¥î Connection failed. Please try a different model or check your connection.';
  }
};

// ΓöÇΓöÇΓöÇ Web Search & Scrape ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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
    const bodyData = { url };
    const secureHeaders = await createSignedHeaders(bodyData);
    secureHeaders['Content-Type'] = 'application/json';

    const res = await fetch(`/api/web-scrape`, {
      method: 'POST',
      headers: secureHeaders,
      body: JSON.stringify(bodyData)
    });
    const data = await res.json();
    if (data.ok && data.text) return data.text;
  } catch (e) {
    console.error('Web Scrape Error:', e);
  }
  return '';
};
