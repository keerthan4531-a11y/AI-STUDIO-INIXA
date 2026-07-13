'use client'

import React, { useRef, useEffect, useState } from 'react'
import { Paperclip, Square, ArrowUp, ChevronDown, CheckCircle2, Search } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../GlassCard'
import { AI_MODELS } from '../../api/aiEngine'
import { ModelIcon } from '../ModelSelector'

interface NovaChatInputProps {
  onSend?: (message: string, files?: File[]) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  onFileUploadClick?: () => void;
  currentModelName?: string;
  onModelSelectorClick?: () => void;
  showSearch?: boolean;
  showThink?: boolean;
  onToggleSearch?: () => void;
  onToggleThink?: () => void;
  onModelSelect?: (model: any) => void;
}

export const NovaChatInput = React.forwardRef((props: NovaChatInputProps, ref: React.Ref<HTMLTextAreaElement>) => {
  const { 
    onSend = () => {}, 
    isLoading = false, 
    placeholder = "Ask me anything — code, write, analyze, create...", 
    className,
    value,
    onValueChange,
    onFileUploadClick,
    currentModelName = "GPT-4.1 Mini",
    onModelSelectorClick,
    onModelSelect
  } = props;

  const [internalInput, setInternalInput] = React.useState("");
  const input = value !== undefined ? value : internalInput;
  const setInput = onValueChange !== undefined ? onValueChange : setInternalInput;
  
  const [isFocused, setIsFocused] = React.useState(false);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isPulsing, setIsPulsing] = React.useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof ref === 'function') ref(textareaRef.current);
    else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = textareaRef.current;
  }, [ref]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsMenuOpen(false);
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // focus search on open
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setSearchQuery("");
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = '72px';
      textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 72), 300)}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    if (input.trim() && !isLoading) {
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 500);
      onSend(input);
      setInput('');
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape' && isMenuOpen) {
      setIsMenuOpen(false);
    }
  }

  const hasText = input.trim().length > 0;
  
  const currentModelInfo = AI_MODELS.find(m => m.label === currentModelName) || AI_MODELS[0];
  
  const filteredModels = AI_MODELS.filter(m => 
    m.id !== 'auto' && 
    (m.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
     m.provider?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className={cn("relative w-full max-w-[672px] mx-auto", className)}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes borderRotate { to { --border-angle: 360deg; } }
        @property --border-angle { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
        @keyframes shimmerSlide { 0%, 100% { left: -100%; } 50% { left: 100%; } }
      `}} />

      {/* AI Card */}
      <div 
        className={cn(
          "relative rounded-2xl bg-white/[0.03] backdrop-blur-[20px] transition-all duration-500",
          isFocused ? "shadow-[0_0_40px_rgba(99,102,241,0.08),0_0_80px_rgba(139,92,246,0.04)]" : "",
          isPulsing ? "shadow-[0_0_60px_rgba(99,102,241,0.12)] border-indigo-500/40" : "border-white/[0.06]"
        )}
        style={{ borderWidth: '1px' }}
      >
        {/* Shimmer */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white/[0.02] to-transparent animate-[shimmerSlide_8s_ease-in-out_infinite]" />
        </div>

        {/* Animated Border Glow */}
        <div 
          className={cn("absolute inset-[-1px] rounded-2xl p-[1px] pointer-events-none transition-opacity duration-500", isFocused ? "opacity-100" : "opacity-0")}
          style={{
            background: 'linear-gradient(var(--border-angle, 0deg), transparent 40%, rgba(99,102,241,0.5) 50%, rgba(139,92,246,0.3) 60%, transparent 70%)',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            animation: 'borderRotate 4s linear infinite'
          }}
        />

        {/* Textarea */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className="block w-full min-h-[72px] max-h-[300px] px-5 pt-5 pb-2 bg-transparent resize-none border-none outline-none text-[#e4e4e7] text-[15px] leading-[1.6] tracking-[-0.01em] placeholder:text-white/[0.35] focus:placeholder:text-white/20 transition-all scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
          />
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 py-2.5 bg-white/[0.02] border-t border-white/[0.04] relative rounded-b-2xl">
          {/* Left side */}
          <div className="flex items-center gap-2">
            
            {/* Model Selector Trigger */}
            <div className="relative" ref={containerRef}>
              <button
                onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                className="flex items-center gap-2 py-1.5 pl-2 pr-3 rounded-[10px] text-[13px] font-medium text-white/70 bg-white/[0.04] border border-white/[0.06] hover:border-indigo-500/30 hover:text-white/95 hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)] transition-all relative overflow-hidden group focus:outline-none"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10 w-5 flex items-center justify-center">
                  <ModelIcon model={currentModelInfo} active={true} />
                </span>
                <span className="relative z-10 truncate max-w-[120px]">{currentModelName}</span>
                <ChevronDown className={cn("relative z-10 w-3.5 h-3.5 text-white/40 transition-transform duration-300", isMenuOpen && "rotate-180")} />
              </button>

              {/* Dropdown */}
              <div 
                className={cn(
                  "absolute bottom-[calc(100%+8px)] left-0 min-w-[300px] bg-[#18181b]/95 backdrop-blur-[24px] border border-white/[0.08] rounded-[14px] p-2 shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_40px_rgba(99,102,241,0.05)] transform-origin-bottom-left transition-all duration-250 z-50 flex flex-col",
                  isMenuOpen ? "opacity-100 scale-100 pointer-events-auto translate-y-0" : "opacity-0 scale-95 pointer-events-none translate-y-2"
                )}
              >
                <div className="mb-2 px-1">
                  <div className="relative flex items-center bg-white/[0.05] rounded-xl border border-white/10 overflow-hidden focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all">
                    <Search className="w-4 h-4 text-white/40 ml-3" />
                    <input 
                      ref={searchInputRef}
                      type="text" 
                      placeholder="Search models..." 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={e => e.stopPropagation()}
                      className="w-full bg-transparent border-none outline-none text-[13px] text-white placeholder:text-white/30 py-2.5 px-2.5"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-0.5 max-h-[320px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pr-1">
                  {filteredModels.length === 0 ? (
                    <div className="py-8 text-center text-white/40 text-[13px]">No models found</div>
                  ) : (
                    filteredModels.map((m, i) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          if (onModelSelect) onModelSelect(m);
                          setIsMenuOpen(false);
                        }}
                        style={{ transitionDelay: isMenuOpen ? `${Math.min(i, 20) * 0.02}s` : '0s' }}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[13px] font-medium text-left transition-all relative overflow-hidden group shrink-0",
                          currentModelName === m.label ? "bg-indigo-500/10 text-white/95" : "text-white/60 hover:bg-white/[0.06] hover:text-white/95",
                          isMenuOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                        )}
                      >
                        {currentModelName === m.label && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] bg-[#6366f1] rounded-r-[3px]" />}
                        <div 
                          className="relative w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_15px_var(--icon-color)]"
                          style={{ 
                            backgroundColor: `${m.iconColor || '#8b5cf6'}15`,
                            border: `1px solid ${m.iconColor || '#8b5cf6'}30`,
                            '--icon-color': `${m.iconColor || '#8b5cf6'}40`
                          } as React.CSSProperties}
                        >
                          <div className="scale-[0.85] flex items-center justify-center">
                            <ModelIcon model={m} active={true} />
                          </div>
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-white/90 font-semibold text-[13px] truncate tracking-tight">{m.label}</span>
                            {m.badge && (
                              <span 
                                className="text-[9px] font-black uppercase tracking-[0.05em] px-1.5 py-0.5 rounded-md" 
                                style={{ 
                                  color: m.badgeColor || '#a78bfa', 
                                  backgroundColor: `${m.badgeColor || '#a78bfa'}15`,
                                  border: `1px solid ${m.badgeColor || '#a78bfa'}30`
                                }}
                              >
                                {m.badge}
                              </span>
                            )}
                          </div>
                          {(m.provider || m.description) && (
                            <div className="text-[11px] font-medium text-white/40 mt-[2px] truncate">{m.description || m.provider}</div>
                          )}
                        </div>
                        {currentModelName === m.label && (
                          <div className="w-5 h-5 flex items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Attach File Button */}
            <button
              onClick={onFileUploadClick}
              className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-transparent border border-white/[0.06] text-white/40 hover:bg-white/[0.04] hover:border-white/[0.12] hover:text-white/70 hover:-translate-y-[1px] transition-all focus:outline-none"
              title="Attach file"
            >
              <Paperclip className="w-4 h-4" />
            </button>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <span className={cn("text-[11px] font-medium mr-2 hidden sm:block", input.length > 3800 ? "text-red-400/60" : "text-white/20")}>
              {input.length.toLocaleString()} / 4,000
            </span>
            <button
              onClick={handleSubmit}
              disabled={(!hasText && !isLoading)}
              className={cn(
                "w-9 h-9 rounded-[10px] flex items-center justify-center transition-all duration-300 relative overflow-hidden",
                hasText || isLoading
                  ? "bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-white hover:scale-110 hover:shadow-[0_4px_20px_rgba(99,102,241,0.4)] active:scale-95 cursor-pointer"
                  : "bg-white/[0.06] text-white/20 cursor-default"
              )}
            >
              {(hasText || isLoading) && <div className="absolute inset-0 bg-gradient-to-br from-[#818cf8] to-[#a78bfa] opacity-0 hover:opacity-100 transition-opacity" />}
              {isLoading ? (
                <Square className="w-4 h-4 fill-current animate-pulse relative z-10" />
              ) : (
                <ArrowUp className="w-4 h-4 relative z-10" />
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Suggestions */}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {[
          { icon: '✨', text: 'Explain quantum computing in simple terms' },
          { icon: '💻', text: 'Write a Python function to sort a list' },
          { icon: '🚀', text: 'Create a marketing plan for a SaaS startup' },
          { icon: '⚡', text: 'Compare React vs Vue for a new project' }
        ].map((chip, idx) => (
          <button 
            key={idx}
            onClick={() => { setInput(chip.text); if (textareaRef.current) textareaRef.current.focus(); }}
            className="px-4 py-2 rounded-[12px] text-[12px] font-medium text-white/40 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:text-white/70 hover:border-white/10 hover:-translate-y-[2px] transition-all"
          >
            {chip.icon} <span className="ml-1">{chip.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
});

NovaChatInput.displayName = "NovaChatInput";
