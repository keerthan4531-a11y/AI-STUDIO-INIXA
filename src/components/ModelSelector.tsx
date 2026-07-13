"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Cpu, XCircle, Bot, Zap as ZapIcon, Brain, Sparkles, Star, Boxes, Code, Terminal, Globe, Eye } from 'lucide-react';
import { cn } from './GlassCard';
import { OpenAILogo, GeminiLogo, GrokLogo, ClaudeLogo, MetaLogo, BaiduLogo, DeepSeekLogo, KimiLogo, ZaiLogo, QwenLogo, MiniMaxLogo } from './Logos';
import { AI_MODELS, type AIModel } from '../api/aiEngine';
import { vibrate } from '../utils/helpers';

export function ModelIcon({ model, active }: { model: AIModel; active: boolean }) {
  const size = 20;
  const color = active ? "white" : (model.iconColor || "currentColor");
  
  if (model.label.toLowerCase().includes('grok')) return <GrokLogo size={size} color={color} />;
  if (model.label.toLowerCase().includes('gemini')) return <GeminiLogo size={size} />;
  if (model.label.toLowerCase().includes('claude')) return <ClaudeLogo size={size} color={color} />;
  if (model.label.toLowerCase().includes('gpt') || model.label.toLowerCase().includes('openai')) return <OpenAILogo size={size} color={color} />;
  if (model.label.toLowerCase().includes('meta') || model.label.toLowerCase().includes('llama')) return <MetaLogo size={size} color={color} />;
  if (model.label.toLowerCase().includes('baidu') || model.label.toLowerCase().includes('ernie')) return <BaiduLogo size={size} color={color} />;
  if (model.label.toLowerCase().includes('deepseek')) return <DeepSeekLogo size={size} color={color} />;
  if (model.label.toLowerCase().includes('kimi')) return <KimiLogo size={size} />;
  if (model.label.toLowerCase().includes('glm') || model.label.toLowerCase().includes('zai')) return <ZaiLogo size={size} color={color} />;
  if (model.label.toLowerCase().includes('qwen')) return <QwenLogo size={size} />;
  if (model.label.toLowerCase().includes('minimax') || model.label.toLowerCase().includes('hailuo')) return <MiniMaxLogo size={size} />;

  switch (model.icon) {
    case 'Zap': return <ZapIcon size={size} className={cn(active ? "text-white" : "text-blue-400")} />;
    case 'Brain': return <Brain size={size} className={cn(active ? "text-white" : "text-purple-400")} />;
    case 'Sparkles': return <Sparkles size={size} className={cn(active ? "text-white" : "text-green-400")} />;
    case 'Star': return <Star size={size} className={cn(active ? "text-white" : "text-yellow-400")} />;
    case 'Boxes': return <Boxes size={size} className={cn(active ? "text-white" : "text-red-400")} />;
    case 'Code': return <Code size={size} className={cn(active ? "text-white" : "text-blue-400")} />;
    case 'Terminal': return <Terminal size={size} className={cn(active ? "text-white" : "text-emerald-400")} />;
    case 'Cpu': return <Cpu size={size} className={cn(active ? "text-white" : "text-indigo-400")} />;
    case 'Globe': return <Globe size={size} className={cn(active ? "text-white" : "text-teal-400")} />;
    case 'Eye': return <Eye size={size} className={cn(active ? "text-white" : "text-sky-400")} />;
    case 'Bot': return <Bot size={size} className={cn(active ? "text-white" : "text-emerald-400")} />;
    default: return <Bot size={size} className={cn(active ? "text-white" : "text-white/20")} />;
  }
}

