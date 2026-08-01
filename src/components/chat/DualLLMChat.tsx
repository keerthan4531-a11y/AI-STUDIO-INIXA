"use client";
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, ChevronDown, Trophy, Timer, Zap, ThumbsUp, Equal, Send, Crown, ArrowUp } from 'lucide-react';
import { cn } from '../GlassCard';
import { InixaLogo } from '../Logos';
import { MessageContent } from '../MessageContent';
import { aiChat, AI_MODELS, getSelectedModel, type AIModel } from '../../api/aiEngine';
import { vibrate } from '../../utils/helpers';

interface BattleRound {
  prompt: string;
  responseA: string;
  responseB: string;
  modelA: AIModel;
  modelB: AIModel;
  timeA: number;
  timeB: number;
  winner?: 'a' | 'b' | 'tie' | null;
}

// ─── Model Picker ─────────────────────────────────────────────────
function ModelPicker({ model, onSelect, side }: { model: AIModel; onSelect: (m: AIModel) => void; side: 'a' | 'b' }) {
  const [open, setOpen] = useState(false);
  const isA = side === 'a';
  const accent = isA ? 'blue' : 'violet';

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(!open); vibrate(15); }}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold transition-all ring-1",
          isA
            ? "bg-blue-500/[0.07] ring-blue-500/15 text-blue-300 hover:bg-blue-500/[0.12]"
            : "bg-violet-500/[0.07] ring-violet-500/15 text-violet-300 hover:bg-violet-500/[0.12]"
        )}
      >
        <div className={cn("w-4 h-4 rounded-md flex items-center justify-center text-[8px] font-black",
          isA ? "bg-blue-500/20 text-blue-400" : "bg-violet-500/20 text-violet-400"
        )}>{isA ? 'A' : 'B'}</div>
        <span className="truncate max-w-[120px] sm:max-w-[160px]">{model.label}</span>
        <ChevronDown className="w-3 h-3 shrink-0 opacity-40" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-[90]" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full mt-1.5 left-0 w-[260px] max-h-[320px] overflow-y-auto bg-[#111218] ring-1 ring-white/[0.08] rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.6)] z-[100] hide-scrollbar backdrop-blur-xl"
            >
              <div className="sticky top-0 px-3 py-2 bg-[#111218]/90 backdrop-blur-sm border-b border-white/[0.04]">
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20">Select Model {side.toUpperCase()}</span>
              </div>
              {AI_MODELS.map(m => (
                <button
                  key={m.id}
                  onClick={() => { onSelect(m); setOpen(false); vibrate(10); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors border-b border-white/[0.02] last:border-0",
                    m.id === model.id
                      ? (isA ? "bg-blue-500/10 text-blue-300" : "bg-violet-500/10 text-violet-300")
                      : "text-white/50 hover:bg-white/[0.03] hover:text-white/70"
                  )}
                >
                  <span className="text-[11px] font-semibold truncate flex-1">{m.label}</span>
                  {m.badge && (
                    <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded-md bg-white/[0.04] text-white/25 ring-1 ring-white/[0.04]">{m.badge}</span>
                  )}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Response Card ────────────────────────────────────────────────
function ResponseCard({ content, model, time, side, isWinner, isStreaming }: {
  content: string; model: AIModel; time: number; side: 'a' | 'b'; isWinner: boolean; isStreaming: boolean;
}) {
  const isA = side === 'a';
  return (
    <div className={cn(
      "rounded-2xl overflow-hidden transition-all ring-1",
      isWinner ? "ring-emerald-500/25 shadow-[0_0_24px_rgba(16,185,129,0.06)]" : "ring-white/[0.05]",
    )}>
      {/* Card Header */}
      <div className={cn(
        "flex items-center justify-between px-3.5 py-2.5 border-b",
        isA ? "bg-blue-500/[0.04] border-blue-500/[0.06]" : "bg-violet-500/[0.04] border-violet-500/[0.06]"
      )}>
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black",
            isA ? "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/20" : "bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/20"
          )}>
            {isA ? 'A' : 'B'}
          </div>
          <div>
            <span className={cn("text-[10px] font-bold", isA ? "text-blue-300/80" : "text-violet-300/80")}>{model.label}</span>
            {model.badge && <span className="ml-1.5 text-[7px] font-black text-white/15 uppercase">{model.badge}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isWinner && <Crown className="w-3 h-3 text-amber-400" />}
          {time > 0 && (
            <div className="flex items-center gap-1 text-[9px] text-white/20 font-mono">
              <Timer className="w-3 h-3" />
              {(time / 1000).toFixed(1)}s
            </div>
          )}
          {isStreaming && <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isA ? "bg-blue-400" : "bg-violet-400")} />}
        </div>
      </div>
      {/* Card Body */}
      <div className="p-4 bg-[#0a0b10] min-h-[80px] max-h-[450px] overflow-y-auto hide-scrollbar">
        {content ? (
          <div className="text-[13px]">
            <MessageContent content={content} isCodex={false} onOpenArtifact={() => {}} />
            {isStreaming && <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.5, repeat: Infinity }} className={cn("inline-block w-[2px] h-4 ml-0.5", isA ? "bg-blue-400" : "bg-violet-400")} />}
          </div>
        ) : (
          <div className="flex items-center gap-2 py-4 justify-center">
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div key={i} className={cn("w-1.5 h-1.5 rounded-full animate-bounce", isA ? "bg-blue-400/40" : "bg-violet-400/40")} style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
            <span className="text-[10px] text-white/15 font-medium">Thinking...</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────
export function DualLLMChat({ currentModel, setShowModelSelector }: { currentModel: AIModel; setShowModelSelector: (v: boolean) => void }) {
  const [modelA, setModelA] = useState<AIModel>(AI_MODELS[0]);
  const [modelB, setModelB] = useState<AIModel>(AI_MODELS.length > 1 ? AI_MODELS[1] : AI_MODELS[0]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamA, setStreamA] = useState('');
  const [streamB, setStreamB] = useState('');
  const [doneA, setDoneA] = useState(false);
  const [doneB, setDoneB] = useState(false);
  const [rounds, setRounds] = useState<BattleRound[]>([]);
  const [mobileTab, setMobileTab] = useState<'a' | 'b'>('a');
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [rounds, streamA, streamB]);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [input]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    vibrate(30);
    setInput('');
    setLoading(true);
    setStreamA(''); setStreamB('');
    setDoneA(false); setDoneB(false);

    const msgs = [{ role: 'user', content: text }];
    const startTime = Date.now();
    let resultA = '', resultB = '';
    let timeA = 0, timeB = 0;

    const pA = aiChat(msgs, (chunk) => {
      setStreamA(chunk.replace(/<think>[\s\S]*?<\/think>/g, '').trimStart());
    }, modelA).then(r => { resultA = r.replace(/<think>[\s\S]*?<\/think>/g, '').trim(); timeA = Date.now() - startTime; setDoneA(true); }).catch(() => { resultA = '⚠️ Error'; timeA = Date.now() - startTime; setDoneA(true); });

    const pB = aiChat(msgs, (chunk) => {
      setStreamB(chunk.replace(/<think>[\s\S]*?<\/think>/g, '').trimStart());
    }, modelB).then(r => { resultB = r.replace(/<think>[\s\S]*?<\/think>/g, '').trim(); timeB = Date.now() - startTime; setDoneB(true); }).catch(() => { resultB = '⚠️ Error'; timeB = Date.now() - startTime; setDoneB(true); });

    await Promise.allSettled([pA, pB]);
    setRounds(prev => [...prev, { prompt: text, responseA: resultA, responseB: resultB, modelA, modelB, timeA, timeB, winner: null }]);
    setStreamA(''); setStreamB('');
    setLoading(false);
  };

  const vote = (ri: number, w: 'a' | 'b' | 'tie') => {
    vibrate(40);
    if (w === 'a') setScoreA(s => s + 1);
    else if (w === 'b') setScoreB(s => s + 1);
    setRounds(prev => prev.map((r, i) => i === ri ? { ...r, winner: w } : r));
  };

  const isLanding = rounds.length === 0 && !loading;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 sm:px-6 py-3.5 border-b border-white/[0.04] bg-[#08090f]/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500/15 to-red-500/15 ring-1 ring-orange-500/15 flex items-center justify-center">
                <Swords className="w-4 h-4 text-orange-400/80" />
              </div>
              <div>
                <h2 className="text-[13px] font-bold text-white/80 tracking-tight">Arena</h2>
                <p className="text-[9px] text-white/20 font-medium">Compare models side-by-side</p>
              </div>
              {(scoreA > 0 || scoreB > 0) && (
                <div className="flex items-center gap-2 ml-3 px-2.5 py-1 rounded-lg bg-white/[0.03] ring-1 ring-white/[0.04]">
                  <span className="text-[9px] font-bold text-blue-300">{scoreA}</span>
                  <span className="text-[8px] text-white/15">—</span>
                  <span className="text-[9px] font-bold text-violet-300">{scoreB}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <ModelPicker model={modelA} onSelect={setModelA} side="a" />
              <div className="w-6 h-6 rounded-full bg-white/[0.03] ring-1 ring-white/[0.05] flex items-center justify-center">
                <span className="text-[8px] font-black text-white/15">VS</span>
              </div>
              <ModelPicker model={modelB} onSelect={setModelB} side="b" />
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto hide-scrollbar px-4 sm:px-6 py-6">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Landing */}
          {isLanding && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center text-center py-20 space-y-5">
              <div className="relative">
                <div className="w-20 h-20 rounded-[22px] bg-gradient-to-br from-orange-500/8 to-red-600/8 ring-1 ring-white/[0.04] flex items-center justify-center">
                  <Swords className="w-9 h-9 text-orange-400/40" />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-indigo-500/20 ring-1 ring-indigo-500/30 flex items-center justify-center">
                  <Zap className="w-3 h-3 text-indigo-400" />
                </div>
              </div>
              <h2 className="text-3xl sm:text-4xl font-serif font-medium text-white/70 tracking-tight">Battle Arena</h2>
              <p className="text-[13px] text-white/25 max-w-md leading-relaxed">Pick two models above and send a prompt. Both will respond simultaneously — then you decide the winner.</p>
              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                {['Write a poem about space', 'Explain recursion simply', 'Build a React counter'].map((s, i) => (
                  <button key={i} onClick={() => setInput(s)} className="px-3.5 py-2 text-[11px] font-medium text-white/25 bg-white/[0.02] ring-1 ring-white/[0.04] rounded-xl hover:bg-white/[0.05] hover:text-white/50 transition-all">
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Rounds */}
          {rounds.map((round, ri) => (
            <motion.div key={ri} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              {/* User prompt */}
              <div className="flex justify-end">
                <div className="max-w-[80%] bg-indigo-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-md text-[13px] font-medium shadow-lg shadow-indigo-500/10">
                  {round.prompt}
                </div>
              </div>

              {/* Mobile tab switch */}
              <div className="flex sm:hidden gap-1.5">
                {(['a', 'b'] as const).map(s => (
                  <button key={s} onClick={() => setMobileTab(s)} className={cn(
                    "flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ring-1",
                    mobileTab === s
                      ? (s === 'a' ? "bg-blue-500/10 text-blue-300 ring-blue-500/20" : "bg-violet-500/10 text-violet-300 ring-violet-500/20")
                      : "bg-white/[0.02] text-white/20 ring-white/[0.04]"
                  )}>
                    {s === 'a' ? round.modelA.label.split(' ')[0] : round.modelB.label.split(' ')[0]}
                    {round.winner === s && ' 🏆'}
                  </button>
                ))}
              </div>

              {/* Responses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className={cn(mobileTab !== 'a' && 'hidden sm:block')}>
                  <ResponseCard content={round.responseA} model={round.modelA} time={round.timeA} side="a" isWinner={round.winner === 'a'} isStreaming={false} />
                </div>
                <div className={cn(mobileTab !== 'b' && 'hidden sm:block')}>
                  <ResponseCard content={round.responseB} model={round.modelB} time={round.timeB} side="b" isWinner={round.winner === 'b'} isStreaming={false} />
                </div>
              </div>

              {/* Voting */}
              {round.winner === null ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex items-center justify-center gap-2 py-1">
                  {[
                    { w: 'a' as const, label: 'A wins', cls: 'bg-blue-500/[0.06] ring-blue-500/15 text-blue-300 hover:bg-blue-500/[0.12]' },
                    { w: 'tie' as const, label: 'Tie', cls: 'bg-white/[0.03] ring-white/[0.06] text-white/30 hover:bg-white/[0.06]' },
                    { w: 'b' as const, label: 'B wins', cls: 'bg-violet-500/[0.06] ring-violet-500/15 text-violet-300 hover:bg-violet-500/[0.12]' },
                  ].map(v => (
                    <button key={v.w} onClick={() => vote(ri, v.w)} className={cn("flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-bold ring-1 transition-all", v.cls)}>
                      {v.w === 'tie' ? <Equal className="w-3 h-3" /> : <ThumbsUp className="w-3 h-3" />}
                      {v.label}
                    </button>
                  ))}
                </motion.div>
              ) : (
                <div className="flex items-center justify-center gap-1.5 text-[9px] font-bold text-white/15 py-0.5">
                  {round.winner === 'tie' ? (
                    <><Equal className="w-3 h-3" /> Draw</>
                  ) : (
                    <><Trophy className="w-3 h-3 text-amber-400/60" /> {round.winner === 'a' ? round.modelA.label : round.modelB.label} wins</>
                  )}
                </div>
              )}
            </motion.div>
          ))}

          {/* Live streaming */}
          {loading && (
            <div className="space-y-3">
              <div className="flex sm:hidden gap-1.5">
                {(['a', 'b'] as const).map(s => (
                  <button key={s} onClick={() => setMobileTab(s)} className={cn(
                    "flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ring-1",
                    mobileTab === s
                      ? (s === 'a' ? "bg-blue-500/10 text-blue-300 ring-blue-500/20" : "bg-violet-500/10 text-violet-300 ring-violet-500/20")
                      : "bg-white/[0.02] text-white/20 ring-white/[0.04]"
                  )}>
                    {s === 'a' ? modelA.label.split(' ')[0] : modelB.label.split(' ')[0]}
                    {(s === 'a' ? doneA : doneB) ? ' ✓' : ' ...'}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className={cn(mobileTab !== 'a' && 'hidden sm:block')}>
                  <ResponseCard content={streamA} model={modelA} time={0} side="a" isWinner={false} isStreaming={!doneA} />
                </div>
                <div className={cn(mobileTab !== 'b' && 'hidden sm:block')}>
                  <ResponseCard content={streamB} model={modelB} time={0} side="b" isWinner={false} isStreaming={!doneB} />
                </div>
              </div>
            </div>
          )}

          <div ref={endRef} className="h-[180px]" />
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-white/[0.04] bg-gradient-to-t from-[#0b0c14] via-[#0b0c14]/95 to-transparent px-4 sm:px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-white/[0.06] to-transparent pointer-events-none" />
            <div className="relative rounded-2xl bg-[#1a1b22] ring-1 ring-white/[0.06] shadow-[0_2px_20px_rgba(0,0,0,0.3)]">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Battle prompt — same message goes to both models..."
                rows={1}
                className="w-full bg-transparent px-4 pt-3 pb-10 text-[13px] text-white/80 placeholder:text-white/15 focus:outline-none resize-none hide-scrollbar"
              />
              <div className="absolute bottom-2.5 right-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
                    input.trim() && !loading
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                      : "bg-white/[0.04] text-white/15"
                  )}
                >
                  <ArrowUp className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
