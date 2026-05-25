"use client";
import React from 'react';
import { Calculator, CheckCircle2, Info, ChevronRight, Hash } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface GivenValue {
  label: string;
  value: string;
}

interface step {
  title: string;
  description?: string;
  formula?: string;
  note?: string;
}

interface MathSolverAgentProps {
  title: string;
  given: GivenValue[];
  steps: step[];
  finalResult?: {
    label: string;
    value: string;
  };
}

export function MathSolverAgent({ title, given, steps, finalResult }: MathSolverAgentProps) {
  return (
    <div className="w-full min-w-0 my-6 space-y-6 animate-in fade-in zoom-in duration-500 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-1">
        <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 shadow-lg shadow-blue-500/5">
          <Calculator className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-black tracking-tight text-white/90">{title}</h2>
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/30">Step-by-Step Solver</p>
        </div>
      </div>

      {/* Given Values Grid */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 px-1 flex items-center gap-2">
          <Info className="w-3 h-3" /> Given Values
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {given.map((item, idx) => (
            <div key={idx} className="bg-white/[0.03] border border-white/[0.06] rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xl backdrop-blur-sm group hover:border-white/10 transition-colors w-full min-w-0 overflow-hidden">
              <p className="text-[9px] sm:text-[10px] font-bold text-white/30 uppercase tracking-widest mb-0.5 sm:mb-1 group-hover:text-white/40 transition-colors truncate">{item.label}</p>
              <p className="text-base sm:text-xl font-black text-white/90 tabular-nums overflow-x-auto hide-scrollbar pb-0.5">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 px-1 flex items-center gap-2">
          <Hash className="w-3 h-3" /> Step-by-Step Solution
        </h3>
        <div className="space-y-4 relative before:absolute before:left-[15px] sm:before:left-[19px] before:top-4 before:bottom-4 before:w-[2px] before:bg-gradient-to-b before:from-blue-500/50 before:via-purple-500/50 before:to-transparent">
          {steps.map((step, idx) => (
            <div key={idx} className="relative pl-10 sm:pl-12 group w-full">
              {/* Step Number Circle */}
              <div className="absolute left-0 top-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#111] border-2 border-white/10 flex items-center justify-center z-10 group-hover:border-blue-500/50 transition-all shadow-xl shadow-black/50 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="text-xs sm:text-sm font-black text-white/50 group-hover:text-blue-400 transition-colors">{idx + 1}</span>
              </div>

              <div className="space-y-2 w-full min-w-0">
                <h4 className="text-[14px] sm:text-[15px] font-bold text-white/90 flex items-start gap-2 break-words whitespace-normal leading-snug pr-2">
                   {step.title}
                </h4>
                {step.description && (
                  <p className="text-[12px] sm:text-[13px] text-white/50 leading-relaxed break-words whitespace-normal w-full pr-2">
                    {step.description}
                  </p>
                )}
                {step.formula && (
                  <div className="bg-[#0a0a0b] border border-white/[0.08] rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-2xl overflow-x-auto my-3 relative group/formula w-full">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500/50 rounded-l-full" />
                    <div className="markdown-content w-full min-w-0">
                      <ReactMarkdown 
                        remarkPlugins={[remarkMath]} 
                        rehypePlugins={[rehypeKatex]}
                      >
                        {step.formula.startsWith('$$') ? step.formula : `$$ ${step.formula} $$`}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
                {step.note && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/5 border border-amber-500/10 text-[10px] sm:text-[11px] font-medium text-amber-200/60 italic break-words whitespace-normal max-w-full">
                    <ChevronRight className="w-3 h-3 flex-shrink-0" /> <span className="truncate sm:whitespace-normal">{step.note}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Final Result Card */}
      {finalResult && (
        <div className="relative mt-8 group w-full">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/30 to-blue-500/30 rounded-[1.5rem] sm:rounded-[2rem] blur opacity-50 group-hover:opacity-75 transition duration-1000 group-hover:duration-200" />
          <div className="relative bg-[#0d1511] border border-emerald-500/20 rounded-[1.25rem] sm:rounded-[1.75rem] p-5 sm:p-8 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 overflow-hidden w-full">
             <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 sm:w-64 sm:h-64 bg-emerald-500/5 rounded-full blur-3xl" />
             
             <div className="space-y-2 text-center sm:text-left z-10 w-full min-w-0">
                <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-emerald-400/70 truncate">{finalResult.label}</p>
                <div className="text-xl sm:text-3xl font-black text-emerald-50/90 tracking-tight tabular-nums w-full overflow-x-auto hide-scrollbar pb-2">
                   <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {finalResult.value.includes('$') ? finalResult.value : `$$ ${finalResult.value} $$`}
                   </ReactMarkdown>
                </div>
             </div>
             
             <div className="flex-shrink-0 z-10">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-lg shadow-emerald-500/5 animate-pulse">
                   <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-400" />
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

