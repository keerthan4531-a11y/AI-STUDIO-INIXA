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
  // ── Direct Provider Models (via INIXA AI Gateway CF Worker) ──
  // These hit Pollinations.ai and DuckDuckGo DIRECTLY — no G4F, no proxies needed!


  {
    id: 'unlimited-pollinations',
    label: 'Pollinations Auto (Unlimited)',
    engine: 'unlimited',
    modelStr: 'unlimited/openai',
    badge: 'UNLIMITED',
    badgeColor: 'blue',
    icon: 'Zap',
    iconColor: '#3b82f6',
    description: 'Free unlimited auto-routed models'
  },

  {
    id: 'g4f-gpt-5.5',
    label: 'GPT-5.5',
    engine: 'g4f',
    modelStr: 'g4f/gpt-5.5',
    badge: 'NEW',
    badgeColor: 'purple',
    icon: 'Sparkles',
    iconColor: '#a855f7',
    description: 'Extremely fast and highly intelligent reasoning model'
  },

  // ── gvorse Community Server Models (via g4f.space) ──
  // Server: srv_mqrlxup3fd91a47d98e6 — gvorse 🎨🎧🟢 (discord.gg/yJZQzntaGB)
  // These models are proxied through the gvorse community server on g4f.space
  {
    id: 'gvorse-gpt-5.4',
    label: 'GPT-5.4 (gvorse)',
    engine: 'g4f',
    modelStr: 'g4f/srv_mqrlxup3fd91a47d98e6:gpt-5.4',
    badge: 'GPT-5.4',
    badgeColor: 'purple',
    icon: 'Sparkles',
    iconColor: '#a855f7',
    description: 'OpenAI GPT-5.4 via gvorse community server'
  },
  {
    id: 'gvorse-claude-opus-4.1',
    label: 'Claude Opus 4.1 (gvorse)',
    engine: 'g4f',
    modelStr: 'g4f/srv_mqrlxup3fd91a47d98e6:anthropic/claude-opus-4.1',
    badge: 'OPUS',
    badgeColor: 'orange',
    icon: 'Brain',
    iconColor: '#f97316',
    description: 'Anthropic Claude Opus 4.1 via gvorse community server'
  },
  {
    id: 'gvorse-gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash Lite (gvorse)',
    engine: 'g4f',
    modelStr: 'g4f/srv_mqrlxup3fd91a47d98e6:google/gemini-2.5-flash-lite',
    badge: 'LITE',
    badgeColor: 'cyan',
    icon: 'Zap',
    iconColor: '#06b6d4',
    description: 'Google Gemini 2.5 Flash Lite via gvorse community server'
  },
  {
    id: 'gvorse-gpt-5',
    label: 'GPT-5 (gvorse)',
    engine: 'g4f',
    modelStr: 'g4f/srv_mqrlxup3fd91a47d98e6:openai/gpt-5',
    badge: 'GPT-5',
    badgeColor: 'red',
    icon: 'Sparkles',
    iconColor: '#ef4444',
    description: 'OpenAI GPT-5 via gvorse community server'
  },
  {
    id: 'gvorse-gpt-5-nano',
    label: 'GPT-5 Nano (gvorse)',
    engine: 'g4f',
    modelStr: 'g4f/srv_mqrlxup3fd91a47d98e6:openai/gpt-5-nano',
    badge: 'NANO',
    badgeColor: 'green',
    icon: 'Zap',
    iconColor: '#10b981',
    description: 'OpenAI GPT-5 Nano (lightweight) via gvorse community server'
  },
  {
    id: 'gvorse-qwen-3.7-plus',
    label: 'Qwen 3.7 Plus (gvorse)',
    engine: 'g4f',
    modelStr: 'g4f/srv_mqrlxup3fd91a47d98e6:qwen3.7-plus',
    badge: 'QWEN',
    badgeColor: 'blue',
    icon: 'Brain',
    iconColor: '#3b82f6',
    description: 'Alibaba Qwen 3.7 Plus via gvorse community server'
  },
  {
    id: 'gvorse-deepseek-v3.2',
    label: 'DeepSeek V3.2 (gvorse)',
    engine: 'g4f',
    modelStr: 'g4f/srv_mqrlxup3fd91a47d98e6:deepseek/deepseek-v3.2',
    badge: 'DEEP',
    badgeColor: 'blue',
    icon: 'Brain',
    iconColor: '#3b82f6',
    description: 'DeepSeek V3.2 via gvorse community server'
  },

  {
    id: 'g4f-claude-fast',
    label: 'Claude Fast',
    engine: 'g4f',
    modelStr: 'g4f/claude-fast',
    badge: 'ULTRAFAST',
    badgeColor: 'orange',
    icon: 'Zap',
    iconColor: '#f97316',
    description: 'Blazing fast Claude 3.5 Sonnet proxy'
  },
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

  // ── Chinese Reverse Proxy Models (Keyless & Local) ──
  {
    id: 'qwen-free-max',
    label: 'Qwen 3.7 Max',
    engine: 'qwen-free',
    modelStr: 'qwen-free/qwen-max',
    badge: 'CHINESE',
    badgeColor: 'cyan',
    icon: 'Brain',
    iconColor: '#06b6d4',
    description: 'Qwen 3.7 Max via qwen-free-api'
  },
  {
    id: 'qwen-free-plus',
    label: 'Qwen 3.7 Plus',
    engine: 'qwen-free',
    modelStr: 'qwen-free/qwen-plus',
    badge: 'CHINESE',
    badgeColor: 'cyan',
    icon: 'Zap',
    iconColor: '#06b6d4',
    description: 'Qwen 3.7 Plus via qwen-free-api'
  },
  {
    id: 'kimi-free-k3',
    label: 'Kimi K3 (2026)',
    engine: 'kimi-free',
    modelStr: 'kimi-free/kimi-k3',
    badge: 'CHINESE',
    badgeColor: 'cyan',
    icon: 'Sparkles',
    iconColor: '#06b6d4',
    description: 'Kimi K3 via kimi-free-api (Long Context)'
  },
  {
    id: 'kimi-free-k2.6',
    label: 'Kimi K2.6',
    engine: 'kimi-free',
    modelStr: 'kimi-free/kimi-k2.6',
    badge: 'CHINESE',
    badgeColor: 'cyan',
    icon: 'Star',
    iconColor: '#06b6d4',
    description: 'Kimi K2.6 via kimi-free-api'
  },
  {
    id: 'glm-free-5',
    label: 'GLM 5 (2026)',
    engine: 'glm-free',
    modelStr: 'glm-free/glm-5',
    badge: 'CHINESE',
    badgeColor: 'cyan',
    icon: 'Brain',
    iconColor: '#06b6d4',
    description: 'GLM 5 via glm-free-api'
  },
  {
    id: 'glm-free-4-plus',
    label: 'GLM 4 Plus',
    engine: 'glm-free',
    modelStr: 'glm-free/glm-4-plus',
    badge: 'CHINESE',
    badgeColor: 'cyan',
    icon: 'Zap',
    iconColor: '#06b6d4',
    description: 'GLM 4 Plus via glm-free-api'
  },
  {
    id: 'step-free-2',
    label: 'Step 2 (2026)',
    engine: 'step-free',
    modelStr: 'step-free/step-2',
    badge: 'CHINESE',
    badgeColor: 'cyan',
    icon: 'Brain',
    iconColor: '#06b6d4',
    description: 'Step 2 via step-free-api'
  },
  {
    id: 'spark-free-4.5',
    label: 'Spark 4.5 Ultra',
    engine: 'spark-free',
    modelStr: 'spark-free/spark-desk-v4.5',
    badge: 'CHINESE',
    badgeColor: 'cyan',
    icon: 'Sparkles',
    iconColor: '#06b6d4',
    description: 'Spark 4.5 Ultra via spark-free-api'
  },
  {
    id: 'metaso-free-search',
    label: 'Metaso Search (2026)',
    engine: 'metaso-free',
    modelStr: 'metaso-free/metaso-search',
    badge: 'CHINESE',
    badgeColor: 'cyan',
    icon: 'Globe',
    iconColor: '#06b6d4',
    description: 'Metaso search model via metaso-free-api'
  },
  {
    id: 'parallel-chat-auto',
    label: 'ParallelChat Auto',
    engine: 'parallel-chat',
    modelStr: 'parallel-chat/auto',
    badge: 'AGGREGATOR',
    badgeColor: 'violet',
    icon: 'Boxes',
    iconColor: '#8b5cf6',
    description: 'Auto-routed Chinese models aggregator'
  },
  {
    id: 'coze-claude-3-5',
    label: 'Coze Claude 3.5',
    engine: 'coze-proxy',
    modelStr: 'coze/claude-3.5-sonnet',
    badge: 'COZE',
    badgeColor: 'gold',
    icon: 'Sparkles',
    iconColor: '#f97316',
    description: 'Claude 3.5 Sonnet via Coze reverse proxy'
  },
  {
    id: 'coze-gpt-4o',
    label: 'Coze GPT-4o',
    engine: 'coze-proxy',
    modelStr: 'coze/gpt-4o',
    badge: 'COZE',
    badgeColor: 'gold',
    icon: 'Star',
    iconColor: '#f97316',
    description: 'GPT-4o via Coze reverse proxy'
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
  
  // ── 2026 Keyless Massive Models (via G4F/Proxy Pool) ──
  {
    id: 'g4f-grok-4',
    label: 'Grok 4',
    engine: 'g4f',
    modelStr: 'g4f/grok-4',
    badge: 'NEW',
    badgeColor: 'orange',
    icon: 'Star',
    iconColor: '#f97316',
    description: 'x.ai Grok 4 (Keyless)'
  },
  {
    id: 'g4f-grok-4-1-mini',
    label: 'Grok 4.1 Mini',
    engine: 'g4f',
    modelStr: 'g4f/grok-4.1-mini:free',
    badge: 'FREE',
    badgeColor: 'green',
    icon: 'Zap',
    iconColor: '#10b981',
    description: 'x.ai Grok 4.1 Mini via api.airforce'
  },
  {
    id: 'g4f-grok-large',
    label: 'Grok Large',
    engine: 'g4f',
    modelStr: 'g4f/grok-large',
    badge: 'MASSIVE',
    badgeColor: 'violet',
    icon: 'Star',
    iconColor: '#f97316',
    description: 'x.ai Grok Large (Keyless)'
  },
  {
    id: 'g4f-gpt-5-5',
    label: 'GPT-5.5',
    engine: 'g4f',
    modelStr: 'g4f/gpt-5.5',
    badge: 'PREMIUM',
    badgeColor: 'orange',
    icon: 'Brain',
    iconColor: '#f97316',
    description: 'OpenAI GPT-5.5'
  },
  {
    id: 'g4f-gpt-5-4-nano',
    label: 'GPT-5.4 Nano',
    engine: 'g4f',
    modelStr: 'g4f/gpt-5.4-nano',
    badge: 'FAST',
    badgeColor: 'green',
    icon: 'Zap',
    iconColor: '#10b981',
    description: 'OpenAI GPT-5.4 Nano via Nectar'
  },
  {
    id: 'g4f-gpt-oss-120b',
    label: 'GPT-OSS 120B',
    engine: 'g4f',
    modelStr: 'g4f/gpt-oss-120b',
    badge: '120B',
    badgeColor: 'blue',
    icon: 'Brain',
    iconColor: '#3b82f6',
    description: 'OpenAI GPT Open Source 120B'
  },
  {
    id: 'g4f-turbo-direct',
    label: 'Perplexity Turbo',
    engine: 'g4f',
    modelStr: 'g4f/turbo',
    badge: 'FAST',
    badgeColor: 'green',
    icon: 'Zap',
    iconColor: '#10b981',
    description: 'Perplexity Turbo'
  },
  {
    id: 'g4f-gemini-3-1-pro',
    label: 'Gemini 3.1 Pro',
    engine: 'g4f',
    modelStr: 'g4f/gemini-3.1-pro-preview',
    badge: 'NEW',
    badgeColor: 'blue',
    icon: 'Sparkles',
    iconColor: '#3b82f6',
    description: 'Google Gemini 3.1 Pro'
  },
  {
    id: 'g4f-gemini-3-1-pro-search',
    label: 'Gemini 3.1 Pro (Search)',
    engine: 'g4f',
    modelStr: 'g4f/gemini-3.1-pro-preview:search',
    badge: 'WEB SEARCH',
    badgeColor: 'green',
    icon: 'Globe',
    iconColor: '#10b981',
    description: 'Google Gemini 3.1 Pro with real-time web search'
  },
  {
    id: 'g4f-gemini-2-5-flash',
    label: 'Gemini 2.5 Flash',
    engine: 'g4f',
    modelStr: 'g4f/gemini-2.5-flash-lite',
    badge: 'FAST',
    badgeColor: 'green',
    icon: 'Zap',
    iconColor: '#10b981',
    description: 'Google Gemini 2.5 Flash'
  },
  {
    id: 'g4f-mistral-large-675b',
    label: 'Mistral Large 675B',
    engine: 'g4f',
    modelStr: 'g4f/mistralai/mistral-large-3-675b-instruct-2512',
    badge: '675B',
    badgeColor: 'violet',
    icon: 'Brain',
    iconColor: '#8b5cf6',
    description: 'Mistral Large 3 675B'
  },
  {
    id: 'g4f-deepseek-v4-pro-direct',
    label: 'DeepSeek V4 Pro',
    engine: 'g4f',
    modelStr: 'g4f/deepseek-ai/deepseek-v4-pro',
    badge: 'PRO',
    badgeColor: 'orange',
    icon: 'Brain',
    iconColor: '#f97316',
    description: 'DeepSeek V4 Pro'
  },
  {
    id: 'g4f-deepseek-v3-2',
    label: 'DeepSeek V3.2',
    engine: 'g4f',
    modelStr: 'g4f/deepseek-v3.2',
    badge: 'V3.2',
    badgeColor: 'blue',
    icon: 'Brain',
    iconColor: '#3b82f6',
    description: 'DeepSeek V3.2'
  },
  {
    id: 'g4f-qwen-3-5-397b',
    label: 'Qwen 3.5 397B',
    engine: 'g4f',
    modelStr: 'g4f/qwen/qwen3.5-397b-a17b',
    badge: '397B',
    badgeColor: 'violet',
    icon: 'Brain',
    iconColor: '#8b5cf6',
    description: 'Alibaba Qwen 3.5 397B'
  },
  {
    id: 'g4f-qwen-3-7-max',
    label: 'Qwen 3.7 Max',
    engine: 'g4f',
    modelStr: 'g4f/qwen3.7-max',
    badge: 'MAX',
    badgeColor: 'violet',
    icon: 'Star',
    iconColor: '#8b5cf6',
    description: 'Alibaba Qwen 3.7 Max'
  },
  {
    id: 'g4f-qwen-3-next-80b',
    label: 'Qwen 3 Next 80B',
    engine: 'g4f',
    modelStr: 'g4f/qwen/qwen3-next-80b-a3b-instruct',
    badge: '80B',
    badgeColor: 'blue',
    icon: 'Brain',
    iconColor: '#3b82f6',
    description: 'Alibaba Qwen 3 Next 80B'
  },
  {
    id: 'g4f-llama-3-3-70b',
    label: 'Llama 3.3 70B',
    engine: 'g4f',
    modelStr: 'g4f/meta/llama-3.3-70b-instruct',
    badge: '70B',
    badgeColor: 'blue',
    icon: 'Brain',
    iconColor: '#3b82f6',
    description: 'Meta Llama 3.3 70B'
  },
  {
    id: 'g4f-llama-3-2-90b-vision',
    label: 'Llama 3.2 90B Vision',
    engine: 'g4f',
    modelStr: 'g4f/meta/llama-3.2-90b-vision-instruct',
    badge: 'VISION',
    badgeColor: 'green',
    icon: 'Image',
    iconColor: '#10b981',
    description: 'Meta Llama 3.2 90B Vision'
  },
  {
    id: 'g4f-nemotron-3-super-120b',
    label: 'Nemotron 3 Super 120B',
    engine: 'g4f',
    modelStr: 'g4f/nvidia/nemotron-3-super-120b-a12b',
    badge: '120B',
    badgeColor: 'violet',
    icon: 'Brain',
    iconColor: '#8b5cf6',
    description: 'Nvidia Nemotron 3 Super 120B'
  },
  {
    id: 'g4f-glm-5-1',
    label: 'GLM 5.1',
    engine: 'g4f',
    modelStr: 'g4f/z-ai/glm-5.1',
    badge: 'NEW',
    badgeColor: 'blue',
    icon: 'Sparkles',
    iconColor: '#3b82f6',
    description: 'Z-AI GLM 5.1'
  },
  {
    id: 'g4f-devstral-123b',
    label: 'Devstral 123B',
    engine: 'g4f',
    modelStr: 'g4f/devstral-2:123b',
    badge: '123B',
    badgeColor: 'violet',
    icon: 'Brain',
    iconColor: '#8b5cf6',
    description: 'Devstral 2 123B'
  },
  {
    id: 'g4f-kimi-k2-6',
    label: 'Kimi k2.6',
    engine: 'g4f',
    modelStr: 'g4f/moonshotai/kimi-k2.6',
    badge: 'LONG CTX',
    badgeColor: 'orange',
    icon: 'FileText',
    iconColor: '#f97316',
    description: 'Moonshot AI Kimi k2.6'
  },
  {
    id: 'g4f-minimax-m3',
    label: 'MiniMax M3',
    engine: 'g4f',
    modelStr: 'g4f/minimaxai/minimax-m3',
    badge: 'NEW',
    badgeColor: 'blue',
    icon: 'Brain',
    iconColor: '#3b82f6',
    description: 'MiniMax M3'
  },
  
  ];
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
