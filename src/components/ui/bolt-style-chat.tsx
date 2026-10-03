'use client'

import React, { useState, useRef, useEffect } from 'react'
import { 
  Paperclip, Globe, BrainCog, ChevronDown, ArrowUp, Square, Mic, MicOff, Volume2, VolumeX, Check
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../GlassCard'

export const VOICE_OPTIONS = [
  { id: 'nova', name: 'Nova', desc: 'Soft female voice (Best for Tamil & English)', gender: 'Female' },
  { id: 'alloy', name: 'Alloy', desc: 'Neutral, balanced & versatile', gender: 'Neutral' },
  { id: 'echo', name: 'Echo', desc: 'Warm, calm & natural male', gender: 'Male' },
  { id: 'shimmer', name: 'Shimmer', desc: 'Bright, energetic & clear female', gender: 'Female' },
  { id: 'onyx', name: 'Onyx', desc: 'Deep, resonant & authoritative male', gender: 'Male' },
  { id: 'coral', name: 'Coral', desc: 'Warm, cheerful & engaging', gender: 'Female' },
  { id: 'verse', name: 'Verse', desc: 'Dynamic, expressive & articulate', gender: 'Neutral' },
  { id: 'sage', name: 'Sage', desc: 'Calm, thoughtful & intellectual', gender: 'Female' },
  { id: 'fable', name: 'Fable', desc: 'Warm, expressive storyteller', gender: 'Male' },
  { id: 'calm', name: 'Calm', desc: 'Gentle, soothing & empathetic', gender: 'Neutral' },
];

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

  // Voice Assistant Integration
  isVoiceActive?: boolean;
  onToggleVoice?: () => void;
  isListening?: boolean;
  onToggleMic?: () => void;
  selectedVoice?: string;
  onSelectVoice?: (voice: string) => void;
  isSpeaking?: boolean;
  onStopSpeaking?: () => void;
}

