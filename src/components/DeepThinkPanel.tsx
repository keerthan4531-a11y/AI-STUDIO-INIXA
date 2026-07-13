"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Brain } from 'lucide-react';
import { ThinkPanelMeta } from './think/ThinkPanelMeta';
import { ThinkPanelDeepSeek } from './think/ThinkPanelDeepSeek';
import { ThinkPanelNova } from './think/ThinkPanelNova';

interface DeepThinkPanelProps {
  thinkingContent: string;
  isThinking: boolean;
  modelName: string;
}

export function DeepThinkPanel({ thinkingContent, isThinking, modelName }: DeepThinkPanelProps) {
  // Pick a random variant on mount so it doesn't change during re-renders
  const [variant] = React.useState(() => Math.floor(Math.random() * 3));

  switch (variant) {
    case 0:
      return <ThinkPanelDeepSeek thinkingContent={thinkingContent} isThinking={isThinking} />;
    case 1:
      return <ThinkPanelNova thinkingContent={thinkingContent} isThinking={isThinking} modelName={modelName} />;
    case 2:
    default:
      return <ThinkPanelMeta thinkingContent={thinkingContent} isThinking={isThinking} modelName={modelName} />;
  }
}

// Deep Think toggle button for the input area
export function DeepThinkToggle({ 
  enabled, 
  onToggle, 
  visible 
}: { 
  enabled: boolean; 
  onToggle: () => void; 
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onToggle}
      className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all border ${
        enabled
          ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
          : 'bg-white/[0.03] border-white/10 text-white/30 hover:text-white/60 hover:bg-white/[0.06]'
      }`}
    >
      <Brain className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">Deep Think</span>
    </motion.button>
  );
}

// Check if a model supports deep thinking
export function isDeepThinkModel(modelId: string): boolean {
  const deepThinkIds = [
    'llm7-o1-preview',
    'llm7-gemini31-deep',
    'poll-deepseek-v3',
    'llm7-deepseek-v3',
    'puter-glm-51',
    'auto-kimi-k2.5',
    'auto-smart-chat'
  ];
  
  const id = modelId.toLowerCase();
  
  return deepThinkIds.includes(modelId) || 
    id.includes('deepthink') || 
    id.includes('o1') ||
    id.includes('reasoning') ||
    id.includes('deepseek') ||
    id.includes('qwen') ||       // Qwen models always think by default
    id.includes('kimi') ||        // Kimi models think by default
    id.includes('glm') ||         // GLM models think by default
    id.includes('gemma') ||       // Gemma models think by default
    id.includes('thinking') ||    // Any model with "thinking" in name
    id.includes('devstral') ||    // Devstral thinks by default
    id.includes('nemotron');      // Nemotron models think by default
}

