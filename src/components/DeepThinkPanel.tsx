"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronRight, ChevronUp, Lightbulb } from 'lucide-react';

interface DeepThinkPanelProps {
  thinkingContent: string;
  isThinking: boolean;
  modelName: string;
}

export function DeepThinkPanel({ thinkingContent, isThinking, modelName }: DeepThinkPanelProps) {
  const [expanded, setExpanded] = useState(isThinking);

  // Auto-collapse when thinking finishes
  React.useEffect(() => {
    if (!isThinking) setExpanded(false);
    else setExpanded(true);
  }, [isThinking]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] overflow-hidden mb-4"
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <motion.div
            animate={isThinking ? { rotate: [0, 360] } : {}}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center"
          >
            <Lightbulb className="w-4 h-4 text-amber-400" />
          </motion.div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-amber-300">
              {isThinking ? 'Thinking...' : 'Thought Process'}
            </span>
            {isThinking && (
              <motion.div className="flex gap-1">
                {[0, 0.15, 0.3].map(d => (
                  <motion.div
                    key={d}
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1, delay: d }}
                    className="w-1 h-1 rounded-full bg-amber-400"
                  />
                ))}
              </motion.div>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-amber-400/50" /> : <ChevronRight className="w-4 h-4 text-amber-400/50" />}
      </button>

      {/* Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 border-t border-amber-500/10">
              <div className="mt-3 text-[13px] leading-relaxed text-white/50 whitespace-pre-wrap font-mono max-h-[300px] overflow-y-auto hide-scrollbar">
                {thinkingContent || (
                  <motion.span
                    animate={{ opacity: [0.3, 0.8, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    Analyzing the query and formulating a comprehensive response...
                  </motion.span>
                )}
                {isThinking && (
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className="inline-block w-[2px] h-[1em] bg-amber-400/80 ml-0.5 align-text-bottom"
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
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
  return deepThinkIds.includes(modelId) || 
    modelId.toLowerCase().includes('deepthink') || 
    modelId.toLowerCase().includes('o1') ||
    modelId.toLowerCase().includes('reasoning') ||
    modelId.toLowerCase().includes('deepseek');
}

