'use client'

import React, { useState, useRef, useEffect } from 'react'
import { 
  Paperclip, Globe, BrainCog, SendHorizontal, ChevronDown, Check, Settings, ArrowUp, Square, StopCircle, Mic
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../GlassCard'

// Custom Divider Component
const CustomDivider: React.FC = () => (
  <div className="relative h-6 w-[1.5px] mx-1">
    <div
      className="absolute inset-0 bg-gradient-to-t from-transparent via-[#9b87f5]/70 to-transparent rounded-full"
      style={{
        clipPath: "polygon(0% 0%, 100% 0%, 100% 40%, 140% 50%, 100% 60%, 100% 100%, 0% 100%, 0% 60%, -40% 50%, 0% 40%)",
      }}
    />
  </div>
);

interface BoltStyleChatInputProps {
  onSend?: (message: string, files?: File[]) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  
  // Controlled props
  value?: string;
  onValueChange?: (value: string) => void;
  showSearch?: boolean;
  showThink?: boolean;
  showCanvas?: boolean;
  onToggleSearch?: () => void;
  onToggleThink?: () => void;
  onToggleCanvas?: () => void;
  onFileUploadClick?: () => void;
  
  // Model
  currentModelName?: string;
  onModelSelectorClick?: () => void;
}

export const BoltStyleChatInput = React.forwardRef((props: BoltStyleChatInputProps, ref: React.Ref<HTMLTextAreaElement>) => {
  const { 
    onSend = () => {}, 
    isLoading = false, 
    placeholder = "What do you want to build?", 
    className,
    value,
    onValueChange,
    showSearch,
    showThink,
    showCanvas,
    onToggleSearch,
    onToggleThink,
    onToggleCanvas,
    onFileUploadClick,
    currentModelName = "Default Model",
    onModelSelectorClick
  } = props;

  const [internalInput, setInternalInput] = React.useState("");
  const input = value !== undefined ? value : internalInput;
  const setInput = onValueChange !== undefined ? onValueChange : setInternalInput;

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync ref
  useEffect(() => {
    if (typeof ref === 'function') ref(textareaRef.current);
    else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = textareaRef.current;
  }, [ref]);

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [input])

  const handleSubmit = () => {
    if (input.trim() && !isLoading) {
      onSend(input);
      setInput('');
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className={cn("relative w-full max-w-3xl mx-auto", className)}>
      <div className="relative rounded-2xl bg-[#2F2F2F] border border-white/10 shadow-sm">
        
        {/* Textarea */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full resize-none bg-transparent text-[15px] sm:text-[16px] text-white/90 placeholder-white/40 px-4 pt-4 pb-3 focus:outline-none min-h-[80px] max-h-[200px]"
            style={{ height: '80px' }}
          />
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between px-3 pb-3 pt-1">
          
          {/* Left Actions */}
          <div className="flex items-center gap-1.5">
            {/* Paperclip */}
            <button
              onClick={onFileUploadClick}
              className="flex items-center justify-center size-8 rounded-full bg-transparent hover:bg-white/10 text-[#8a8a8f] hover:text-white transition-all duration-200 active:scale-95"
              title="Attach files"
            >
              <Paperclip className="size-4" />
            </button>
            
            {/* Search Toggle */}
            <button
              onClick={onToggleSearch}
              className={cn(
                "rounded-full transition-all flex items-center gap-1.5 px-2.5 py-1.5 border border-transparent hover:bg-white/5",
                showSearch ? "text-[#1EAEDB]" : "text-[#8a8a8f] hover:text-white"
              )}
            >
              <Globe className="size-4" />
              <span className="text-[12px] font-medium hidden sm:inline">Search</span>
            </button>
            
            <CustomDivider />
            
            {/* Think Toggle */}
            <button
              onClick={onToggleThink}
              className={cn(
                "rounded-full transition-all flex items-center gap-1.5 px-2.5 py-1.5 border border-transparent hover:bg-white/5",
                showThink ? "text-[#8B5CF6]" : "text-[#8a8a8f] hover:text-white"
              )}
            >
              <BrainCog className="size-4" />
              <span className="text-[12px] font-medium hidden sm:inline">Think</span>
            </button>

            {/* Model Selector Inline */}
            <div className="ml-1 pl-2 border-l border-white/10 flex items-center">
              <button
                onClick={onModelSelectorClick}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[12px] font-medium transition-all duration-200 text-[#8a8a8f] hover:text-white hover:bg-white/5 active:scale-95"
              >
                <span>{currentModelName}</span>
                <ChevronDown className="size-3.5 opacity-60" />
              </button>
            </div>
          </div>

          <div className="flex-1" />

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSubmit}
              disabled={(!input.trim() && !isLoading)}
              className="flex items-center justify-center size-9 rounded-full bg-[#1488fc] hover:bg-[#1a94ff] text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-[0_0_20px_rgba(20,136,252,0.3)]"
            >
              {isLoading ? (
                 <Square className="size-4 fill-white animate-pulse" />
              ) : (
                 <ArrowUp className="size-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})

BoltStyleChatInput.displayName = "BoltStyleChatInput";
