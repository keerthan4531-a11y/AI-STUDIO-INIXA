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
  // 🚀 ONESEARCH BEGAMOB (Zero-Auth Self-Signed JWT — 68 Models)
  // ════════════════════════════════════════════════════════════════

  {
    id: 'onesearch-claude-sonnet-4-5',
    label: 'Claude Sonnet 4.5',
    engine: 'custom',
    modelStr: 'onesearch/claude-sonnet-4.5',
    badge: 'SONNET 4.5',
    badgeColor: 'amber',
    icon: 'Sparkles',
    iconColor: '#f59e0b',
    description: 'Anthropic Claude Sonnet 4.5 next-gen high capability model'
  },
  {
    id: 'onesearch-claude-opus-4-6',
    label: 'Claude Opus 4.6',
    engine: 'custom',
    modelStr: 'onesearch/claude-opus-4.6',
    badge: 'OPUS 4.6',
    badgeColor: 'red',
    icon: 'Brain',
    iconColor: '#ef4444',
    description: 'Anthropic Claude Opus 4.6 maximum capability deep frontier thinker'
  },


  {
    id: 'onesearch-gemini-3-flash',
    label: 'Gemini 3 Flash (OneSearch)',
    engine: 'custom',
    modelStr: 'onesearch/gemini-3-flash',
    badge: 'GEMINI 3',
    badgeColor: 'cyan',
    icon: 'Zap',
    iconColor: '#06b6d4',
    description: 'Google Gemini 3 Flash frontier model with ultra-low latency'
  },
  {
    id: 'onesearch-gemini-3-pro',
    label: 'Gemini 3 Pro (OneSearch)',
    engine: 'custom',
    modelStr: 'onesearch/gemini-3-pro',
    badge: 'GEMINI PRO',
    badgeColor: 'blue',
    icon: 'Brain',
    iconColor: '#2563eb',
    description: 'Google Gemini 3 Pro high capability multimodal reasoning model'
  },



  // ════════════════════════════════════════════════════════════════
  // ⚡ CHATGAI UNLIMITED (Frontier Multi-Model Suite — 100% Free)
  // ════════════════════════════════════════════════════════════════

  {
    id: 'gai-gpt-6-luna',
    label: 'GPT-6 Luna (Frontier)',
    engine: 'custom',
    modelStr: 'gai/GPT:gpt-6-luna',
    badge: 'GPT-6 LUNA',
    badgeColor: 'purple',
    icon: 'Brain',
    iconColor: '#a855f7',
    description: 'GPT-6 Luna — Next-gen reasoning & frontier autonomous coding model'
  },
  {
    id: 'gai-gpt-5-4',
    label: 'GPT-5.4',
    engine: 'custom',
    modelStr: 'gai/GPT:gpt-5.4',
    badge: 'GPT-5.4',
    badgeColor: 'indigo',
    icon: 'Cpu',
    iconColor: '#6366f1',
    description: 'GPT-5.4 advanced agentic system with deep logical precision'
  },
  {
    id: 'gai-gpt-5-2',
    label: 'GPT-5.2',
    engine: 'custom',
    modelStr: 'gai/GPT:gpt-5.2',
    badge: 'GPT-5.2',
    badgeColor: 'blue',
    icon: 'Sparkles',
    iconColor: '#3b82f6',
    description: 'GPT-5.2 refined intelligence and coding model'
  },
  {
    id: 'gai-gpt-5-1',
    label: 'GPT-5.1',
    engine: 'custom',
    modelStr: 'gai/GPT:gpt-5.1',
    badge: 'GPT-5.1',
    badgeColor: 'blue',
    icon: 'Sparkles',
    iconColor: '#3b82f6',
    description: 'GPT-5.1 high-precision logic model'
  },
  {
    id: 'gai-gemini-3-flash',
    label: 'Gemini 3 Flash',
    engine: 'custom',
    modelStr: 'gai/GEMINI:gemini-3-flash-preview',
    badge: 'GEMINI 3',
    badgeColor: 'cyan',
    icon: 'Zap',
    iconColor: '#06b6d4',
    description: 'Google Gemini 3 Flash frontier model with ultra-low latency'
  },
  {
    id: 'gai-gemini-3-1-flash-lite',
    label: 'Gemini 3.1 Flash Lite',
    engine: 'custom',
    modelStr: 'gai/GEMINI:gemini-3.1-flash-lite-preview',
    badge: 'GEMINI 3.1',
    badgeColor: 'sky',
    icon: 'Zap',
    iconColor: '#0284c7',
    description: 'Gemini 3.1 Flash Lite efficient high-speed reasoning'
  },
  {
    id: 'gai-gemini-3-5-flash-lite',
    label: 'Gemini 3.5 Flash Lite',
    engine: 'custom',
    modelStr: 'gai/GEMINI:gemini-3.5-flash-lite',
    badge: 'GEMINI 3.5',
    badgeColor: 'cyan',
    icon: 'Zap',
    iconColor: '#06b6d4',
    description: 'Google Gemini 3.5 Flash Lite next-gen ultra-fast model'
  },
  {
    id: 'gai-gemini-3-pro',
    label: 'Gemini 3.0 Pro',
    engine: 'custom',
    modelStr: 'gai/GEMINI:v3.0-pro',
    badge: 'GEMINI PRO',
    badgeColor: 'blue',
    icon: 'Brain',
    iconColor: '#2563eb',
    description: 'Gemini 3.0 Pro deep thinking and complex multimodal reasoning'
  },

  {
    id: 'gai-deepseek-v4-flash',
    label: 'DeepSeek V4 Flash',
    engine: 'custom',
    modelStr: 'gai/DEEPSEEK_OFFICIAL:deepseek-v4-flash',
    badge: 'DEEPSEEK V4',
    badgeColor: 'emerald',
    icon: 'Zap',
    iconColor: '#10b981',
    description: 'DeepSeek V4 Flash next-gen high-speed frontier model'
  },
  {
    id: 'gai-grok-4',
    label: 'Grok 4 (ChatGai)',
    engine: 'custom',
    modelStr: 'gai/XAI:grok-4',
    badge: 'GROK 4',
    badgeColor: 'amber',
    icon: 'Brain',
    iconColor: '#f59e0b',
    description: 'xAI Grok 4 powerful multi-domain reasoning model'
  },
  {
    id: 'gai-grok-4-fast-reasoning',
    label: 'Grok 4 Fast Reasoning (DeepThink)',
    engine: 'custom',
    modelStr: 'gai/XAI:grok-4-fast-reasoning',
    badge: 'GROK THINK',
    badgeColor: 'orange',
    icon: 'Brain',
    iconColor: '#ea580c',
    description: 'Grok 4 with deep thinking and chain-of-thought reasoning'
  },
  {
    id: 'gai-grok-4-1-reasoning',
    label: 'Grok 4.1 Reasoning',
    engine: 'custom',
    modelStr: 'gai/XAI:grok-4-1-fast-reasoning',
    badge: 'GROK 4.1',
    badgeColor: 'amber',
    icon: 'Brain',
    iconColor: '#f59e0b',
    description: 'xAI Grok 4.1 advanced reasoning variant'
  },
  {
    id: 'gai-claude-haiku-5-5',
    label: 'Claude Haiku 5.5',
    engine: 'custom',
    modelStr: 'gai/BOLATU:claude-haiku-5-5',
    badge: 'HAIKU 5.5',
    badgeColor: 'orange',
    icon: 'Sparkles',
    iconColor: '#f97316',
    description: 'Anthropic Claude Haiku 5.5 responsive high-intelligence assistant'
  },
  {
    id: 'gai-claude-haiku-4-5',
    label: 'Claude Haiku 4.5',
    engine: 'custom',
    modelStr: 'gai/BOLATU:claude-haiku-4-5-20251001',
    badge: 'HAIKU 4.5',
    badgeColor: 'orange',
    icon: 'Sparkles',
    iconColor: '#f97316',
    description: 'Anthropic Claude Haiku 4.5 fast coding model'
  },
  {
    id: 'gai-gemma-4-31b',
    label: 'Gemma 4 31B IT',
    engine: 'custom',
    modelStr: 'gai/OPEN_ROUTER:google/gemma-4-31b-it',
    badge: 'GEMMA 4',
    badgeColor: 'teal',
    icon: 'Cpu',
    iconColor: '#14b8a6',
    description: 'Google Gemma 4 31B instruction-tuned open weights model'
  },
  {
    id: 'gai-mistral-small-creative',
    label: 'Mistral Small Creative',
    engine: 'custom',
    modelStr: 'gai/OPEN_ROUTER:mistral-small-creative',
    badge: 'MISTRAL',
    badgeColor: 'red',
    icon: 'Sparkles',
    iconColor: '#ef4444',
    description: 'Mistral Small tuned for creative writing and storytelling'
  },
  {
    id: 'gai-mistral-nemo',
    label: 'Mistral NeMo 12B',
    engine: 'custom',
    modelStr: 'gai/OPEN_ROUTER:mistralai/mistral-nemo',
    badge: 'NEMO 12B',
    badgeColor: 'rose',
    icon: 'Code',
    iconColor: '#f43f5e',
    description: 'Nvidia + Mistral NeMo 12B high-efficiency coding model'
  },





  // ════════════════════════════════════════════════════════════════
  // 🔥 GPT-6 ASTRA (Next-Gen Flagship — 100% Free, Zero-Auth)
  // ════════════════════════════════════════════════════════════════
  {
    id: 'gpt-6-astra',
    label: 'GPT-6 Astra',
    engine: 'custom',
    modelStr: 'gpt-6-astra',
    badge: '🔥 GPT-6 ASTRA',
    badgeColor: 'violet',
    icon: 'Sparkles',
    iconColor: '#a855f7',
    description: 'GPT-6 Astra — OpenAI Next-Gen Frontier Superintelligence & Deep Reasoning (100% Free, Zero-Auth)'
  },

  // ════════════════════════════════════════════════════════════════
  // 🌟 GPT-5.6 LUNA (OpenAI Proxy)
  // ════════════════════════════════════════════════════════════════
  {
    id: 'gpt-6-luna',
    label: 'GPT-6 Luna',
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
  // ⚡ SHARKTIDE LIGHTNING (Zero-Auth High-Speed Frontier Models)
  // ════════════════════════════════════════════════════════════════
  {
    id: 'lightning',
    label: 'Lightning Flash (GPT-OSS 20B)',
    engine: 'custom',
    modelStr: 'lightning',
    badge: 'LIGHTNING',
    badgeColor: 'amber',
    icon: 'Zap',
    iconColor: '#f59e0b',
    description: 'Lightning Flash — Ultra-fast 1s frontier model (100% Free, Zero Auth)'
  },
  {
    id: 'lightning-text-v2.1',
    label: 'Lightning 2.1 (Qwen 3.8 27B)',
    engine: 'custom',
    modelStr: 'lightning-text-v2.1',
    badge: 'QWEN 3.8',
    badgeColor: 'blue',
    icon: 'Sparkles',
    iconColor: '#3b82f6',
    description: 'Lightning 2.1 — Qwen 3.8 27B high-speed reasoning intelligence (100% Free, Zero Auth)'
  },

  // ════════════════════════════════════════════════════════════════
  // ⚡ LLM7 FRONTIER MODELS (Strict Verified Free Models)
  // ════════════════════════════════════════════════════════════════
  {
    id: 'codestral-latest',
    label: 'Codestral Latest (Mistral AI)',
    engine: 'custom',
    modelStr: 'codestral-latest',
    badge: 'FAST 1s',
    badgeColor: 'emerald',
    icon: 'Zap',
    iconColor: '#10b981',
    description: 'Codestral Latest — Ultra-fast Mistral coding model (~1s latency, 100% Free)'
  },
  {
    id: 'mistral-Nemo-Instruct-2407',
    label: 'Mistral Nemo 12B (Mistral AI)',
    engine: 'custom',
    modelStr: 'mistral-Nemo-Instruct-2407',
    badge: 'MISTRAL',
    badgeColor: 'blue',
    icon: 'Sparkles',
    iconColor: '#3b82f6',
    description: 'Mistral Nemo 12B — State-of-the-art multilingual reasoning model (100% Free)'
  },
  {
    id: 'DeepSeek-V4-Flash-0731',
    label: 'DeepSeek V4 Flash (0731)',
    engine: 'custom',
    modelStr: 'DeepSeek-V4-Flash-0731',
    badge: 'DEEPSEEK',
    badgeColor: 'cyan',
    icon: 'Sparkles',
    iconColor: '#06b6d4',
    description: 'DeepSeek V4 Flash — High-efficiency frontier reasoning chat model (100% Free)'
  },
  {
    id: 'minimax-m2.7',
    label: 'MiniMax M2.7',
    engine: 'custom',
    modelStr: 'minimax-m2.7',
    badge: 'MINIMAX',
    badgeColor: 'violet',
    icon: 'Brain',
    iconColor: '#8b5cf6',
    description: 'MiniMax M2.7 — Advanced language & dialogue generation model (100% Free)'
  },
  {
    id: 'GLM-5.3-Flash',
    label: 'GLM 5.3 Flash (Zhipu AI)',
    engine: 'custom',
    modelStr: 'GLM-5.3-Flash',
    badge: 'GLM 5.3',
    badgeColor: 'amber',
    icon: 'Sparkles',
    iconColor: '#f59e0b',
    description: 'GLM 5.3 Flash — Zhipu high-speed reasoning & bilingual intelligence (100% Free)'
  },

  // ════════════════════════════════════════════════════════════════
  // ⚡ KILO GATEWAY FREE MODELS (Zero-Auth Multi-Model Gateway)
  // ════════════════════════════════════════════════════════════════
  {
    id: 'kilo-auto-free',
    label: 'Kilo Auto Router (Free Pool)',
    engine: 'custom',
    modelStr: 'kilo/kilo-auto/free',
    badge: 'AUTO FREE',
    badgeColor: 'emerald',
    icon: 'Sparkles',
    iconColor: '#10b981',
    description: 'Kilo Auto Router — Automatically routes to the fastest active free model'
  },
  {
    id: 'kilo-nemotron-3-ultra',
    label: 'Nemotron 3 Ultra 550B (NVIDIA)',
    engine: 'custom',
    modelStr: 'kilo/nvidia/nemotron-3-ultra-550b-a55b:free',
    badge: 'NVIDIA 550B',
    badgeColor: 'emerald',
    icon: 'Zap',
    iconColor: '#10b981',
    description: 'NVIDIA Nemotron 3 Ultra 550B — Massive scale frontier enterprise intelligence (100% Free)'
  },
  {
    id: 'kilo-nemotron-3.5-lightning',
    label: 'Nemotron 3.5 Lightning (NVIDIA)',
    engine: 'custom',
    modelStr: 'kilo/nvidia/nemotron-3.5-lightning:free',
    badge: 'LIGHTNING',
    badgeColor: 'amber',
    icon: 'Zap',
    iconColor: '#f59e0b',
    description: 'NVIDIA Nemotron 3.5 Lightning — High-speed low-latency reasoning model (100% Free)'
  },
  {
    id: 'kilo-cohere-north-mini-code',
    label: 'North Mini Code (Cohere)',
    engine: 'custom',
    modelStr: 'kilo/cohere/north-mini-code:free',
    badge: 'COHERE CODE',
    badgeColor: 'blue',
    icon: 'Sparkles',
    iconColor: '#3b82f6',
    description: 'Cohere North Mini Code — Specialized code generation and engineering model (100% Free)'
  },
  {
    id: 'kilo-ernie-5.5-flash',
    label: 'ERNIE 5.5 Flash (Baidu)',
    engine: 'custom',
    modelStr: 'kilo/baidu/ernie-5.5-flash-preview:free',
    badge: 'ERNIE 5.5',
    badgeColor: 'blue',
    icon: 'Zap',
    iconColor: '#3b82f6',
    description: 'Baidu ERNIE 5.5 Flash Preview — Ultra-fast frontier reasoning & Chinese/English bilingual mastery (100% Free)'
  },
  {
    id: 'kilo-liquid-lfm-3',
    label: 'LFM 3 1.7B (Liquid AI)',
    engine: 'custom',
    modelStr: 'kilo/liquid/lfm-3-1.7b:free',
    badge: 'LIQUID LFM3',
    badgeColor: 'violet',
    icon: 'Brain',
    iconColor: '#8b5cf6',
    description: 'Liquid Neural Network (LFM 3) — Next-gen dynamic adaptive neural architecture (100% Free)'
  },
  {
    id: 'kilo-nemotron-3.5-super-vl',
    label: 'Nemotron 3.5 Super VL (NVIDIA)',
    engine: 'custom',
    modelStr: 'kilo/nvidia/nemotron-3.5-super-vl:free',
    badge: 'VISION 3.5',
    badgeColor: 'emerald',
    icon: 'Zap',
    iconColor: '#10b981',
    description: 'NVIDIA Nemotron 3.5 Super Vision-Language — Frontier multimodal reasoning & visual comprehension (100% Free)'
  },
  {
    id: 'kilo-nemotron-3-nano-reasoning',
    label: 'Nemotron 3 Nano Reasoning (NVIDIA)',
    engine: 'custom',
    modelStr: 'kilo/nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
    badge: 'REASONING',
    badgeColor: 'violet',
    icon: 'Brain',
    iconColor: '#8b5cf6',
    description: 'NVIDIA Nemotron 3 Nano Omni 30B — Specialized reasoning & chain-of-thought model (100% Free)'
  },
  {
    id: 'kilo-dots-3-note-preview',
    label: 'Dots 3 Note Preview (512K)',
    engine: 'custom',
    modelStr: 'kilo/dots-studio/dots-3-note-preview:free',
    badge: 'DOTS 512K',
    badgeColor: 'violet',
    icon: 'Brain',
    iconColor: '#8b5cf6',
    description: 'Dots 3 Note Preview — Massive 512K long-context note & reasoning model via Kilo Gateway (100% Free, Zero Auth)'
  },
  {
    id: 'kilo-openrouter-free',
    label: 'OpenRouter Free Router (200K)',
    engine: 'custom',
    modelStr: 'kilo/openrouter/free',
    badge: 'OPENROUTER',
    badgeColor: 'blue',
    icon: 'Sparkles',
    iconColor: '#3b82f6',
    description: 'OpenRouter Free Models Router — Intelligently routes across available high-quality free models (200K context)'
  },
  {
    id: 'kilo-stealth-glyph-cluster',
    label: 'Glyph Cluster (Stealth Model)',
    engine: 'custom',
    modelStr: 'kilo/stealth/glyph-cluster',
    badge: 'STEALTH',
    badgeColor: 'violet',
    icon: 'Brain',
    iconColor: '#8b5cf6',
    description: 'Glyph Cluster Stealth Model — High-precision reasoning & context synthesis (256K context, 100% Free)'
  },
  {
    id: 'kilo-reflection-beam-free',
    label: 'Beam 1.0 Reflection (1M)',
    engine: 'custom',
    modelStr: 'kilo/reflection/beam-free',
    badge: 'BEAM 1M',
    badgeColor: 'emerald',
    icon: 'Sparkles',
    iconColor: '#10b981',
    description: 'Reflection Beam 1.0 Free — Deep reflective chain-of-thought with massive 1M context window'
  },
  {
    id: 'kilo-nemotron-3.5-lightning-free',
    label: 'Nemotron 3.5 Lightning (Dedicated Free)',
    engine: 'custom',
    modelStr: 'kilo/nvidia/nemotron-3.5-lightning-free',
    badge: 'LIGHTNING 1M',
    badgeColor: 'amber',
    icon: 'Zap',
    iconColor: '#f59e0b',
    description: 'NVIDIA Nemotron 3.5 Lightning Alternate Dedicated Free Endpoint — 1M context high-speed reasoning'
  },

  // ════════════════════════════════════════════════════════════════
  // ⚡ GROK 4.6 (xAI Frontier Reasoning — Powered by ChatX Engine)
  // ════════════════════════════════════════════════════════════════
  {
    id: 'grok-4.6',
    label: 'Grok 4.6 (xAI)',
    engine: 'custom',
    modelStr: 'grok-4.6',
    provider: 'chatx',
    badge: 'GROK 4.6',
    badgeColor: 'blue',
    icon: 'Sparkles',
    iconColor: '#3b82f6',
    description: 'Grok 4.6 — xAI Frontier Thinking & Ultra-High Speed Reasoning (100% Free, Zero-Auth)'
  },
  {
    id: 'grok-4.6-thinking',
    label: 'Grok 4.6 Thinking (xAI)',
    engine: 'custom',
    modelStr: 'grok-4.6-thinking',
    provider: 'chatx',
    badge: 'THINKING',
    badgeColor: 'violet',
    icon: 'Brain',
    iconColor: '#8b5cf6',
    description: 'Grok 4.6 Deep Reasoning & Complex Cognitive Problem Solving (100% Free, Zero-Auth)'
  },

  // ════════════════════════════════════════════════════════════════
  // 🌊 POOLSIDE AI MODELS (Laguna 2.1 Frontier Reasoning)
  // ════════════════════════════════════════════════════════════════
  {
    id: 'poolside-laguna-s-2.1',
    label: 'Laguna S 2.1 (Poolside)',
    engine: 'custom',
    modelStr: 'poolside/laguna-s-2.1',
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
    modelStr: 'poolside/laguna-s-2.1-thinking',
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
    modelStr: 'spacebunny/alpha',
    badge: 'TOP-CLASS',
    badgeColor: 'pink',
    icon: 'Sparkles',
    iconColor: '#ec4899',
    description: 'Space Bunny Alpha — Stealth Frontier Reasoning Model with Chain-of-Thought (100% Free)'
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


  // ════════════════════════════════════════════════════════════════
  // 🟢 META AI
  // ════════════════════════════════════════════════════════════════

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




];


// Default to GPT-6 Astra
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
  return AI_MODELS.find(m => m.id === 'gpt-6-astra') || AI_MODELS[0];
};