export const BoltStyleChatInput = React.forwardRef((props: BoltStyleChatInputProps, ref: React.Ref<HTMLTextAreaElement>) => {
  const { 
    onSend = () => {}, 
    isLoading = false, 
    placeholder = "Ask ChatGPT or choose a model...", 
    className,
    value,
    onValueChange,
    showSearch,
    showThink,
    onToggleSearch,
    onToggleThink,
    onFileUploadClick,
    currentModelName = "Default Model",
    onModelSelectorClick,
    isVoiceActive = false,
    onToggleVoice,
    isListening = false,
    onToggleMic,
    selectedVoice = "nova",
    onSelectVoice,
    isSpeaking = false,
    onStopSpeaking,
  } = props;

  const [internalInput, setInternalInput] = React.useState("");
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);
  const input = value !== undefined ? value : internalInput;
  const setInput = onValueChange !== undefined ? onValueChange : setInternalInput;

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const voiceMenuRef = useRef<HTMLDivElement>(null);

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

  // Close voice menu on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (voiceMenuRef.current && !voiceMenuRef.current.contains(e.target as Node)) {
        setShowVoiceMenu(false);
      }
    };
    if (showVoiceMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showVoiceMenu]);

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

  const currentVoiceObj = VOICE_OPTIONS.find(v => v.id === selectedVoice) || VOICE_OPTIONS[0];

  return (
    <div className={cn("relative w-full max-w-3xl mx-auto", className)}>
      <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-white/[0.08] to-transparent pointer-events-none" />
      <div className="relative rounded-2xl bg-[#1e1e22] ring-1 ring-white/[0.08] shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_2px_20px_rgba(0,0,0,0.4)]">
        
        {/* Textarea */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Listening to your voice... Speak now..." : placeholder}
            className={cn(
              "w-full resize-none bg-transparent text-[15px] sm:text-[16px] text-white placeholder-[#5a5a5f] px-5 pt-5 pb-3 focus:outline-none min-h-[76px] max-h-[200px] transition-colors",
              isListening && "placeholder-blue-400/80"
            )}
            style={{ height: '76px' }}
          />

          {/* Active Speaking Indicator */}
          {isSpeaking && (
            <div className="absolute top-3 right-4 flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 px-3 py-1 rounded-full text-xs text-blue-300 animate-pulse">
              <Volume2 className="w-3.5 h-3.5 text-blue-400 animate-bounce" />
              <span>AI Speaking ({currentVoiceObj.name})...</span>
              <button 
                type="button" 
                onClick={onStopSpeaking}
                className="hover:text-white p-0.5"
                title="Stop speaking"
              >
                <VolumeX className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between px-3 pb-3 pt-1">
          
          {/* Left Actions */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Paperclip */}
            <button
              type="button"
              onClick={onFileUploadClick}
              className="flex items-center justify-center size-8 rounded-full bg-transparent hover:bg-white/10 text-[#8a8a8f] hover:text-white transition-all duration-200 active:scale-95"
              title="Attach files"
            >
              <Paperclip className="size-4" />
            </button>
            
            {/* Search Toggle */}
            <button
              type="button"
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
              type="button"
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
                type="button"
                onClick={onModelSelectorClick}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[12px] font-medium transition-all duration-200 text-[#8a8a8f] hover:text-white hover:bg-white/5 active:scale-95"
              >
                <span>{currentModelName}</span>
                <ChevronDown className="size-3.5 opacity-60" />
              </button>
            </div>
          </div>

          <div className="flex-1" />

          {/* Right Actions — Voice Assistant & Send Controls */}
          <div className="flex items-center gap-2 relative">
            
            {/* Voice Model Selector Dropdown (alloy, echo, nova, shimmer, onyx, coral, verse, sage, fable, calm) */}
            <div className="relative" ref={voiceMenuRef}>
              <button
                type="button"
                onClick={() => setShowVoiceMenu(!showVoiceMenu)}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[12px] font-medium transition-all duration-200 border",
                  showVoiceMenu 
                    ? "bg-blue-600/20 text-blue-300 border-blue-500/40" 
                    : "bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white border-white/[0.08]"
                )}
                title="Select Voice for AI Speech Reply"
              >
                <Volume2 className="size-3.5 text-blue-400" />
                <span className="capitalize">{currentVoiceObj.name}</span>
                <ChevronDown className="size-3 opacity-60" />
              </button>

              <AnimatePresence>
                {showVoiceMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-11 right-0 w-64 bg-[#141417] border border-white/15 rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-xl"
                  >
                    <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wider text-white/40 uppercase border-b border-white/10 mb-1">
                      Select Voice Model (AI Reply)
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-0.5 custom-scrollbar">
                      {VOICE_OPTIONS.map((v) => {
                        const isSelected = selectedVoice === v.id;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => {
                              onSelectVoice?.(v.id);
                              setShowVoiceMenu(false);
                            }}
                            className={cn(
                              "w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors",
                              isSelected 
                                ? "bg-blue-600/20 text-blue-300 font-medium" 
                                : "text-white/80 hover:bg-white/5 hover:text-white"
                            )}
                          >
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm capitalize">{v.name}</span>
                              <span className="text-[10px] text-white/40 line-clamp-1">{v.desc}</span>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Microphone Button (Speech to Text) */}
            <button
              type="button"
              onClick={onToggleMic}
              className={cn(
                "flex items-center justify-center size-9 rounded-full transition-all duration-200 active:scale-95",
                isListening
                  ? "bg-red-500/20 text-red-400 ring-2 ring-red-400/50 animate-pulse"
                  : "bg-transparent hover:bg-white/10 text-[#8a8a8f] hover:text-white"
              )}
              title={isListening ? "Listening... Click to stop" : "Voice Dictation (Microphone)"}
            >
              {isListening ? <MicOff className="size-4 text-red-400" /> : <Mic className="size-4" />}
            </button>

            {/* Blue Circular Voice Button — "Start Voice" (Exact Match with Screenshot) */}
            <div className="relative group">
              <button
                type="button"
                onClick={onToggleVoice}
                className={cn(
                  "flex items-center justify-center size-9 rounded-full transition-all duration-300 active:scale-95 shadow-md",
                  isVoiceActive 
                    ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-[0_0_20px_rgba(59,130,246,0.8)] ring-2 ring-blue-400" 
                    : "bg-[#1d4ed8] hover:bg-[#2563eb] text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                )}
              >
                {/* 4 Soundwave Bars */}
                <div className="flex items-center gap-[2.5px] h-4">
                  <span 
                    className={cn(
                      "w-[2.5px] bg-white rounded-full transition-all duration-200", 
                      (isVoiceActive || isSpeaking) ? "h-3.5 animate-bounce" : "h-2.5"
                    )} 
                    style={{ animationDelay: '0ms' }} 
                  />
                  <span 
                    className={cn(
                      "w-[2.5px] bg-white rounded-full transition-all duration-200", 
                      (isVoiceActive || isSpeaking) ? "h-4 animate-bounce" : "h-4"
                    )} 
                    style={{ animationDelay: '150ms' }} 
                  />
                  <span 
                    className={cn(
                      "w-[2.5px] bg-white rounded-full transition-all duration-200", 
                      (isVoiceActive || isSpeaking) ? "h-2.5 animate-bounce" : "h-1.5"
                    )} 
                    style={{ animationDelay: '300ms' }} 
                  />
                  <span 
                    className={cn(
                      "w-[2.5px] bg-white rounded-full transition-all duration-200", 
                      (isVoiceActive || isSpeaking) ? "h-3.5 animate-bounce" : "h-3"
                    )} 
                    style={{ animationDelay: '450ms' }} 
                  />
                </div>
              </button>

              {/* Start Voice Tooltip */}
              <div className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-[#18181b] border border-white/10 rounded-md text-[11px] font-medium text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-30">
                {isVoiceActive ? (isSpeaking ? "Speaking..." : "Listening...") : "Start Voice"}
              </div>
            </div>

            {/* Send Button (Visible when text exists or loading) */}
            {input.trim() && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex items-center justify-center size-9 rounded-full bg-[#1488fc] hover:bg-[#1a94ff] text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-[0_0_20px_rgba(20,136,252,0.3)]"
                title="Send Message"
              >
                {isLoading ? (
                  <Square className="size-4 fill-white animate-pulse" />
                ) : (
                  <ArrowUp className="size-5" />
                )}
              </button>
            )}

          </div>
        </div>
      </div>
    </div>
  )
})

BoltStyleChatInput.displayName = "BoltStyleChatInput";
