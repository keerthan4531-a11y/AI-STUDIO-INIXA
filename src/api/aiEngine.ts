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
  // ⚡ AUTO / UNLIMITED MODELS
  // ════════════════════════════════════════════════════════════════
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

  // ════════════════════════════════════════════════════════════════
  // 🟢 GPT MODELS
  // ════════════════════════════════════════════════════════════════
  {
    id: 'g4f-openai-fast',
    label: 'OpenAI Fast (GPT-5 Nano)',
    engine: 'g4f',
    modelStr: 'g4f/openai-fast',
    badge: 'TOP #1',
    badgeColor: 'green',
    icon: 'Zap',
    iconColor: '#10b981',
    description: 'Fastest free model — 2230+ requests, 857ms avg'
  },
  {
    id: 'g4f-gpt-5.5',
    label: 'GPT-5.5',
    engine: 'g4f',
    modelStr: 'g4f/gpt-5.5',
    badge: 'PREMIUM',
    badgeColor: 'purple',
    icon: 'Sparkles',
    iconColor: '#a855f7',
    description: 'OpenAI GPT-5.5 — extremely intelligent'
  },
  {
    id: 'g4f-gpt-5.4',
    label: 'GPT-5.4',
    engine: 'g4f',
    modelStr: 'g4f/srv_mqrlxup3fd91a47d98e6:gpt-5.4',
    badge: 'GPT',
    badgeColor: 'purple',
    icon: 'Sparkles',
    iconColor: '#a855f7',
    description: 'OpenAI GPT-5.4 via gvorse community'
  },
  {
    id: 'g4f-gpt-5.1',
    label: 'GPT-5.1',
    engine: 'g4f',
    modelStr: 'g4f/srv_mqrlxup3fd91a47d98e6:gpt-5.1',
    badge: 'GPT',
    badgeColor: 'purple',
    icon: 'Brain',
    iconColor: '#a855f7',
    description: 'OpenAI GPT-5.1 via gvorse community'
  },
  {
    id: 'g4f-gpt-oss-120b',
    label: 'GPT-OSS 120B',
    engine: 'g4f',
    modelStr: 'g4f/gpt-oss-120b',
    badge: '120B',
    badgeColor: 'red',
    icon: 'Brain',
    iconColor: '#ef4444',
    description: 'GPT Open Source 120B — Cerebras (1129 req, fast)'
  },
  {
    id: 'g4f-gpt-oss-120b-groq',
    label: 'GPT-OSS 120B (Groq)',
    engine: 'g4f',
    modelStr: 'g4f/openai/gpt-oss-120b',
    badge: 'GROQ',
    badgeColor: 'orange',
    icon: 'Zap',
    iconColor: '#f97316',
    description: 'GPT-OSS 120B via Groq — ultra fast 722ms'
  },
  {
    id: 'g4f-gpt-oss-120b-nvidia',
    label: 'GPT-OSS 120B (Nvidia)',
    engine: 'g4f',
    modelStr: 'g4f/openai/gpt-oss-120b',
    provider: 'nvidia',
    badge: 'NVIDIA',
    badgeColor: 'green',
    icon: 'Brain',
    iconColor: '#10b981',
    description: 'GPT-OSS 120B via Nvidia — 921ms'
  },
  {
    id: 'g4f-gpt-oss-20b-free',
    label: 'GPT-OSS 20B Free',
    engine: 'g4f',
    modelStr: 'g4f/openai/gpt-oss-20b:free',
    badge: 'FREE',
    badgeColor: 'green',
    icon: 'Zap',
    iconColor: '#10b981',
    description: 'GPT-OSS 20B Free via OpenRouter'
  },
  {
    id: 'g4f-gpt-oss-20b-groq',
    label: 'GPT-OSS 20B (Groq)',
    engine: 'g4f',
    modelStr: 'g4f/openai/gpt-oss-20b',
    badge: 'GROQ',
    badgeColor: 'orange',
    icon: 'Zap',
    iconColor: '#f97316',
    description: 'GPT-OSS 20B via Groq — 561ms'
  },
  {
    id: 'g4f-gpt-4o-mini',
    label: 'GPT-4o mini',
    engine: 'g4f',
    modelStr: 'g4f/gpt-4o-mini',
    badge: 'MINI',
    badgeColor: 'green',
    icon: 'Zap',
    iconColor: '#10b981',
    description: 'GPT-4o mini via api.airforce — 1310ms'
  },
  {
    id: 'g4f-openai',
    label: 'OpenAI',
    engine: 'g4f',
    modelStr: 'g4f/openai',
    badge: 'GPT',
    badgeColor: 'green',
    icon: 'Brain',
    iconColor: '#10b981',
    description: 'OpenAI default model via Nectar — 741 req'
  },
  {
    id: 'g4f-openai-large',
    label: 'OpenAI Large',
    engine: 'g4f',
    modelStr: 'g4f/openai-large',
    badge: 'LARGE',
    badgeColor: 'blue',
    icon: 'Brain',
    iconColor: '#3b82f6',
    description: 'OpenAI Large model via Nectar'
  },
  {
    id: 'g4f-openrouter-free',
    label: 'OpenRouter Free',
    engine: 'g4f',
    modelStr: 'g4f/openrouter/free',
    badge: 'FREE',
    badgeColor: 'green',
    icon: 'Globe',
    iconColor: '#10b981',
    description: 'Auto-routed free model via OpenRouter — 809 req'
  },
  {
    id: 'g4f-gpt-oss-120b-ollama',
    label: 'GPT-OSS 120B (Ollama)',
    engine: 'g4f',
    modelStr: 'g4f/gpt-oss:120b',
    badge: '120B',
    badgeColor: 'blue',
    icon: 'Brain',
    iconColor: '#3b82f6',
    description: 'GPT-OSS 120B via Ollama'
  },
  {
    id: 'g4f-unmoderated-gpt',
    label: 'Unmoderated GPT',
    engine: 'g4f',
    modelStr: 'g4f/unmoderated-gpt',
    badge: 'UNCENSORED',
    badgeColor: 'orange',
    icon: 'Unlock',
    iconColor: '#f97316',
    description: 'Unmoderated GPT — no content filters'
  },
  {
    id: 'g4f-gpt-5.5-nectar',
    label: 'GPT-5.5 (Nectar)',
    engine: 'g4f',
    modelStr: 'g4f/gpt-5.5',
    provider: 'nectar',
    badge: 'ALT',
    badgeColor: 'cyan',
    icon: 'Sparkles',
    iconColor: '#06b6d4',
    description: 'GPT-5.5 via Nectar — 602ms'
  },
  {
    id: 'g4f-openai-gen',
    label: 'OpenAI (Pollinations)',
    engine: 'g4f',
    modelStr: 'g4f/openai',
    provider: 'pollinations',
    badge: 'ALT',
    badgeColor: 'cyan',
    icon: 'Brain',
    iconColor: '#06b6d4',
    description: 'OpenAI via gen.pollinations — 552ms'
  },

  // ════════════════════════════════════════════════════════════════
  // 🟠 CLAUDE MODELS
  // ════════════════════════════════════════════════════════════════
  {
    id: 'g4f-claude-opus-4.1',
    label: 'Claude Opus 4.1',
    engine: 'g4f',
    modelStr: 'g4f/srv_mqrlxup3fd91a47d98e6:anthropic/claude-opus-4.1',
    badge: 'OPUS',
    badgeColor: 'orange',
    icon: 'Brain',
    iconColor: '#f97316',
    description: 'Anthropic Claude Opus 4.1 via gvorse — 7220ms'
  },
  {
    id: 'g4f-claude-fast',
    label: 'Claude Fast',
    engine: 'g4f',
    modelStr: 'g4f/claude-fast',
    badge: 'FAST',
    badgeColor: 'orange',
    icon: 'Zap',
    iconColor: '#f97316',
    description: 'Blazing fast Claude 3.5 Sonnet proxy'
  },

  // ════════════════════════════════════════════════════════════════
  // 🟣 GEMINI MODELS
  // ════════════════════════════════════════════════════════════════
  // ── Direct Gemini (via Cloudflare Worker — uses GEMINI_API_KEY) ──
  {
    id: 'gemini-3.5-flash',
    label: 'Gemini 3.5 Flash (Direct)',
    engine: 'cloudflare',
    modelStr: 'gemini/gemini-3.5-flash',
    badge: 'DIRECT',
    badgeColor: 'violet',
    icon: 'Zap',
    iconColor: '#8b5cf6',
    description: 'Fast, coding, and agentic tasks — direct Google API'
  },
  {
    id: 'gemini-3.1-pro-preview',
    label: 'Gemini 3.1 Pro (Direct)',
    engine: 'cloudflare',
    modelStr: 'gemini/gemini-3.1-pro-preview',
    badge: 'PRO',
    badgeColor: 'violet',
    icon: 'Brain',
    iconColor: '#8b5cf6',
    description: 'Advanced reasoning and long docs — direct Google API'
  },
  {
    id: 'gemini-3.1-flash-lite',
    label: 'Gemini 3.1 Flash-Lite (Direct)',
    engine: 'cloudflare',
    modelStr: 'gemini/gemini-3.1-flash-lite',
    badge: 'LITE',
    badgeColor: 'cyan',
    icon: 'Sparkles',
    iconColor: '#06b6d4',
    description: 'Ultra-Fast & Cheap — direct Google API'
  },
  {
    id: 'gemini-3.3-flash-preview',
    label: 'Gemini 3.3 Flash Preview (Direct)',
    engine: 'cloudflare',
    modelStr: 'gemini/gemini-3.3-flash-preview',
    badge: 'NEW',
    badgeColor: 'violet',
    icon: 'Zap',
    iconColor: '#8b5cf6',
    description: 'Frontier class performance — direct Google API'
  },
  {
    id: 'gemini-2.5-pro',
    label: 'Gemini 2.5 Pro (Direct)',
    engine: 'cloudflare',
    modelStr: 'gemini/gemini-2.5-pro',
    badge: 'PRO',
    badgeColor: 'violet',
    icon: 'Brain',
    iconColor: '#8b5cf6',
    description: 'Stable coding and reasoning — direct Google API'
  },
  // ── Gemini via G4F (free, no key) ──
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
    id: 'g4f-gemini-2.5-pro-gvorse',
    label: 'Gemini 2.5 Pro (gvorse)',
    engine: 'g4f',
    modelStr: 'g4f/srv_mqrlxup3fd91a47d98e6:google/gemini-2.5-pro',
    badge: 'PRO',
    badgeColor: 'violet',
    icon: 'Brain',
    iconColor: '#8b5cf6',
    description: 'Gemini 2.5 Pro via gvorse — 5262ms'
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

  // ════════════════════════════════════════════════════════════════
  // 🔵 DEEPSEEK MODELS
  // ════════════════════════════════════════════════════════════════
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
  {
    id: 'g4f-deepseek-v3.2',
    label: 'DeepSeek V3.2',
    engine: 'g4f',
    modelStr: 'g4f/deepseek-v3.2',
    badge: 'V3.2',
    badgeColor: 'blue',
    icon: 'Brain',
    iconColor: '#3b82f6',
    description: 'DeepSeek V3.2 — 467 req'
  },
  {
    id: 'g4f-deepseek',
    label: 'DeepSeek',
    engine: 'g4f',
    modelStr: 'g4f/deepseek',
    badge: 'DEEP',
    badgeColor: 'blue',
    icon: 'Brain',
    iconColor: '#3b82f6',
    description: 'DeepSeek Chat via Nectar — 204 req, 565ms'
  },
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
    id: 'g4f-deepseek-v4-flash-crowllm',
    label: 'DeepSeek V4 Flash (CrowLLM)',
    engine: 'g4f',
    modelStr: 'g4f/deepseek-v4-flash',
    provider: 'crowllm',
    badge: 'ALT',
    badgeColor: 'cyan',
    icon: 'Zap',
    iconColor: '#06b6d4',
    description: 'DeepSeek V4 Flash via CrowLLM — 32 req'
  },
  {
    id: 'g4f-deepseek-v3.2-modelscope',
    label: 'DeepSeek V3.2 (Modelscope)',
    engine: 'g4f',
    modelStr: 'g4f/deepseek-ai/DeepSeek-V3.2',
    badge: 'ALT',
    badgeColor: 'cyan',
    icon: 'Brain',
    iconColor: '#06b6d4',
    description: 'DeepSeek V3.2 via Modelscope — 11 req'
  },
  {
    id: 'g4f-deepseek-v4-flash-nvidia',
    label: 'DeepSeek V4 Flash (Nvidia)',
    engine: 'g4f',
    modelStr: 'g4f/deepseek-ai/deepseek-v4-flash',
    provider: 'nvidia',
    badge: 'NVIDIA',
    badgeColor: 'green',
    icon: 'Zap',
    iconColor: '#10b981',
    description: 'DeepSeek V4 Flash via Nvidia — 10 req'
  },

  // ════════════════════════════════════════════════════════════════
  // 🟤 QWEN MODELS
  // ════════════════════════════════════════════════════════════════
  // ── Qwen Custom Worker Models ──
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
  {
    id: 'qw-qwen3.6-plus',
    label: 'Qwen 3.6 Plus (Worker)',
    engine: 'g4f',
    modelStr: 'qwen_worker/qwen3.6-plus',
    icon: 'Star',
    iconColor: '#f59e0b',
    description: 'Alibaba Qwen 3.6 Plus — dedicated worker'
  },
  // ── Qwen via G4F ──
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
    id: 'g4f-qwen-coder',
    label: 'Qwen Coder',
    engine: 'g4f',
    modelStr: 'g4f/qwen-coder',
    badge: 'CODE',
    badgeColor: 'blue',
    icon: 'Code',
    iconColor: '#3b82f6',
    description: 'Qwen Coder via Nectar — 35 req, 971ms'
  },
  {
    id: 'g4f-qwen3-32b',
    label: 'Qwen 3 32B (Groq)',
    engine: 'g4f',
    modelStr: 'g4f/qwen/qwen3-32b',
    badge: 'GROQ',
    badgeColor: 'orange',
    icon: 'Brain',
    iconColor: '#f97316',
    description: 'Qwen 3 32B via Groq — ultra fast 262ms'
  },
  {
    id: 'g4f-qwen3.6-27b',
    label: 'Qwen 3.6 27B (Groq)',
    engine: 'g4f',
    modelStr: 'g4f/qwen/qwen3.6-27b',
    badge: 'GROQ',
    badgeColor: 'orange',
    icon: 'Zap',
    iconColor: '#f97316',
    description: 'Qwen 3.6 27B via Groq — ultra fast 314ms'
  },
  {
    id: 'g4f-qwen3-coder-next',
    label: 'Qwen 3 Coder Next',
    engine: 'g4f',
    modelStr: 'g4f/qwen3-coder-next',
    badge: 'CODE',
    badgeColor: 'blue',
    icon: 'Code',
    iconColor: '#3b82f6',
    description: 'Qwen 3 Coder Next via Ollama — 7 req'
  },

  // ════════════════════════════════════════════════════════════════
  // 🟡 KIMI MODELS
  // ════════════════════════════════════════════════════════════════
  {
    id: 'g4f-kimi-k2.7-code',
    label: 'Kimi K2.7 Code',
    engine: 'g4f',
    modelStr: 'g4f/kimi-k2.7-code',
    badge: 'CODE',
    badgeColor: 'orange',
    icon: 'Code',
    iconColor: '#f97316',
    description: 'Kimi K2.7 Code — 73 req, 1931ms'
  },
  {
    id: 'g4f-kimi-k2.6',
    label: 'Kimi K2.6',
    engine: 'g4f',
    modelStr: 'g4f/kimi-k2.6',
    badge: 'KIMI',
    badgeColor: 'orange',
    icon: 'Brain',
    iconColor: '#f97316',
    description: 'Kimi K2.6 — 66 req, 631ms'
  },
  {
    id: 'g4f-kimi',
    label: 'Kimi',
    engine: 'g4f',
    modelStr: 'g4f/kimi',
    badge: 'KIMI',
    badgeColor: 'orange',
    icon: 'Sparkles',
    iconColor: '#f97316',
    description: 'Kimi via Nectar — 41 req, 1163ms'
  },
  {
    id: 'g4f-kimi-k2.6-nvidia',
    label: 'Kimi K2.6 (Nvidia)',
    engine: 'g4f',
    modelStr: 'g4f/moonshotai/kimi-k2.6',
    badge: 'NVIDIA',
    badgeColor: 'green',
    icon: 'Brain',
    iconColor: '#10b981',
    description: 'Kimi K2.6 via Nvidia — 38 req, 8009ms'
  },
  {
    id: 'g4f-kimi-k2.5',
    label: 'Kimi K2.5',
    engine: 'g4f',
    modelStr: 'g4f/kimi-k2.5',
    badge: 'KIMI',
    badgeColor: 'orange',
    icon: 'FileText',
    iconColor: '#f97316',
    description: 'Kimi K2.5 long context — 8 req'
  },

  // ════════════════════════════════════════════════════════════════
  // 🔴 MISTRAL MODELS
  // ════════════════════════════════════════════════════════════════
  {
    id: 'g4f-mistral-large-675b',
    label: 'Mistral Large 675B',
    engine: 'g4f',
    modelStr: 'g4f/mistralai/mistral-large-3-675b-instruct-2512',
    badge: '675B',
    badgeColor: 'violet',
    icon: 'Brain',
    iconColor: '#8b5cf6',
    description: 'Mistral Large 3 675B — 45 req, 525ms'
  },
  {
    id: 'g4f-mistral',
    label: 'Mistral',
    engine: 'g4f',
    modelStr: 'g4f/mistral',
    badge: 'MISTRAL',
    badgeColor: 'orange',
    icon: 'Zap',
    iconColor: '#f97316',
    description: 'Mistral via Nectar — 34 req, 540ms'
  },
  {
    id: 'g4f-ministral-14b',
    label: 'Ministral 14B',
    engine: 'g4f',
    modelStr: 'g4f/mistralai/ministral-14b-instruct-2512',
    badge: '14B',
    badgeColor: 'blue',
    icon: 'Zap',
    iconColor: '#3b82f6',
    description: 'Ministral 14B via Nvidia — 11 req'
  },
  {
    id: 'g4f-mistral-small-4-119b',
    label: 'Mistral Small 4 119B',
    engine: 'g4f',
    modelStr: 'g4f/mistralai/mistral-small-4-119b-2603',
    badge: '119B',
    badgeColor: 'blue',
    icon: 'Brain',
    iconColor: '#3b82f6',
    description: 'Mistral Small 4 119B via Nvidia — 449ms'
  },

  // ════════════════════════════════════════════════════════════════
  // 🟢 MINIMAX MODELS
  // ════════════════════════════════════════════════════════════════
  {
    id: 'g4f-minimax',
    label: 'MiniMax',
    engine: 'g4f',
    modelStr: 'g4f/minimax',
    badge: 'POPULAR',
    badgeColor: 'green',
    icon: 'Brain',
    iconColor: '#10b981',
    description: 'MiniMax via Nectar — 236 req, 1620ms'
  },
  {
    id: 'g4f-minimax-m2.7',
    label: 'MiniMax M2.7',
    engine: 'g4f',
    modelStr: 'g4f/minimaxai/minimax-m2.7',
    badge: 'M2.7',
    badgeColor: 'blue',
    icon: 'Brain',
    iconColor: '#3b82f6',
    description: 'MiniMax M2.7 via Nvidia — 383 req'
  },
  {
    id: 'g4f-minimax-m3',
    label: 'MiniMax M3',
    engine: 'g4f',
    modelStr: 'g4f/minimaxai/minimax-m3',
    badge: 'M3',
    badgeColor: 'violet',
    icon: 'Sparkles',
    iconColor: '#8b5cf6',
    description: 'MiniMax M3 via Nvidia — 37 req'
  },
  {
    id: 'g4f-minimax-m3-ollama',
    label: 'MiniMax M3 (Ollama)',
    engine: 'g4f',
    modelStr: 'g4f/minimax-m3',
    badge: 'M3',
    badgeColor: 'blue',
    icon: 'Brain',
    iconColor: '#3b82f6',
    description: 'MiniMax M3 via Ollama — 31 req'
  },
  {
    id: 'g4f-minimax-m2.5',
    label: 'MiniMax M2.5',
    engine: 'g4f',
    modelStr: 'g4f/minimax-m2.5',
    badge: 'M2.5',
    badgeColor: 'blue',
    icon: 'Zap',
    iconColor: '#3b82f6',
    description: 'MiniMax M2.5 via Ollama — 12 req'
  },

  // ════════════════════════════════════════════════════════════════
  // 🔵 LLAMA MODELS
  // ════════════════════════════════════════════════════════════════
  {
    id: 'g4f-llama-3.3-70b',
    label: 'Llama 3.3 70B',
    engine: 'g4f',
    modelStr: 'g4f/llama-3.3-70b-versatile',
    badge: '70B',
    badgeColor: 'blue',
    icon: 'Brain',
    iconColor: '#3b82f6',
    description: 'Meta Llama 3.3 70B via Groq — 70 req, 680ms'
  },
  {
    id: 'g4f-llama-3.1-70b',
    label: 'Llama 3.1 70B',
    engine: 'g4f',
    modelStr: 'g4f/meta/llama-3.1-70b-instruct',
    badge: '70B',
    badgeColor: 'blue',
    icon: 'Brain',
    iconColor: '#3b82f6',
    description: 'Meta Llama 3.1 70B via Nvidia — 29 req'
  },
  {
    id: 'g4f-llama-4-maverick',
    label: 'Llama 4 Maverick 128E',
    engine: 'g4f',
    modelStr: 'g4f/meta/llama-4-maverick-17b-128e-instruct',
    badge: 'NEW',
    badgeColor: 'red',
    icon: 'Sparkles',
    iconColor: '#ef4444',
    description: 'Meta Llama 4 Maverick 128E via Nvidia — 458ms'
  },
  {
    id: 'g4f-llama-4-scout',
    label: 'Llama 4 Scout',
    engine: 'g4f',
    modelStr: 'g4f/meta-llama/llama-4-scout-17b-16e-instruct',
    badge: 'SCOUT',
    badgeColor: 'green',
    icon: 'Globe',
    iconColor: '#10b981',
    description: 'Meta Llama 4 Scout via Groq — 872ms'
  },
  {
    id: 'g4f-llama-3.2-1b',
    label: 'Llama 3.2 1B',
    engine: 'g4f',
    modelStr: 'g4f/meta/llama-3.2-1b-instruct',
    badge: '1B',
    badgeColor: 'green',
    icon: 'Zap',
    iconColor: '#10b981',
    description: 'Meta Llama 3.2 1B — ultra fast, 471ms'
  },

  // ════════════════════════════════════════════════════════════════
  // 🟣 GLM MODELS
  // ════════════════════════════════════════════════════════════════
  {
    id: 'g4f-glm-5.2',
    label: 'GLM 5.2',
    engine: 'g4f',
    modelStr: 'g4f/glm-5.2',
    badge: 'TOP',
    badgeColor: 'blue',
    icon: 'Brain',
    iconColor: '#3b82f6',
    description: 'GLM 5.2 — 604 req, 4788ms (very popular)'
  },
  {
    id: 'g4f-glm-5',
    label: 'GLM 5',
    engine: 'g4f',
    modelStr: 'g4f/glm-5',
    badge: 'GLM',
    badgeColor: 'blue',
    icon: 'Brain',
    iconColor: '#3b82f6',
    description: 'GLM 5 — 262 req, 2471ms'
  },
  {
    id: 'g4f-glm-5.1',
    label: 'GLM 5.1',
    engine: 'g4f',
    modelStr: 'g4f/glm-5.1',
    badge: 'GLM',
    badgeColor: 'blue',
    icon: 'Sparkles',
    iconColor: '#3b82f6',
    description: 'GLM 5.1 — 109 req, 2224ms'
  },
  {
    id: 'g4f-glm',
    label: 'GLM',
    engine: 'g4f',
    modelStr: 'g4f/glm',
    badge: 'GLM',
    badgeColor: 'blue',
    icon: 'Brain',
    iconColor: '#3b82f6',
    description: 'GLM via gen.pollinations — 75 req, 970ms'
  },
  {
    id: 'g4f-glm-4.7',
    label: 'GLM 4.7 (Cerebras)',
    engine: 'g4f',
    modelStr: 'g4f/zai-glm-4.7',
    badge: 'FAST',
    badgeColor: 'green',
    icon: 'Zap',
    iconColor: '#10b981',
    description: 'GLM 4.7 via Cerebras — 20 req, 851ms'
  },
  {
    id: 'g4f-glm-4.7-flash',
    label: 'GLM 4.7 Flash',
    engine: 'g4f',
    modelStr: 'g4f/glm-4.7-flash',
    badge: 'FLASH',
    badgeColor: 'green',
    icon: 'Zap',
    iconColor: '#10b981',
    description: 'GLM 4.7 Flash via CrowLLM — 31 req'
  },
  {
    id: 'g4f-glm-4.6',
    label: 'GLM 4.6',
    engine: 'g4f',
    modelStr: 'g4f/glm-4.6',
    badge: 'GLM',
    badgeColor: 'blue',
    icon: 'Brain',
    iconColor: '#3b82f6',
    description: 'GLM 4.6 via CrowLLM — 37 req'
  },
  {
    id: 'g4f-glm-5v-turbo',
    label: 'GLM 5V Turbo',
    engine: 'g4f',
    modelStr: 'g4f/glm-5v-turbo',
    badge: 'VISION',
    badgeColor: 'violet',
    icon: 'Image',
    iconColor: '#8b5cf6',
    description: 'GLM 5V Turbo (Vision) via CrowLLM — 20 req'
  },
  {
    id: 'g4f-glm-5.2-modelscope',
    label: 'GLM 5.2 (Modelscope)',
    engine: 'g4f',
    modelStr: 'g4f/zai-org/GLM-5.2',
    badge: 'ALT',
    badgeColor: 'cyan',
    icon: 'Brain',
    iconColor: '#06b6d4',
    description: 'GLM 5.2 via HuggingFace — 21 req'
  },
  {
    id: 'g4f-glm-5.1-modelscope',
    label: 'GLM 5.1 (Modelscope)',
    engine: 'g4f',
    modelStr: 'g4f/zai-org/GLM-5.1',
    badge: 'ALT',
    badgeColor: 'cyan',
    icon: 'Brain',
    iconColor: '#06b6d4',
    description: 'GLM 5.1 via Modelscope — 31 req'
  },

  // ════════════════════════════════════════════════════════════════
  // ⚡ NEMOTRON MODELS
  // ════════════════════════════════════════════════════════════════
  {
    id: 'g4f-nemotron-3-super',
    label: 'Nemotron 3 Super',
    engine: 'g4f',
    modelStr: 'g4f/nemotron-3-super',
    badge: 'TOP',
    badgeColor: 'green',
    icon: 'Brain',
    iconColor: '#10b981',
    description: 'Nvidia Nemotron 3 Super — 489 req, 2763ms'
  },
  {
    id: 'g4f-nemotron-3-nano-30b',
    label: 'Nemotron 3 Nano 30B',
    engine: 'g4f',
    modelStr: 'g4f/nvidia/nemotron-3-nano-30b-a3b',
    badge: '30B',
    badgeColor: 'green',
    icon: 'Zap',
    iconColor: '#10b981',
    description: 'Nvidia Nemotron 3 Nano 30B — 392 req, 720ms'
  },
  {
    id: 'g4f-nemotron-3-super-120b-free',
    label: 'Nemotron 3 Super 120B Free',
    engine: 'g4f',
    modelStr: 'g4f/nvidia/nemotron-3-super-120b-a12b:free',
    badge: 'FREE',
    badgeColor: 'green',
    icon: 'Brain',
    iconColor: '#10b981',
    description: 'Nemotron 3 Super 120B Free via OpenRouter — 327 req'
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
    description: 'Nvidia Nemotron 3 Super 120B — 145 req'
  },
  {
    id: 'g4f-nemotron-3-nano-30b-ollama',
    label: 'Nemotron 3 Nano 30B (Ollama)',
    engine: 'g4f',
    modelStr: 'g4f/nemotron-3-nano:30b',
    badge: '30B',
    badgeColor: 'blue',
    icon: 'Zap',
    iconColor: '#3b82f6',
    description: 'Nemotron 3 Nano 30B via Ollama — 959ms'
  },

  // ════════════════════════════════════════════════════════════════
  // 🌐 OTHER MODELS
  // ════════════════════════════════════════════════════════════════
  {
    id: 'g4f-grok',
    label: 'Grok',
    engine: 'g4f',
    modelStr: 'g4f/grok',
    badge: 'GROK',
    badgeColor: 'blue',
    icon: 'Globe',
    iconColor: '#3b82f6',
    description: 'X.AI Grok via Nectar — 27 req, 1016ms'
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
    id: 'g4f-gemma',
    label: 'Gemma',
    engine: 'g4f',
    modelStr: 'g4f/gemma',
    badge: 'GEMMA',
    badgeColor: 'blue',
    icon: 'Sparkles',
    iconColor: '#3b82f6',
    description: 'Google Gemma via gen.pollinations — 16 req'
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
    id: 'g4f-devstral-2-123b',
    label: 'Devstral 2 123B',
    engine: 'g4f',
    modelStr: 'g4f/devstral-2:123b',
    badge: '123B',
    badgeColor: 'violet',
    icon: 'Brain',
    iconColor: '#8b5cf6',
    description: 'Devstral 2 123B — specialized coding model'
  },
  {
    id: 'g4f-poolside-laguna',
    label: 'Poolside Laguna M.1',
    engine: 'g4f',
    modelStr: 'g4f/poolside/laguna-m.1:free',
    badge: 'FREE',
    badgeColor: 'green',
    icon: 'Sparkles',
    iconColor: '#10b981',
    description: 'Poolside Laguna M.1 Free via OpenRouter'
  },
  {
    id: 'g4f-step-3.7-flash',
    label: 'Step 3.7 Flash',
    engine: 'g4f',
    modelStr: 'g4f/stepfun-ai/step-3.7-flash',
    badge: 'STEP',
    badgeColor: 'blue',
    icon: 'Zap',
    iconColor: '#3b82f6',
    description: 'StepFun Step 3.7 Flash via Nvidia — 4066ms'
  },
  {
    id: 'g4f-midijourney',
    label: 'Midijourney',
    engine: 'g4f',
    modelStr: 'g4f/midijourney',
    badge: 'MUSIC',
    badgeColor: 'violet',
    icon: 'Music',
    iconColor: '#8b5cf6',
    description: 'Midijourney music model via Nectar — 30 req'
  },

  // ════════════════════════════════════════════════════════════════
  // 🦆 DUCKDUCKGO AI CHAT MODELS
  // ════════════════════════════════════════════════════════════════
  {
    id: 'ddg-gpt-5-mini',
    label: 'GPT-5 mini (DDG)',
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
    label: 'GPT-4o mini (DDG)',
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
    label: 'GPT-OSS 120B (DDG)',
    engine: 'ddg',
    modelStr: 'ddg/gpt-oss-120b',
    badge: 'DDG',
    badgeColor: 'green',
    icon: 'Globe',
    iconColor: '#10b981',
    description: 'GPT-OSS 120B via DuckDuckGo'
  },
  {
    id: 'ddg-llama-4-scout',
    label: 'Llama 4 Scout (DDG)',
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
    label: 'Claude Haiku 4.5 (DDG)',
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
    label: 'Mistral Small 4 (DDG)',
    engine: 'ddg',
    modelStr: 'ddg/Mixtral-8x7B-Instruct-v0.1',
    badge: 'DDG',
    badgeColor: 'green',
    icon: 'Globe',
    iconColor: '#10b981',
    description: 'Mistral Small 4 via DuckDuckGo'
  },

  // ════════════════════════════════════════════════════════════════
  // 🔧 AUTO-SCRAPED MODELS (free-llm-api-keys GitHub)
  // ════════════════════════════════════════════════════════════════
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
    label: 'DeepSeek Chat (Auto)',
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

  // ════════════════════════════════════════════════════════════════
  // 🇨🇳 CHINESE REVERSE PROXY MODELS (Local & Keyless)
  // ════════════════════════════════════════════════════════════════
  {
    id: 'qwen-free-max',
    label: 'Qwen 3.7 Max (Chinese)',
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
    label: 'Qwen 3.7 Plus (Chinese)',
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
    label: 'Kimi K3 (Chinese)',
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
    label: 'Kimi K2.6 (Chinese)',
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
    label: 'GLM 5 (Chinese)',
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
    label: 'GLM 4 Plus (Chinese)',
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
    label: 'Step 2 (Chinese)',
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
    label: 'Spark 4.5 Ultra (Chinese)',
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
    label: 'Metaso Search (Chinese)',
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

  // ════════════════════════════════════════════════════════════════
  // 🔍 PERPLEXITY / SEARCH MODELS
  // ════════════════════════════════════════════════════════════════
  {
    id: 'g4f-perplexity-fast',
    label: 'Perplexity Fast',
    engine: 'g4f',
    modelStr: 'g4f/perplexity-fast',
    badge: 'SEARCH',
    badgeColor: 'green',
    icon: 'Globe',
    iconColor: '#10b981',
    description: 'Real-time Web Search via G4F'
  },
\n  // ════════ NEW BATCH OF MODELS ════════\n  {
    id: 'g4f-xiaomimimo-mimo-v2-5',
    label: 'xiaomimimo/mimo-V2.5',
    engine: 'g4f',
    modelStr: 'g4f/xiaomimimo/mimo-V2.5',
    
    badge: 'NEW',
    badgeColor: 'cyan',
    icon: 'Zap',
    iconColor: '#06b6d4',
    description: 'xiaomimimo/mimo-V2.5 via G4F Proxy'
  },\n  {
    id: 'g4f-qwen3-6-35b-a3b-uncensored-hauhaucs-aggressive-q4-k-m-gguf',
    label: 'Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive-Q4_K_M.gguf',
    engine: 'g4f',
    modelStr: 'g4f/Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive-Q4_K_M.gguf',
    
    badge: 'NEW',
    badgeColor: 'cyan',
    icon: 'Code',
    iconColor: '#06b6d4',
    description: 'Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive-Q4_K_M.gguf via G4F Proxy'
  },\n  {
    id: 'g4f-deepseek-ai-deepseek-v4-pro',
    label: 'deepseek-ai/deepseek-v4-pro',
    engine: 'g4f',
    modelStr: 'g4f/deepseek-ai/deepseek-v4-pro',
    provider: 'nvidia',
    badge: 'NEW',
    badgeColor: 'cyan',
    icon: 'Brain',
    iconColor: '#06b6d4',
    description: 'deepseek-ai/deepseek-v4-pro via G4F Proxy'
  },\n  {
    id: 'g4f-nova-fast',
    label: 'nova-fast',
    engine: 'g4f',
    modelStr: 'g4f/nova-fast',
    provider: 'pollinations',
    badge: 'NEW',
    badgeColor: 'cyan',
    icon: 'Zap',
    iconColor: '#06b6d4',
    description: 'nova-fast via G4F Proxy'
  },\n  {
    id: 'g4f-nemotron-3-ultra',
    label: 'nemotron-3-ultra',
    engine: 'g4f',
    modelStr: 'g4f/nemotron-3-ultra',
    provider: 'ollama.pro',
    badge: 'NEW',
    badgeColor: 'cyan',
    icon: 'Zap',
    iconColor: '#06b6d4',
    description: 'nemotron-3-ultra via G4F Proxy'
  },\n  {
    id: 'g4f-qwen3-5-35b-a3b-uncensored-hauhaucs-aggressive-q4-k-m-gguf',
    label: 'Qwen3.5-35B-A3B-Uncensored-HauhauCS-Aggressive-Q4_K_M.gguf',
    engine: 'g4f',
    modelStr: 'g4f/Qwen3.5-35B-A3B-Uncensored-HauhauCS-Aggressive-Q4_K_M.gguf',
    
    badge: 'NEW',
    badgeColor: 'cyan',
    icon: 'Code',
    iconColor: '#06b6d4',
    description: 'Qwen3.5-35B-A3B-Uncensored-HauhauCS-Aggressive-Q4_K_M.gguf via G4F Proxy'
  },\n  {
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
  },\n  {
    id: 'g4f-nvidia-nemotron-3-ultra-550b-a55b',
    label: 'nvidia/nemotron-3-ultra-550b-a55b',
    engine: 'g4f',
    modelStr: 'g4f/nvidia/nemotron-3-ultra-550b-a55b',
    provider: 'nvidia',
    badge: 'NEW',
    badgeColor: 'cyan',
    icon: 'Zap',
    iconColor: '#06b6d4',
    description: 'nvidia/nemotron-3-ultra-550b-a55b via G4F Proxy'
  },\n  {
    id: 'g4f-gemini-3-1-pro-low',
    label: 'gemini-3.1-pro-low',
    engine: 'g4f',
    modelStr: 'g4f/gemini-3.1-pro-low',
    
    badge: 'NEW',
    badgeColor: 'cyan',
    icon: 'Sparkles',
    iconColor: '#06b6d4',
    description: 'gemini-3.1-pro-low via G4F Proxy'
  },\n  {
    id: 'g4f-minimax-m3-cloud',
    label: 'minimax-m3:cloud',
    engine: 'g4f',
    modelStr: 'g4f/minimax-m3:cloud',
    
    badge: 'NEW',
    badgeColor: 'cyan',
    icon: 'Zap',
    iconColor: '#06b6d4',
    description: 'minimax-m3:cloud via G4F Proxy'
  },\n  {
    id: 'g4f-groq-compound-mini',
    label: 'groq/compound-mini',
    engine: 'g4f',
    modelStr: 'g4f/groq/compound-mini',
    provider: 'groq',
    badge: 'NEW',
    badgeColor: 'cyan',
    icon: 'Zap',
    iconColor: '#06b6d4',
    description: 'groq/compound-mini via G4F Proxy'
  },\n  {
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
  },\n  {
    id: 'g4f-groq-compound',
    label: 'groq/compound',
    engine: 'g4f',
    modelStr: 'g4f/groq/compound',
    provider: 'groq',
    badge: 'NEW',
    badgeColor: 'cyan',
    icon: 'Zap',
    iconColor: '#06b6d4',
    description: 'groq/compound via G4F Proxy'
  },\n  {
    id: 'g4f-gemma3-4b',
    label: 'gemma3:4b',
    engine: 'g4f',
    modelStr: 'g4f/gemma3:4b',
    
    badge: 'NEW',
    badgeColor: 'cyan',
    icon: 'Zap',
    iconColor: '#06b6d4',
    description: 'gemma3:4b via G4F Proxy'
  },\n  {
    id: 'g4f-openai-gpt-oss-120b-free',
    label: 'openai/gpt-oss-120b:free',
    engine: 'g4f',
    modelStr: 'g4f/openai/gpt-oss-120b:free',
    provider: 'openrouter',
    badge: 'NEW',
    badgeColor: 'cyan',
    icon: 'Zap',
    iconColor: '#06b6d4',
    description: 'openai/gpt-oss-120b:free via G4F Proxy'
  },\n];


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
  return AI_MODELS.find(m => m.id === 'g4f-openai-fast') || AI_MODELS[0];
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
        directEndpoint = 'https://qwen.g4f-dev.workers.dev/v1/chat/completions';
        provider = 'qwen_worker';
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
              stream: !!onChunk,
              max_tokens: 8192
            })
          });

          if (directRes.ok) {
            console.log(`[Frontend Fetch] Success from User IP!`);
            if (onChunk && directRes.body) {
              return await handleSSEStream(directRes, onChunk);
            } else {
              const data = await directRes.json();
              const content = data.choices?.[0]?.message?.content || data.reply || '';
              const reasoning = data.choices?.[0]?.message?.reasoning_content || data.choices?.[0]?.message?.reasoning || '';
              let reply = content;
              if (reasoning) {
                reply = `<think>\n${reasoning}\n</think>\n${content}`;
              }
              return reply || '';
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
        return 'ΓÜá∩╕Å Rate limit exceeded. Please wait a moment and try again.';
      }
      try {
        const errorData = await res.json();
        if (errorData.reply) return errorData.reply;
        if (errorData.error) return `ΓÜá∩╕Å API Error: ${errorData.error}`;
      } catch { }
      return `Γ¥î Error: Server returned ${res.status}.`;
    }

    if (onChunk && res.body) {
      return await handleSSEStream(res, onChunk);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || data.reply || '';
    const reasoning = data.choices?.[0]?.message?.reasoning_content || data.choices?.[0]?.message?.reasoning || '';
    
    let reply = content;
    if (reasoning) {
      reply = `<think>\n${reasoning}\n</think>\n${content}`;
    }
    
    return reply || 'No response received from the AI model.';
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
