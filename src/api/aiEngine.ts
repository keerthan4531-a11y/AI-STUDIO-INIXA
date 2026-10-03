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
  // 🌟 GPT-5.6 LUNA (Default Flagship — OpenAI Proxy)
  // ════════════════════════════════════════════════════════════════
  {
    id: 'gpt-5.6-luna',
    label: 'GPT-5.6 Luna',
    engine: 'custom',
    modelStr: 'gpt-5-6',
    badge: 'DEFAULT',
    badgeColor: 'violet',
    icon: 'Sparkles',
    iconColor: '#8b5cf6',
    description: 'GPT-5.6 Luna — OpenAI Frontier Reasoning & High-Order Intelligence'
  },
  {
    id: 'gpt-5.6-luna-mini',
    label: 'GPT-5.6 Luna Mini',
    engine: 'custom',
    modelStr: 'gpt-5-6-mini',
    badge: 'FAST',
    badgeColor: 'blue',
    icon: 'Zap',
    iconColor: '#3b82f6',
    description: 'GPT-5.6 Luna Mini — High-speed reasoning model'
  },

  // ════════════════════════════════════════════════════════════════
  // ⚡ GROK 4.6 (xAI Frontier Reasoning)
  // ════════════════════════════════════════════════════════════════
  {
    id: 'grok-4.6',
    label: 'Grok 4.6 (xAI)',
    engine: 'custom',
    modelStr: 'grok-4.6',
    badge: 'GROK 4.6',
    badgeColor: 'blue',
    icon: 'Sparkles',
    iconColor: '#3b82f6',
    description: 'Grok 4.6 — xAI Frontier Thinking & Ultra-High Speed Reasoning'
  },
  {
    id: 'grok-4.6-thinking',
    label: 'Grok 4.6 Thinking (xAI)',
    engine: 'custom',
    modelStr: 'grok-4.6-thinking',
    badge: 'THINKING',
    badgeColor: 'violet',
    icon: 'Brain',
    iconColor: '#8b5cf6',
    description: 'Grok 4.6 Deep Reasoning & Complex Cognitive Problem Solving'
  },

  // ════════════════════════════════════════════════════════════════
  // 🌊 POOLSIDE AI MODELS (Laguna 2.1 Frontier Reasoning)
  // ════════════════════════════════════════════════════════════════
  {
    id: 'poolside-laguna-s-2.1',
    label: 'Laguna S 2.1 (Poolside)',
    engine: 'custom',
    modelStr: 'kilo/poolside/laguna-s-2.1:free',
    provider: 'kilo',
    badge: 'LAGUNA 2.1',
    badgeColor: 'blue',
    icon: 'Sparkles',
    iconColor: '#3b82f6',
    description: 'Laguna S 2.1 — Poolside Frontier Code & Reasoning Intelligence (100% Free)'
  },
  {
    id: 'poolside-laguna-s-2.1-thinking',
    label: 'Laguna S 2.1 Thinking (Poolside)',
    engine: 'custom',
    modelStr: 'kilo/poolside/laguna-s-2.1:free',
    provider: 'kilo',
    badge: 'THINKING',
    badgeColor: 'violet',
    icon: 'Brain',
    iconColor: '#8b5cf6',
    description: 'Laguna S 2.1 Deep Thought & Mathematical / Agentic Reasoning (100% Free)'
  },

  // ════════════════════════════════════════════════════════════════
  // 🐰 SPACE BUNNY AI (Stealth Frontier Reasoning — 100% Free)
  // ════════════════════════════════════════════════════════════════
  {
    id: 'space-bunny-alpha',
    label: 'Space Bunny Alpha (Stealth)',
    engine: 'custom',
    modelStr: 'kilo/stealth/space-bunny-alpha',
    provider: 'kilo',
    badge: 'TOP-CLASS',
    badgeColor: 'pink',
    icon: 'Sparkles',
    iconColor: '#ec4899',
    description: 'Space Bunny Alpha — Stealth Frontier Reasoning Model with Chain-of-Thought (100% Free)'
  },

  // ════════════════════════════════════════════════════════════════
  // 🟢 NVIDIA NEMOTRON AI (Frontier Reasoning & Coding — 100% Free)
  // ════════════════════════════════════════════════════════════════
  {
    id: 'nvidia-nemotron-3.5-lightning',
    label: 'Nemotron 3.5 Lightning (NVIDIA)',
    engine: 'custom',
    modelStr: 'kilo/nvidia/nemotron-3.5-lightning:free',
    provider: 'kilo',
    badge: 'NVIDIA FAST',
    badgeColor: 'emerald',
    icon: 'Zap',
    iconColor: '#10b981',
    description: 'NVIDIA Nemotron 3.5 Lightning — Ultra-fast frontier reasoning & code intelligence (100% Free)'
  },
  {
    id: 'nvidia-nemotron-3-ultra',
    label: 'Nemotron 3 Ultra 550B (NVIDIA)',
    engine: 'custom',
    modelStr: 'kilo/nvidia/nemotron-3-ultra-550b-a55b:free',
    provider: 'kilo',
    badge: 'NVIDIA 550B',
    badgeColor: 'violet',
    icon: 'Brain',
    iconColor: '#8b5cf6',
    description: 'NVIDIA Nemotron 3 Ultra 550B — Deep multi-step reasoning flagship model (100% Free)'
  },

  // ════════════════════════════════════════════════════════════════
  // ⚡ KILO AI FRONTIER SPEED & CODE (100% Free & Blazing Fast)
  // ════════════════════════════════════════════════════════════════
  {
    id: 'kilo-liquid-lfm-2.5',
    label: 'Liquid LFM 2.5 (1.0s Speed)',
    engine: 'custom',
    modelStr: 'kilo/liquid/lfm-2.5-2.6b:free',
    provider: 'kilo',
    badge: 'LIQUID 1.0S',
    badgeColor: 'teal',
    icon: 'Zap',
    iconColor: '#14b8a6',
    description: 'Liquid AI LFM 2.5 — Ultra-low latency edge reasoning with instant answers (100% Free)'
  },
  {
    id: 'kilo-cohere-north-mini',
    label: 'Cohere North Mini Code (800ms)',
    engine: 'custom',
    modelStr: 'kilo/cohere/north-mini-code:free',
    provider: 'kilo',
    badge: 'COHERE 800MS',
    badgeColor: 'emerald',
    icon: 'Sparkles',
    iconColor: '#10b981',
    description: 'Cohere North Mini Code — Blazing 800ms rapid programming & code generation (100% Free)'
  },
  {
    id: 'kilo-qwen-3.8-27b',
    label: 'Qwen 3.8 27B (Alibaba)',
    engine: 'custom',
    modelStr: 'kilo/qwen/qwen3.8-27b:free',
    provider: 'kilo',
    badge: 'QWEN 3.8',
    badgeColor: 'blue',
    icon: 'Brain',
    iconColor: '#3b82f6',
    description: 'Alibaba Qwen 3.8 27B — Deep reasoning, logic & multilingual intelligence (100% Free)'
  },
  {
    id: 'kilo-auto-free',
    label: 'Kilo Auto (Autonomous AI)',
    engine: 'custom',
    modelStr: 'kilo/kilo-auto/free',
    provider: 'kilo',
    badge: 'AUTONOMOUS',
    badgeColor: 'violet',
    icon: 'Sparkles',
    iconColor: '#8b5cf6',
    description: 'Kilo Auto — Autonomous multi-engine smart router delivering optimal responses (100% Free)'
  },
  {
    id: 'kilo-stepfun-3.7-flash',
    label: 'StepFun 3.7 Flash',
    engine: 'custom',
    modelStr: 'kilo/stepfun/step-3.7-flash:free',
    provider: 'kilo',
    badge: 'STEPFUN 3.7',
    badgeColor: 'rose',
    icon: 'Zap',
    iconColor: '#f43f5e',
    description: 'StepFun 3.7 Flash — High-speed reasoning with long-context memory (100% Free)'
  },
  {
    id: 'kilo-dots-3-note',
    label: 'Dots 3 Note Preview',
    engine: 'custom',
    modelStr: 'kilo/dots-studio/dots-3-note-preview:free',
    provider: 'kilo',
    badge: 'DOTS 3',
    badgeColor: 'amber',
    icon: 'FileText',
    iconColor: '#f59e0b',
    description: 'Dots Studio Note 3 — Technical synthesis and structured analysis (100% Free)'
  },

  // ════════════════════════════════════════════════════════════════
  // 🚀 COHERE & OPEN FRONTIER MODELS (100% Free Verified)
  // ════════════════════════════════════════════════════════════════
  {
    id: 'cohere-command-r-plus',
    label: 'Command R+ (Cohere)',
    engine: 'custom',
    modelStr: 'command-r-plus-08-2024',
    badge: 'COMMAND R+',
    badgeColor: 'emerald',
    icon: 'Sparkles',
    iconColor: '#10b981',
    description: 'Cohere Command R+ — Frontier multilingual reasoning & structured synthesis (100% Free)'
  },
  {
    id: 'cohere-command-a',
    label: 'Command A (Cohere)',
    engine: 'custom',
    modelStr: 'command-a-03-2025',
    badge: 'COMMAND A',
    badgeColor: 'teal',
    icon: 'Zap',
    iconColor: '#14b8a6',
    description: 'Cohere Command A — Blazing fast agentic instruction following & reasoning (100% Free)'
  },
  {
    id: 'qwen-2.5-coder-32b',
    label: 'Qwen 2.5 Coder 32B',
    engine: 'custom',
    modelStr: 'qwen-2.5-coder-32b',
    badge: 'CODER 32B',
    badgeColor: 'blue',
    icon: 'Code',
    iconColor: '#3b82f6',
    description: 'Alibaba Qwen 2.5 Coder 32B — Leading open code generation and software development (100% Free)'
  },
  {
    id: 'deepseek-distill-qwen-32b',
    label: 'DeepSeek R1 Distill 32B',
    engine: 'custom',
    modelStr: 'deepseek-distill-qwen-32b',
    badge: 'THINKING',
    badgeColor: 'violet',
    icon: 'Brain',
    iconColor: '#8b5cf6',
    description: 'DeepSeek R1 Distill Qwen 32B — Chain-of-Thought mathematical and logical reasoning (100% Free)'
  },
  {
    id: 'brave-deep-research',
    label: 'Brave Deep Research',
    engine: 'custom',
    modelStr: 'brave-deep-research',
    badge: 'RESEARCH',
    badgeColor: 'amber',
    icon: 'Globe',
    iconColor: '#f59e0b',
    description: 'Brave Deep Research — In-depth multi-source real-time autonomous research (100% Free)'
  },
  {
    id: 'glm-5.3-flash',
    label: 'GLM 5.3 Flash',
    engine: 'custom',
    modelStr: 'oxalpha/z-ai/glm-5.3-flash',
    provider: 'oxalpha',
    badge: 'GLM 5.3',
    badgeColor: 'rose',
    icon: 'Zap',
    iconColor: '#f43f5e',
    description: 'GLM 5.3 Flash — High-efficiency rapid multilingual intelligence (100% Free)'
  },

  // ════════════════════════════════════════════════════════════════
  // ⚔️ ARENA AI (Frontier Dual-Model Battle — 100% Free)
  // ════════════════════════════════════════════════════════════════
  {
    id: 'arena-ai',
    label: 'Arena AI (Dual Battle)',
    engine: 'custom',
    modelStr: 'arena/lmsys-battle',
    provider: 'arena',
    badge: 'ARENA AI',
    badgeColor: 'amber',
    icon: 'Swords',
    iconColor: '#f59e0b',
    description: 'Arena AI — Frontier side-by-side battle evaluating your prompt across two frontier models simultaneously'
  },

  // ════════════════════════════════════════════════════════════════
  // 🌐 PERPLEXITY AI (Live Web Search & Frontier Reasoning — 100% Free)
  // ════════════════════════════════════════════════════════════════
  {
    id: 'pplx-turbo',
    label: 'Perplexity Turbo (Sonar Web)',
    engine: 'custom',
    modelStr: 'pplx/turbo',
    provider: 'perplexity',
    badge: 'LIVE WEB',
    badgeColor: 'teal',
    icon: 'Globe',
    iconColor: '#14b8a6',
    description: 'Perplexity Turbo — Ultra-fast real-time web search with citations & verified sources (100% Free)'
  },
  {
    id: 'pplx-gpt56-sol',
    label: 'GPT-5.6 Sol (Perplexity Web)',
    engine: 'custom',
    modelStr: 'pplx/gpt56_sol',
    provider: 'perplexity',
    badge: 'GPT-5.6 WEB',
    badgeColor: 'emerald',
    icon: 'Sparkles',
    iconColor: '#10b981',
    description: 'OpenAI GPT-5.6 Sol augmented with live Perplexity web search & citations (100% Free)'
  },
  {
    id: 'pplx-sonnet5',
    label: 'Claude Sonnet 5 (Perplexity Web)',
    engine: 'custom',
    modelStr: 'pplx/sonnet5',
    provider: 'perplexity',
    badge: 'SONNET 5 WEB',
    badgeColor: 'amber',
    icon: 'Sparkles',
    iconColor: '#f59e0b',
    description: 'Anthropic Claude Sonnet 5 with real-time web search verification & citations (100% Free)'
  },
  {
    id: 'pplx-opus5',
    label: 'Claude Opus 5 (Perplexity Web)',
    engine: 'custom',
    modelStr: 'pplx/opus5',
    provider: 'perplexity',
    badge: 'OPUS 5 WEB',
    badgeColor: 'rose',
    icon: 'Brain',
    iconColor: '#f43f5e',
    description: 'Anthropic Claude Opus 5 deep reasoning with real-time web grounding (100% Free)'
  },
  {
    id: 'pplx-gemini31',
    label: 'Gemini 3.1 Pro (Perplexity Web)',
    engine: 'custom',
    modelStr: 'pplx/gemini31',
    provider: 'perplexity',
    badge: 'GEMINI 3.1 WEB',
    badgeColor: 'cyan',
    icon: 'Zap',
    iconColor: '#06b6d4',
    description: 'Google Gemini 3.1 Pro augmented with live web search & citation links (100% Free)'
  },
  {
    id: 'pplx-grok45',
    label: 'Grok 4.5 (Perplexity Web)',
    engine: 'custom',
    modelStr: 'pplx/grok45',
    provider: 'perplexity',
    badge: 'GROK 4.5 WEB',
    badgeColor: 'blue',
    icon: 'Sparkles',
    iconColor: '#3b82f6',
    description: 'xAI Grok 4.5 frontier intelligence with live Perplexity web search (100% Free)'
  },
  {
    id: 'pplx-kimi3',
    label: 'Kimi K3 (Perplexity Web)',
    engine: 'custom',
    modelStr: 'pplx/kimi3',
    provider: 'perplexity',
    badge: 'KIMI K3 WEB',
    badgeColor: 'violet',
    icon: 'Brain',
    iconColor: '#8b5cf6',
    description: 'Moonshot Kimi K3 long-context reasoning with real-time web search (100% Free)'
  },
  {
    id: 'pplx-glm52',
    label: 'GLM 5.2 (Perplexity Web)',
    engine: 'custom',
    modelStr: 'pplx/glm52',
    provider: 'perplexity',
    badge: 'GLM 5.2 WEB',
    badgeColor: 'purple',
    icon: 'Globe',
    iconColor: '#a855f7',
    description: 'Zhipu GLM-5.2 frontier research model with live web grounding (100% Free)'
  },

  // ════════════════════════════════════════════════════════════════
  // ⚡ CHATX.AI FRONTIER MODELS (All 10 Models — 100% Free & Unlimited)
  // ════════════════════════════════════════════════════════════════
  {
    id: 'chatx-grok-fast',
    label: 'Grok 4.3 Fast (ChatX)',
    engine: 'custom',
    modelStr: 'chatx/grok_fast',
    provider: 'chatx',
    badge: 'GROK 4.3',
    badgeColor: 'blue',
    icon: 'Sparkles',
    iconColor: '#3b82f6',
    description: 'Grok 4.3 Fast — xAI Ultra-fast reasoning via ChatX (100% Free & Unlimited)'
  },
  {
    id: 'chatx-grok-main',
    label: 'Grok 4.6 Main (ChatX)',
    engine: 'custom',
    modelStr: 'chatx/grok_main',
    provider: 'chatx',
    badge: 'GROK 4.6',
    badgeColor: 'violet',
    icon: 'Brain',
    iconColor: '#8b5cf6',
    description: 'Grok 4.6 Main — xAI Flagship Thinking & Deep Cognitive Reasoning via ChatX (100% Free & Unlimited)'
  },
  {
    id: 'chatx-deepseek',
    label: 'DeepSeek V4.1 Flash (ChatX)',
    engine: 'custom',
    modelStr: 'chatx/deepseek_flash',
    provider: 'chatx',
    badge: 'DEEPSEEK',
    badgeColor: 'blue',
    icon: 'Zap',
    iconColor: '#0ea5e9',
    description: 'DeepSeek V4.1 Flash — Ultra-low latency reasoning model via ChatX (100% Free & Unlimited)'
  },
  {
    id: 'chatx-claude-sonnet',
    label: 'Claude Sonnet 5 (ChatX)',
    engine: 'custom',
    modelStr: 'chatx/claude_sonnet',
    provider: 'chatx',
    badge: 'SONNET 5',
    badgeColor: 'orange',
    icon: 'Sparkles',
    iconColor: '#f97316',
    description: 'Claude Sonnet 5 — Anthropic Next-gen coding & nuanced reasoning via ChatX (100% Free & Unlimited)'
  },
  {
    id: 'chatx-claude-opus',
    label: 'Claude Opus 5.5 (ChatX)',
    engine: 'custom',
    modelStr: 'chatx/claude_opus',
    provider: 'chatx',
    badge: 'OPUS 5.5',
    badgeColor: 'amber',
    icon: 'Brain',
    iconColor: '#d97706',
    description: 'Claude Opus 5.5 — Anthropic Highest-order reasoning & synthesis via ChatX (100% Free & Unlimited)'
  },
  {
    id: 'chatx-claude-haiku',
    label: 'Claude Haiku 4.5 (ChatX)',
    engine: 'custom',
    modelStr: 'chatx/claude_haiku',
    provider: 'chatx',
    badge: 'HAIKU 4.5',
    badgeColor: 'yellow',
    icon: 'Zap',
    iconColor: '#eab308',
    description: 'Claude Haiku 4.5 — Anthropic Fast lightweight model via ChatX (100% Free & Unlimited)'
  },
  {
    id: 'chatx-claude-fable',
    label: 'Claude Fable 5.1 (ChatX)',
    engine: 'custom',
    modelStr: 'chatx/claude_fable',
    provider: 'chatx',
    badge: 'FABLE 5.1',
    badgeColor: 'amber',
    icon: 'Sparkles',
    iconColor: '#d97706',
    description: 'Claude Fable 5.1 — Anthropic Creative & narrative intelligence via ChatX'
  },
  {
    id: 'chatx-gemini-pro',
    label: 'Gemini 3.8 Flash (ChatX)',
    engine: 'custom',
    modelStr: 'chatx/gemini_pro',
    provider: 'chatx',
    badge: 'GEMINI 3.8',
    badgeColor: 'green',
    icon: 'Sparkles',
    iconColor: '#10b981',
    description: 'Gemini 3.8 Flash — Google High efficiency multimodal intelligence via ChatX (100% Free & Unlimited)'
  },
  {
    id: 'chatx-gemini-lite',
    label: 'Gemini 3.5 Flash Lite (ChatX)',
    engine: 'custom',
    modelStr: 'chatx/gemini',
    provider: 'chatx',
    badge: 'GEMINI 3.5',
    badgeColor: 'cyan',
    icon: 'Zap',
    iconColor: '#06b6d4',
    description: 'Gemini 3.5 Flash Lite — Google Ultra-lightweight reasoning model via ChatX'
  },
  {
    id: 'chatx-gpt3',
    label: 'GPT-6 Luna (ChatX)',
    engine: 'custom',
    modelStr: 'chatx/gpt3',
    provider: 'chatx',
    badge: 'LUNA',
    badgeColor: 'cyan',
    icon: 'Sparkles',
    iconColor: '#06b6d4',
    description: 'GPT-6 Luna — OpenAI Fast reasoning model via ChatX'
  },
  {
    id: 'chatx-gpt4',
    label: 'GPT-5.4 (ChatX)',
    engine: 'custom',
    modelStr: 'chatx/gpt4',
    provider: 'chatx',
    badge: 'GPT-5.4',
    badgeColor: 'emerald',
    icon: 'Sparkles',
    iconColor: '#059669',
    description: 'GPT-5.4 — OpenAI High-order logic & reasoning intelligence via ChatX (100% Free & Unlimited)'
  },
  {
    id: 'chatx-gpt4-5',
    label: 'GPT-4.1 (ChatX)',
    engine: 'custom',
    modelStr: 'chatx/gpt4_5',
    provider: 'chatx',
    badge: 'GPT-4.1',
    badgeColor: 'emerald',
    icon: 'Zap',
    iconColor: '#10b981',
    description: 'GPT-4.1 — OpenAI Fast instruction model via ChatX'
  },
  {
    id: 'chatx-gpt5-sol',
    label: 'GPT-6.1 Sol (ChatX)',
    engine: 'custom',
    modelStr: 'chatx/gpt5_5',
    provider: 'chatx',
    badge: 'GPT-6.1 SOL',
    badgeColor: 'rose',
    icon: 'Sparkles',
    iconColor: '#f43f5e',
    description: 'GPT-6.1 Sol — OpenAI Advanced synthesis model via ChatX (100% Free & Unlimited)'
  },
  {
    id: 'chatx-gpt6-astra',
    label: 'GPT-6 Astra (ChatX)',
    engine: 'custom',
    modelStr: 'chatx/gpt6_astra',
    provider: 'chatx',
    badge: 'GPT-6 ASTRA',
    badgeColor: 'purple',
    icon: 'Brain',
    iconColor: '#a855f7',
    description: 'GPT-6 Astra — OpenAI Next-gen flagship intelligence via ChatX (100% Free & Unlimited)'
  },

  // ════════════════════════════════════════════════════════════════
  // ⚡ OVERCHAT AI MODELS (via OverChat API Gateway)
  // ════════════════════════════════════════════════════════════════
  {
    id: 'overchat-gpt-5.2',
    label: 'GPT-5.2 (OverChat)',
    engine: 'g4f',
    modelStr: 'overchat/gpt-5.2',
    badge: '5.2',
    badgeColor: 'violet',
    icon: 'Zap',
    iconColor: '#8b5cf6',
    description: 'GPT-5.2 via OverChat AI Gateway'
  },
  {
    id: 'overchat-gpt-5.1',
    label: 'GPT-5.1 (OverChat)',
    engine: 'g4f',
    modelStr: 'overchat/gpt-5.1',
    badge: '5.1',
    badgeColor: 'violet',
    icon: 'Zap',
    iconColor: '#8b5cf6',
    description: 'GPT-5.1 via OverChat AI Gateway'
  },
  {
    id: 'overchat-gpt-5-nano',
    label: 'GPT-5 Nano (OverChat)',
    engine: 'g4f',
    modelStr: 'overchat/gpt-5-nano',
    badge: 'NANO',
    badgeColor: 'cyan',
    icon: 'Zap',
    iconColor: '#06b6d4',
    description: 'GPT-5 Nano via OverChat AI Gateway'
  },
  {
    id: 'overchat-gpt-4o',
    label: 'GPT-4o (OverChat)',
    engine: 'g4f',
    modelStr: 'overchat/gpt-4o',
    badge: '4O',
    badgeColor: 'green',
    icon: 'Zap',
    iconColor: '#10b981',
    description: 'GPT-4o via OverChat AI Gateway'
  },
  {
    id: 'overchat-claude-opus-4.6',
    label: 'Claude Opus 4.6 (OverChat)',
    engine: 'g4f',
    modelStr: 'overchat/claude-opus-4.6',
    badge: 'OPUS',
    badgeColor: 'orange',
    icon: 'Sparkles',
    iconColor: '#f97316',
    description: 'Claude Opus 4.6 via OverChat AI Gateway'
  },
  {
    id: 'overchat-claude-haiku-4.5',
    label: 'Claude Haiku 4.5 (OverChat)',
    engine: 'g4f',
    modelStr: 'overchat/claude-haiku-4.5',
    badge: 'HAIKU',
    badgeColor: 'orange',
    icon: 'Zap',
    iconColor: '#f97316',
    description: 'Claude Haiku 4.5 via OverChat AI Gateway'
  },
  {
    id: 'overchat-claude-sonnet-4.6',
    label: 'Claude Sonnet 4.6 (OverChat)',
    engine: 'g4f',
    modelStr: 'overchat/claude-sonnet-4.6',
    badge: 'SONNET',
    badgeColor: 'orange',
    icon: 'Brain',
    iconColor: '#f97316',
    description: 'Claude Sonnet 4.6 via OverChat AI Gateway'
  },
  {
    id: 'overchat-gemini-3-flash',
    label: 'Gemini 3 Flash (OverChat)',
    engine: 'g4f',
    modelStr: 'overchat/gemini-3-flash',
    badge: 'FLASH',
    badgeColor: 'blue',
    icon: 'Zap',
    iconColor: '#3b82f6',
    description: 'Gemini 3 Flash via OverChat AI Gateway'
  },
  {
    id: 'overchat-deepseek-v3.2',
    label: 'DeepSeek V3.2 (OverChat)',
    engine: 'g4f',
    modelStr: 'overchat/deepseek-v3.2',
    badge: 'V3.2',
    badgeColor: 'blue',
    icon: 'Brain',
    iconColor: '#3b82f6',
    description: 'DeepSeek V3.2 via OverChat AI Gateway'
  },
  {
    id: 'overchat-kimi-k2.5',
    label: 'Kimi K2.5 (OverChat)',
    engine: 'g4f',
    modelStr: 'overchat/kimi-k2.5',
    badge: 'K2.5',
    badgeColor: 'violet',
    icon: 'Sparkles',
    iconColor: '#8b5cf6',
    description: 'Kimi K2.5 via OverChat AI Gateway'
  },
  {
    id: 'overchat-qwen-3',
    label: 'Qwen 3 (OverChat)',
    engine: 'g4f',
    modelStr: 'overchat/qwen-3',
    badge: 'QWEN',
    badgeColor: 'violet',
    icon: 'Brain',
    iconColor: '#8b5cf6',
    description: 'Qwen 3 via OverChat AI Gateway'
  },
  {
    id: 'overchat-llama-4',
    label: 'Llama 4 (OverChat)',
    engine: 'g4f',
    modelStr: 'overchat/llama-4',
    badge: 'LLAMA',
    badgeColor: 'blue',
    icon: 'Brain',
    iconColor: '#3b82f6',
    description: 'Meta Llama 4 via OverChat AI Gateway'
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
  {
    id: 'oxalpha-stealth',
    label: 'Ox Alpha',
    engine: 'custom',
    modelStr: 'oxalpha/ox-alpha',
    badge: 'OXALPHA',
    badgeColor: 'violet',
    icon: 'Brain',
    iconColor: '#6e56cf',
    description: 'Ox Alpha Stealth Reasoning Model — 1M context'
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


// Clear saved model on page load/refresh so it always defaults to GPT-5.6 Luna
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
  return AI_MODELS.find(m => m.id === 'gpt-5.6-luna') || AI_MODELS[0];
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
  let isReasoningActive = false;

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

          // Universal content extractor for OpenAI, Anthropic, Perplexity, OverChat, Pollinations, ChatX
          const content =
            parsed.delta ||
            parsed.choices?.[0]?.delta?.content ||
            parsed.choices?.[0]?.text ||
            parsed.data?.text ||
            parsed.data?.content ||
            parsed.message ||
            (typeof parsed.content === 'string' ? parsed.content : '') ||
            parsed.text ||
            parsed.response ||
            '';

          const reasoning =
            parsed.choices?.[0]?.delta?.reasoning_content ||
            parsed.choices?.[0]?.delta?.reasoning ||
            parsed.data?.reasoning ||
            '';

          if (reasoning) {
            if (!isReasoningActive) {
              if (!fullReply.includes('<think>')) {
                fullReply += '<think>\n';
              }
              isReasoningActive = true;
            }
            fullReply += reasoning;
            changed = true;
          }

          if (content) {
            if (isReasoningActive) {
              if (!fullReply.includes('</think>')) {
                fullReply += '\n</think>\n\n';
              }
              isReasoningActive = false;
            }
            fullReply += content;
            changed = true;
          }
        } catch (e) {
          // If raw text chunk (not JSON)
          if (dataStr && !dataStr.startsWith('{') && !dataStr.startsWith('[')) {
            fullReply += dataStr;
            changed = true;
          }
        }
      }
      boundary = buffer.indexOf('\n');
    }

    if (changed) {
      onChunk(fullReply, citations);
    }
  }

  if (isReasoningActive && !fullReply.includes('</think>')) {
    fullReply += '\n</think>\n\n';
    onChunk(fullReply, citations);
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

      let customDirectHeaders: Record<string, string> | null = null;
      let customDirectBody: string | null = null;
      let provider = 'g4f';

      if (modelStr.startsWith('deepinfra/')) {
        directModelStr = modelStr.replace('deepinfra/', '');
        directEndpoint = 'https://api.deepinfra.com/v1/openai/chat/completions';
        provider = 'deepinfra';
      } else if (modelStr.startsWith('qwen_worker/')) {
        directModelStr = modelStr.replace('qwen_worker/', '');
        directEndpoint = 'https://ultimate-ai-worker.keerthan4531.workers.dev/v1/chat/completions';
        provider = 'qwen_worker';
      } else if (modelStr.startsWith('updf')) {
        directEndpoint = 'https://ultimate-ai-worker.keerthan4531.workers.dev/v1/chat/completions';
        provider = 'updf';
      } else if (modelStr.startsWith('overchat/')) {
        directModelStr = modelStr;
        directEndpoint = ''; // Skip direct fetch to avoid browser CORS; let /api/chat/g4f handle server fetch
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

      if (!directEndpoint) {
        console.log(`[Frontend Fetch] Direct endpoint disabled for ${provider}. Routing via Backend Proxy Pool...`);
      } else if (checkProviderLimit(provider)) {
        console.log(`[Frontend Fetch] User IP rate limited for ${provider}. Skipping direct fetch for 2 minutes.`);
      } else {
        console.log(`[Frontend Fetch] Attempting to hit ${directEndpoint} from User IP...`);
        try {
          const directRes = await fetch(directEndpoint, {
            method: 'POST',
            headers: customDirectHeaders || {
              'Content-Type': 'application/json',
              'Accept': onChunk ? 'text/event-stream' : 'application/json'
            },
            body: customDirectBody || JSON.stringify({
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
            const status = directRes.status;
            console.warn(`[Frontend Fetch] Failed with status ${status}. Falling back to Backend Proxy Pool...`);
            setProviderLimit(provider);
          }
        } catch (err) {
          console.warn(`[Frontend Fetch] Network error: ${err}. Falling back to Backend Proxy Pool...`);
          setProviderLimit(provider);
        }
      } // End of else block for checkProviderLimit

      endpointPath = '/api/chat/g4f';
      fetchUrl = `${API_BASE}${endpointPath}`;
    } else if (model.provider === 'chatx' || modelStr.startsWith('chatx/')) {
      // ═══════════════════════════════════════════════════════════════════
      // ⚡ ChatX.ai Direct Route — STRICT: NO FALLBACK, SHOW REAL ERRORS
      // ═══════════════════════════════════════════════════════════════════
      const targetModel = modelStr.replace('chatx/', '');
      const lastUserMsg = [...conversationHistory].reverse().find(m => m.role === 'user');
      const promptText = typeof lastUserMsg?.content === 'string' ? lastUserMsg.content : JSON.stringify(lastUserMsg?.content || '');

      console.log(`[aiChat ChatX] Direct invocation for ${modelStr} (Strict mode, no fallback)...`);

      try {
        const res = await fetch(`${API_BASE}/api/chat/chatx`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: promptText,
            model: targetModel,
            turnstileToken: ''
          })
        });

        if (!res.ok) {
          let errDetail = `HTTP ${res.status}: ${res.statusText}`;
          try {
            const data = await res.json();
            if (data.error) errDetail = data.error;
          } catch {
            try {
              const text = await res.text();
              if (text) errDetail = text;
            } catch {}
          }
          const errorMsg = `\n\n❌ [ChatX Error - ${targetModel}]: ${errDetail}`;
          if (onChunk) onChunk(errorMsg);
          return errorMsg;
        }

        // Handle streaming response directly from ChatX
        if (onChunk && res.body) {
          const sseReply = await handleSSEStream(res, onChunk);
          if (sseReply && sseReply !== 'No response received from the AI model.') {
            return sseReply;
          }
          const emptyMsg = `\n\n❌ [ChatX Error - ${targetModel}]: No response received or model restricted.`;
          onChunk(emptyMsg);
          return emptyMsg;
        } else {
          const data = await res.json();
          const content = data.reply || data.choices?.[0]?.message?.content || '';
          if (content) {
            if (onChunk) onChunk(content);
            return content;
          }
          const emptyMsg = `\n\n❌ [ChatX Error - ${targetModel}]: No response received from ChatX engine.`;
          if (onChunk) onChunk(emptyMsg);
          return emptyMsg;
        }
      } catch (err: any) {
        console.error(`[aiChat ChatX Error]:`, err);
        const netErrorMsg = `\n\n❌ [ChatX Connection Error - ${targetModel}]: ${err.message || 'Failed to connect to /api/chat/chatx'}`;
        if (onChunk) onChunk(netErrorMsg);
        return netErrorMsg;
      }
    } else if (model.provider === 'perplexity' || modelStr.startsWith('pplx/') || modelStr.startsWith('perplexity/')) {
      // ═══════════════════════════════════════════════════════════════════
      // 🌐 PERPLEXITY AI — REAL-TIME WEB SEARCH & CITATIONS (NO FALLBACK)
      // ═══════════════════════════════════════════════════════════════════
      const targetModel = modelStr.replace(/^(pplx\/|perplexity\/)/, '');
      const lastUserMsg = [...conversationHistory].reverse().find(m => m.role === 'user');
      const promptText = typeof lastUserMsg?.content === 'string' ? lastUserMsg.content : JSON.stringify(lastUserMsg?.content || '');

      console.log(`[aiChat Perplexity] Direct invocation for ${modelStr} (Strict mode, no fallback)...`);

      // In browser on Vercel production, /api/pplx is a same-origin endpoint which automatically carries Vercel preview authentication cookies.
      const isBrowserProd = typeof window !== 'undefined' && !window.location.hostname.includes('localhost');
      const primaryEndpoint = isBrowserProd ? `${API_BASE}/api/pplx` : `${API_BASE}/api/chat/perplexity`;
      const fallbackEndpoint = isBrowserProd ? `${API_BASE}/api/chat/perplexity` : `${API_BASE}/api/pplx`;

      try {
        let res = await fetch(primaryEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: promptText,
            messages: conversationHistory,
            model: targetModel,
            stream: !!onChunk
          })
        });

        // If primary returned 401 (Vercel deployment protection) or 404, try secondary endpoint
        if (!res.ok && (res.status === 401 || res.status === 404)) {
          console.warn(`[aiChat Perplexity] ${primaryEndpoint} returned ${res.status}. Trying fallback: ${fallbackEndpoint}...`);
          res = await fetch(fallbackEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: promptText,
              messages: conversationHistory,
              model: targetModel,
              stream: !!onChunk
            })
          });
        }

        if (!res.ok) {
          let errDetail = `HTTP ${res.status}: ${res.statusText}`;
          try {
            const data = await res.json();
            if (data.error) errDetail = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
            else if (data.message) errDetail = data.message;
          } catch {
            try {
              const text = await res.text();
              if (text) errDetail = text;
            } catch {}
          }
          const errorMsg = `\n\n❌ [Perplexity Error - ${targetModel}]: ${errDetail}`;
          if (onChunk) onChunk(errorMsg);
          return errorMsg;
        }

        if (onChunk && res.body) {
          const sseReply = await handleSSEStream(res, onChunk);
          if (sseReply && sseReply !== 'No response received from the AI model.') {
            return sseReply;
          }
          const emptyMsg = `\n\n❌ [Perplexity Error - ${targetModel}]: No response received from Perplexity engine.`;
          onChunk(emptyMsg);
          return emptyMsg;
        } else {
          const data = await res.json();
          const content = data.reply || data.choices?.[0]?.message?.content || '';
          if (content) {
            if (onChunk) onChunk(content);
            return content;
          }
          const emptyMsg = `\n\n❌ [Perplexity Error - ${targetModel}]: Empty response received from Perplexity engine.`;
          if (onChunk) onChunk(emptyMsg);
          return emptyMsg;
        }
      } catch (err: any) {
        console.error(`[aiChat Perplexity Error]:`, err);
        const netErrorMsg = `\n\n❌ [Perplexity Connection Error - ${targetModel}]: ${err.message || 'Failed to connect to /api/chat/perplexity'}`;
        if (onChunk) onChunk(netErrorMsg);
        return netErrorMsg;
      }
    } else if (model.provider === 'kilo' || modelStr.startsWith('kilo/')) {
      // ═══════════════════════════════════════════════════════════════════
      // ⚡ KILO AI GATEWAY — 100% FREE, ULTRA-FAST LIQUID/COHERE/QWEN (NO FALLBACK)
      // ═══════════════════════════════════════════════════════════════════
      const targetModel = modelStr.replace(/^kilo\//, '');
      const lastUserMsg = [...conversationHistory].reverse().find(m => m.role === 'user');
      const promptText = typeof lastUserMsg?.content === 'string' ? lastUserMsg.content : JSON.stringify(lastUserMsg?.content || '');

      console.log(`[aiChat Kilo] Direct invocation for ${modelStr} (Strict mode, no fallback)...`);

      try {
        const res = await fetch(`${API_BASE}/api/chat/kilo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: targetModel,
            prompt: promptText,
            messages: conversationHistory,
            stream: !!onChunk
          })
        });

        if (!res.ok) {
          let errDetail = `HTTP ${res.status}: ${res.statusText}`;
          try {
            const data = await res.json();
            if (data.error) errDetail = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
          } catch {
            try {
              const text = await res.text();
              if (text) errDetail = text;
            } catch {}
          }
          const errorMsg = `\n\n❌ [Kilo Error - ${targetModel}]: ${errDetail}`;
          if (onChunk) onChunk(errorMsg);
          return errorMsg;
        }

        if (onChunk && res.body) {
          const sseReply = await handleSSEStream(res, onChunk);
          if (sseReply && sseReply !== 'No response received from the AI model.') {
            return sseReply;
          }
          const emptyMsg = `\n\n❌ [Kilo Error - ${targetModel}]: No response received from Kilo engine.`;
          onChunk(emptyMsg);
          return emptyMsg;
        } else {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content || data.reply || '';
          if (content) {
            if (onChunk) onChunk(content);
            return content;
          }
          const emptyMsg = `\n\n❌ [Kilo Error - ${targetModel}]: Empty response received from Kilo engine.`;
          if (onChunk) onChunk(emptyMsg);
          return emptyMsg;
        }
      } catch (err: any) {
        console.error(`[aiChat Kilo Error]:`, err);
        const netErrorMsg = `\n\n❌ [Kilo Connection Error - ${targetModel}]: ${err.message || 'Failed to connect to /api/chat/kilo'}`;
        if (onChunk) onChunk(netErrorMsg);
        return netErrorMsg;
      }
    } else {
      endpointPath = '/api/chat/completions';
      fetchUrl = `${API_BASE}${endpointPath}`;
    }

    // ── Client-Side 3-Attempt Silent Retry Loop ──
    const maxAttempts = 3;
    let lastResult = '';
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`[aiChat Client] Attempt ${attempt}/${maxAttempts} hitting ${fetchUrl} for ${modelStr}...`);
        
        const reqBody = JSON.stringify({
          messages: conversationHistory,
          model: modelStr,
          provider: model.provider,
          stream: !!onChunk
        });

        const res = await fetch(fetchUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: reqBody
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
        console.warn(`[aiChat Client] Attempt ${attempt}/${maxAttempts} network error:`, err);
      }
      if (attempt < maxAttempts) {
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