export function ModelSelector({ currentModel, onSelect, onClose }: { 
  currentModel: AIModel; 
  onSelect: (m: AIModel) => void; 
  onClose: () => void;
}) {
  const [filter, setFilter] = useState('all');
  
  const filteredModels = AI_MODELS.filter(m => {
    if (filter === 'all') return true;
    if (filter === 'puter') return m.engine === 'puter';
    if (filter === 'chinese') return m.badge === 'CHINESE' || m.badge === 'AGGREGATOR' || m.badge === 'COZE' || m.engine.endsWith('-free') || m.engine === 'parallel-chat' || m.engine === 'coze-proxy';
    if (filter === 'free') return m.badge === 'FREE' || m.badge === 'DDG' || m.badge === 'POLL' || m.badge === 'CHINESE' || m.badge === 'AGGREGATOR' || m.badge === 'COZE';
    if (filter === 'premium') return m.engine === 'llm7' || m.badge === 'PRO' || m.badge === 'ULTRA';
    return m.engine === filter;
  });

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-4 sm:p-6"
    >
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md" 
      />
      <motion.div 
        initial={{ y: 100, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 100, scale: 0.95 }}
        className="relative w-full max-w-lg max-h-[80vh] overflow-hidden apple-glass-card shadow-[0_32px_80px_rgba(0,0,0,0.9)] flex flex-col"
      >
        <div className="p-6 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20"><Cpu className="w-5 h-5 text-indigo-400" /></div>
            <div>
              <h3 className="text-base font-black text-white tracking-tight">AI Models</h3>
              <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Select Model</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 transition-colors"><XCircle className="w-6 h-6 text-white/20 hover:text-white/50" /></button>
        </div>

        <div className="px-4 py-3 flex items-center gap-2 overflow-x-auto hide-scrollbar bg-white/[0.02] border-b border-white/[0.05]">
          {[
            { id: 'all', label: 'All Models' },
            { id: 'chinese', label: 'Chinese Proxies' },
            { id: 'puter', label: 'Puter Elite' },
            { id: 'premium', label: 'Premium' },
            { id: 'free', label: 'Free Models' }
          ].map(t => (
            <button 
              key={t.id}
              onClick={() => { setFilter(t.id); vibrate(10); }}
              className={cn(
                "px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border",
                filter === t.id ? "bg-indigo-600 border-indigo-400 text-white shadow-lg" : "bg-white/5 border-white/10 text-white/30 hover:bg-white/10"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 hide-scrollbar">
           {filteredModels.map(model => (
             <motion.button
               key={model.id}
               whileHover={{ x: 4 }}
               whileTap={{ scale: 0.98 }}
               onClick={() => {
                  onSelect(model);
                  vibrate(25);
               }}
               className={cn(
                 "w-full flex items-center justify-between p-4 rounded-2xl transition-all border",
                 currentModel.id === model.id 
                  ? "bg-indigo-600/10 border-indigo-500/40 shadow-xl" 
                  : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/20"
               )}
             >
                <div className="flex items-center gap-4 text-left">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg border transition-all",
                    currentModel.id === model.id ? "bg-indigo-600 border-indigo-400" : "bg-black/40 border-white/10"
                  )}>
                    <ModelIcon model={model} active={currentModel.id === model.id} />
                  </div>
                 <div>
                   <p className="text-sm font-black text-white leading-tight">{model.label}</p>
                   <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold mt-1">{model.engine} / {model.modelStr}</p>
                 </div>
               </div>
               {model.badge && (
                 <span className={cn(
                   "text-[8px] font-black px-2 py-1 rounded-md border tracking-widest",
                   model.badgeColor === 'red' ? "bg-red-500/10 border-red-500/30 text-red-400" :
                   model.badgeColor === 'blue' ? "bg-blue-500/10 border-blue-500/30 text-blue-400" :
                   model.badgeColor === 'violet' ? "bg-purple-500/10 border-purple-500/30 text-purple-400" :
                   model.badgeColor === 'pink' ? "bg-pink-500/10 border-pink-500/30 text-pink-400" :
                   model.badgeColor === 'green' ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
                   model.badgeColor === 'cyan' ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" :
                   model.badgeColor === 'yellow' ? "bg-amber-500/10 border-amber-500/30 text-amber-400" :
                   model.badgeColor === 'gold' ? "bg-orange-500/10 border-orange-400/50 text-orange-400 shadow-[0_0_15px_rgba(251,146,60,0.3)]" :
                   "bg-white/10 border-white/20 text-white/60"
                 )}>
                   {model.badge}
                 </span>
               )}
             </motion.button>
            ))}
        </div>
        <div className="p-4 bg-white/[0.02] border-t border-white/[0.06] text-center">
           <p className="text-[9px] text-white/20 uppercase tracking-[0.2em] font-bold">Select any model to start chatting</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