export const setSelectedModel = (id: string) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('inixa_ai_model', id);
    } catch (e) { }
  }
};

// ΓöÇΓöÇΓöÇ Image Generation (Pollinations ΓÇö Free, no key) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
export type ImageModelType = 'muse-image' | 'agnes-image' | 'flux' | 'flux-realism' | 'any-dark' | 'flux-anime' | 'flux-3d' | 'turbo-v';

export const IMAGE_MODELS: { id: ImageModelType; label: string }[] = [
  { id: 'muse-image', label: 'Muse Image (Agentic Synthesis)' },
  { id: 'agnes-image', label: 'Agnes Image 2.5 Flash (HD 8K)' },
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
            parsed.data?.answer ||
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
    } else if (model.provider === 'chatx' || modelStr.startsWith('chatx/') || modelStr.toLowerCase().includes('grok')) {
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
            } catch { }
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
    } else if (model.id === 'gpt-6-astra' || modelStr === 'gpt-6-astra' || modelStr === 'gpt-6' || modelStr.startsWith('gpt-6-astra')) {
      // ═══════════════════════════════════════════════════════════════════
      // 🔥 GPT-6 ASTRA — FRONTIER SUPERINTELLIGENCE (MULTI-ROUTE FALLBACK)
      // ═══════════════════════════════════════════════════════════════════
      const lastUserMsg = [...conversationHistory].reverse().find(m => m.role === 'user');
      const promptText = typeof lastUserMsg?.content === 'string' ? lastUserMsg.content : JSON.stringify(lastUserMsg?.content || '');

      console.log(`[aiChat GPT-6 Astra] Direct invocation for ${modelStr}...`);

      const primaryEndpoint = `${API_BASE}/api/chat/gpt6`;
      const fallbackEndpoint = `${API_BASE}/api/gpt6`;

      try {
        let res = await fetch(primaryEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: promptText,
            messages: conversationHistory,
            stream: !!onChunk
          })
        });

        if (!res.ok && (res.status === 401 || res.status === 404)) {
          console.warn(`[aiChat GPT-6 Astra] ${primaryEndpoint} returned ${res.status}. Trying fallback: ${fallbackEndpoint}...`);
          res = await fetch(fallbackEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: promptText,
              messages: conversationHistory,
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
            } catch { }
          }
          const errorMsg = `\n\n❌ [GPT-6 Astra Error]: ${errDetail}`;
          if (onChunk) onChunk(errorMsg);
          return errorMsg;
        }

        if (onChunk && res.body) {
          const sseReply = await handleSSEStream(res, onChunk);
          if (sseReply && sseReply !== 'No response received from the AI model.') {
            return sseReply;
          }
          const emptyMsg = `\n\n❌ [GPT-6 Astra Error]: No response received from GPT-6 Astra engine.`;
          onChunk(emptyMsg);
          return emptyMsg;
        } else {
          const data = await res.json();
          const content = data.reply || data.choices?.[0]?.message?.content || '';
          if (content) {
            if (onChunk) onChunk(content);
            return content;
          }
          const emptyMsg = `\n\n❌ [GPT-6 Astra Error]: Empty response received from engine.`;
          if (onChunk) onChunk(emptyMsg);
          return emptyMsg;
        }
      } catch (err: any) {
        console.error(`[aiChat GPT-6 Astra Error]:`, err);
        const netErrorMsg = `\n\n❌ [GPT-6 Astra Connection Error]: ${err.message || 'Failed to connect to GPT-6 endpoint'}`;
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

      const primaryEndpoint = `${API_BASE}/api/chat/perplexity`;
      const fallbackEndpoint = `${API_BASE}/api/pplx`;

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
            } catch { }
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
            } catch { }
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
        } else {
          try {
            const errData = await res.json();
            const errMsg = errData.reply || errData.error || `HTTP ${res.status}`;
            console.error(`[aiChat Client] Server returned error:`, errMsg);
            return typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg);
          } catch {
            const textErr = await res.text().catch(() => '');
            return `⚠️ Error: Server returned HTTP ${res.status} ${textErr ? `(${textErr.slice(0, 150)})` : ''}`;
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
