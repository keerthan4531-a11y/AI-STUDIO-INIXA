"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './GlassCard';

type TabType = 'video' | 'image' | 'chat' | 'codex' | 'pdf' | 'profile' | 'about' | 'vibe' | 'api' | 'voice';

export function HolographicMesh({ activeTab, lowPowerMode }: { activeTab: TabType; lowPowerMode: boolean }) {
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  
  if (lowPowerMode) return <div className="fixed inset-0 z-0 bg-[#0b0c14]" />;

  const themeColors: Record<string, { primary: string; nebulas: string[] }> = {
    chat: { primary: 'rgba(59,130,246,0.18)', nebulas: ['bg-blue-900/50', 'bg-blue-800/40', 'bg-indigo-900/50'] },
    codex: { primary: 'rgba(16,185,129,0.18)', nebulas: ['bg-emerald-900/50', 'bg-green-800/40', 'bg-teal-900/50'] },
    image: { primary: 'rgba(6,182,212,0.18)', nebulas: ['bg-cyan-900/50', 'bg-blue-900/40', 'bg-indigo-900/50'] },
    pdf: { primary: 'rgba(37,99,235,0.18)', nebulas: ['bg-blue-900/60', 'bg-sky-800/40', 'bg-indigo-900/50'] },
    video: { primary: 'rgba(139,92,246,0.18)', nebulas: ['bg-purple-900/50', 'bg-indigo-800/40', 'bg-fuchsia-900/50'] },
    profile: { primary: 'rgba(245,158,11,0.12)', nebulas: ['bg-zinc-900/50', 'bg-amber-900/40', 'bg-orange-900/40'] },
    about: { primary: 'rgba(99,102,241,0.15)', nebulas: ['bg-indigo-900/50', 'bg-slate-900/40', 'bg-blue-900/40'] },
    vibe: { primary: 'rgba(139,92,246,0.18)', nebulas: ['bg-violet-900/50', 'bg-indigo-800/40', 'bg-purple-900/50'] },
    api: { primary: 'rgba(99,102,241,0.18)', nebulas: ['bg-indigo-900/50', 'bg-blue-800/40', 'bg-slate-900/50'] },
    voice: { primary: 'rgba(139,92,246,0.20)', nebulas: ['bg-violet-900/50', 'bg-purple-800/40', 'bg-indigo-900/50'] }
  };

  const currentTheme = themeColors[activeTab] || themeColors.chat;

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      setMousePos({ x: (e.clientX / window.innerWidth) * 100, y: (e.clientY / window.innerHeight) * 100 });
    };
    window.addEventListener('pointermove', handleMove);
    return () => window.removeEventListener('pointermove', handleMove);
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#0b0c14] transition-colors duration-1000">
      <motion.div 
        animate={{ 
          background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, ${currentTheme.primary} 0%, transparent 40%)`
        }}
        className="absolute inset-0 z-10"
      />
      
      <div className="absolute inset-0 z-0">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: Math.random(), scale: Math.random() }}
            animate={{ 
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.2, 1]
            }}
            transition={{
              duration: 3 + Math.random() * 5,
              repeat: Infinity,
              delay: Math.random() * 5
            }}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 2 + 1}px`,
              height: `${Math.random() * 2 + 1}px`,
            }}
            className="absolute bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"
          />
        ))}
      </div>

      <AnimatePresence mode="popLayout">
        {currentTheme.nebulas.map((color, i) => (
          <motion.div
            key={`${activeTab}-${i}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: 0.3, 
              scale: [1, 1.3, 1],
              rotate: [0, 360] 
            }}
            exit={{ opacity: 0, scale: 1.5 }}
            transition={{
              duration: 40 + (i * 10),
              repeat: Infinity,
              ease: "linear"
            }}
            style={{ left: `${20 + (i * 30)}%`, top: `${30 + (i * 20)}%` }}
            className={cn("absolute w-[100vw] h-[100vw] rounded-full blur-[150px] mix-blend-screen", color)}
          />
        ))}
      </AnimatePresence>

      <div className="absolute inset-0 bg-gradient-to-b from-[#0b0c14] via-transparent to-[#0b0c14] opacity-60" />
    </div>
  );
}

