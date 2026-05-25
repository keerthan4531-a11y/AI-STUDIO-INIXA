"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';
import clsx from 'clsx';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export function GlassCard({ children, className, glow, hover = false }: { 
  children: React.ReactNode; 
  className?: string; 
  glow?: string;
  hover?: boolean;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98, filter: "blur(10px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      whileHover={hover ? { scale: 1.01, border: '1px solid rgba(255,255,255,0.2)' } : {}}
      className={cn(
        "relative overflow-hidden rounded-[32px] bg-white/[0.03] border border-white/[0.08] backdrop-blur-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] transition-all",
        className
      )}
    >
      {glow && <div className={cn("absolute inset-0 z-0 opacity-20 pointer-events-none blur-[140px] animate-pulse", glow)} />}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

export function SectionLabel({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
      <Icon className="w-3 h-3" />
      {text}
    </label>
  );
}

