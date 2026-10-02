"use client";
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Copy, Check, Swords, Bot, Sparkles } from 'lucide-react';

interface ArenaBattleCardProps {
  contentA: string;
  contentB: string;
}

export function parseArenaBattle(text: string): { isBattle: boolean; header: string; modelA: string; modelB: string } {
  if (!text.includes('LMSYS Chatbot Arena') && !text.includes('Assistant A') && !text.includes('Frontier Battle')) {
    return { isBattle: false, header: '', modelA: '', modelB: '' };
  }

  // Check if text has Assistant A and Assistant B markers
  const markerA = text.indexOf('#### 🤖 Assistant A');
  const markerB = text.indexOf('#### 🤖 Assistant B');

  if (markerA === -1 && markerB === -1) {
    return { isBattle: false, header: '', modelA: '', modelB: '' };
  }

  let header = '⚔️ Arena AI — Frontier Model Battle';
  let modelA = '';
  let modelB = '';

  if (markerA !== -1) {
    const afterA = text.slice(markerA + '#### 🤖 Assistant A (Frontier Model)'.length);
    if (markerB !== -1) {
      // Both markers present
      modelA = text.slice(markerA, markerB).replace(/#### 🤖 Assistant A[^\n]*\n?/, '').replace(/---\s*$/, '').trim();
      modelB = text.slice(markerB).replace(/#### 🤖 Assistant B[^\n]*\n?/, '').trim();
    } else {
      // Only A streamed so far
      modelA = afterA.replace(/---\s*$/, '').trim();
    }
  } else if (markerB !== -1) {
    modelB = text.slice(markerB).replace(/#### 🤖 Assistant B[^\n]*\n?/, '').trim();
  }

  return {
    isBattle: true,
    header,
    modelA,
    modelB
  };
}

export function ArenaBattleCard({ contentA, contentB }: ArenaBattleCardProps) {
  const [copiedA, setCopiedA] = useState(false);
  const [copiedB, setCopiedB] = useState(false);

  const copyText = (text: string, isA: boolean) => {
    navigator.clipboard.writeText(text);
    if (isA) {
      setCopiedA(true);
      setTimeout(() => setCopiedA(false), 2000);
    } else {
      setCopiedB(true);
      setTimeout(() => setCopiedB(false), 2000);
    }
  };

  return (
    <div className="w-full my-6 flex flex-col gap-4">
      {/* Banner Header */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-blue-500/10 border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Swords className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-[13px] font-bold text-white tracking-wide flex items-center gap-2">
              Arena AI Dual Battle
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Frontier Blind Test
              </span>
            </h4>
            <p className="text-[11px] text-white/50">
              Evaluated simultaneously against two mystery frontier models
            </p>
          </div>
        </div>
      </div>

      {/* Dual Side-by-Side Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Model A Card */}
        <div className="flex flex-col rounded-2xl bg-white/[0.03] border border-amber-500/20 shadow-xl overflow-hidden backdrop-blur-sm transition-all duration-300 hover:border-amber-500/40">
          <div className="flex items-center justify-between px-4 py-3 bg-amber-500/5 border-b border-amber-500/10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-amber-300 tracking-wide">
                Assistant A
              </span>
              <span className="text-[10px] text-white/40 font-mono">
                (Frontier Model)
              </span>
            </div>
            {contentA && (
              <button
                onClick={() => copyText(contentA, true)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all text-xs flex items-center gap-1"
                title="Copy Assistant A Response"
              >
                {copiedA ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
          <div className="p-4 sm:p-5 text-[14px] leading-relaxed text-white/85 min-h-[100px]">
            {contentA ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  p: ({ children }) => <p className="mb-2.5 last:mb-0">{children}</p>,
                  code: ({ children, ...props }: any) => (
                    <code className="bg-white/10 px-1.5 py-0.5 rounded text-amber-200 font-mono text-[13px]" {...props}>
                      {children}
                    </code>
                  )
                }}
              >
                {contentA}
              </ReactMarkdown>
            ) : (
              <div className="flex items-center gap-2 text-white/40 text-xs italic py-4 animate-pulse">
                <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                Assistant A is evaluating...
              </div>
            )}
          </div>
        </div>

        {/* Model B Card */}
        <div className="flex flex-col rounded-2xl bg-white/[0.03] border border-blue-500/20 shadow-xl overflow-hidden backdrop-blur-sm transition-all duration-300 hover:border-blue-500/40">
          <div className="flex items-center justify-between px-4 py-3 bg-blue-500/5 border-b border-blue-500/10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-blue-300 tracking-wide">
                Assistant B
              </span>
              <span className="text-[10px] text-white/40 font-mono">
                (Frontier Model)
              </span>
            </div>
            {contentB && (
              <button
                onClick={() => copyText(contentB, false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all text-xs flex items-center gap-1"
                title="Copy Assistant B Response"
              >
                {copiedB ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
          <div className="p-4 sm:p-5 text-[14px] leading-relaxed text-white/85 min-h-[100px]">
            {contentB ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  p: ({ children }) => <p className="mb-2.5 last:mb-0">{children}</p>,
                  code: ({ children, ...props }: any) => (
                    <code className="bg-white/10 px-1.5 py-0.5 rounded text-blue-200 font-mono text-[13px]" {...props}>
                      {children}
                    </code>
                  )
                }}
              >
                {contentB}
              </ReactMarkdown>
            ) : (
              <div className="flex items-center gap-2 text-white/40 text-xs italic py-4 animate-pulse">
                <Sparkles className="w-4 h-4 text-blue-400 animate-spin" />
                Assistant B is preparing evaluation...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
