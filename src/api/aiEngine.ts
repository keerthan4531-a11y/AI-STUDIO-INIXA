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


  // ── Auto-Scraped Models (from free-llm-api-keys GitHub repo) ──
  // Only models with verified working keys are listed here
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
    modelStr: 'ddg/gpt-4o-mini', // Maps to 4o-mini internally
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
    modelStr: 'ddg/o3-mini', // Best match for a powerful model
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
    modelStr: 'ddg/llama', // Maps to Meta Llama
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
    modelStr: 'ddg/claude-3-haiku-20240307',
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
    modelStr: 'ddg/mixtral',
    badge: 'DDG',
    badgeColor: 'green',
    icon: 'Globe',
    iconColor: '#10b981',
    description: 'Mistral Small 4 via DuckDuckGo'
  },
];

// ─── Model Selection Helpers ───────────────────────────────────────
export const getSelectedModel = (): AIModel => {
  const savedId = localStorage.getItem('inixa_ai_model');
  return AI_MODELS.find(m => m.id === savedId) || AI_MODELS[0];
};

export const setSelectedModel = (id: string) => {
  localStorage.setItem('inixa_ai_model', id);
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
  onChunk?: (c: string) => void
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

// ─── Main Chat Engine ─────────────────────────────────────────────
// All requests go through our Next.js API route (/api/chat)
export const aiChat = async (
  messages: any[],
  onChunk?: (c: string) => void,
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
    console.log(`[aiChat] Model: ${model.label}, Engine: ${model.engine}, ModelStr: ${modelStr}`);

    const res = await fetch('/api/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: conversationHistory,
        model: modelStr,
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
        if (errorData.error) return `⚠️ ${errorData.error}`;
      } catch {}
      return `❌ Error: Server returned ${res.status}. Please check if 9router is running and providers are configured.`;
    }

    if (onChunk && res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullReply = '';
      let buffer = '';
      
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
          onChunk(fullReply);
        }
      }
      return fullReply || 'No response received. Make sure 9router is running.';
    }

    const data = await res.json();
    const reply = data.reply || '';
    return reply || 'No response received. Make sure 9router is running.';
  } catch (e) {
    console.error('Chat API Error', e);
    return '❌ Connection failed. Please try a different model or check your connection.';
  }
};

// ─── Web Search (Mock) ─────────────────────────────────────────────
export const aiWebSearch = async (query: string): Promise<any[]> => {
  return []; // Mock for now
};
