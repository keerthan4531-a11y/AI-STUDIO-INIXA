"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronDown, Sparkles, Cpu, Activity, Terminal } from 'lucide-react';
import { cn } from '../GlassCard';

interface Props {
  thinkingText: string;
  isStreaming: boolean;
}

export function CyberReasoningStream({ thinkingText, isStreaming }: Props) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  if (!thinkingText && !isStreaming) return null;

  // Split thoughts into reasoning steps or bullet lines
  const steps = thinkingText
    ? thinkingText.split('\n').filter(line => line.trim().length > 0)
    : ["Analyzing input context & constraint space...", "Formulating prompt optimization vectors..."];

  return (
    <div className="my-3 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-indigo-950/40 to-purple-950/40 border border-cyan-500/30 p-4 shadow-2xl relative overflow-hidden backdrop-blur-xl group">
      {/* Animated Matrix Background Accent Glow */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-cyan-500/20 transition-all" />

      {/* Header Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <div className={cn(
              "w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-md shadow-cyan-500/20",
              isStreaming && "animate-pulse"
            )}>
              <Brain className="w-4 h-4 text-cyan-400" />
            </div>
            {isStreaming && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-indigo-200 to-purple-300 uppercase">
                AI Deep Reasoning Stream
              </span>
              <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {isStreaming ? 'THINKING IN PROGRESS...' : 'THOUGHT PROCESS READY'}
              </span>
            </div>
            <p className="text-[10px] text-cyan-200/60 font-mono mt-0.5 flex items-center gap-1">
              <Cpu className="w-3 h-3 text-cyan-400" />
              Chain-of-Thought Neural Vector Evaluation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-cyan-400/80 bg-black/40 px-2 py-1 rounded-md border border-cyan-500/20">
            {steps.length} Steps
          </span>
          <ChevronDown className={cn("w-4 h-4 text-cyan-400 transition-transform duration-300", isExpanded && "rotate-180")} />
        </div>
      </div>

      {/* Expanded Reasoning Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3 pt-3 border-t border-cyan-500/20 space-y-2 overflow-hidden"
          >
            {steps.map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-start gap-2 text-xs font-mono text-cyan-100/80 bg-black/30 p-2.5 rounded-xl border border-cyan-500/10 hover:border-cyan-500/30 transition-all"
              >
                <Terminal className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
                <span className="leading-relaxed">{step}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
