import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  thinkingContent: string;
  isThinking: boolean;
  modelName: string;
}

export function ThinkPanelNova({ thinkingContent, isThinking, modelName }: Props) {
  const [isOpen, setIsOpen] = useState(isThinking);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!isThinking) setIsOpen(false);
  }, [isThinking]);

  // Timer logic
  useEffect(() => {
    let interval: any;
    if (isThinking) {
      interval = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isThinking]);

  const name = modelName?.split(' ')[0] || "Nova";
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="my-5 relative rounded-2xl border border-neutral-800/80 bg-neutral-900/70 backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_25px_70px_-25px_rgba(0,0,0,0.75)] p-5 sm:p-6 overflow-hidden">
      
      {/* Background blobs (Decorative) */}
      <div className="pointer-events-none absolute -top-16 -left-16 w-64 h-64 rounded-full bg-indigo-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-fuchsia-600/10 blur-3xl" />

      {/* Header Row */}
      <div className="relative flex items-center justify-between pb-4 mb-5 border-b border-neutral-800/70">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-indigo-400 via-violet-500 to-fuchsia-500 flex items-center justify-center text-[13px] font-semibold text-white shadow-inner">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-neutral-100 leading-none">{name}</p>
            <p className="text-[11px] text-neutral-500 mt-1 leading-none">{modelName.toLowerCase()} · live trace</p>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {isThinking && (
             <span className="relative flex h-2 w-2 mr-2">
               <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
               <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
             </span>
          )}
          <button 
            title="Replay (Visual)" 
            className="group h-8 w-8 rounded-full flex items-center justify-center text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800/80 transition-colors"
          >
            <RotateCcw className="h-4 w-4 transition-transform duration-500 group-active:-rotate-180" />
          </button>
        </div>
      </div>

      {/* Thinking Tool Toggle */}
      <div className="relative flex flex-col gap-2 w-full">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="group flex items-center max-w-full select-none gap-1 rounded-[6px] bg-transparent border-0 p-0 m-0 text-left cursor-pointer outline-none"
        >
          <div className="flex items-center gap-1.5 min-w-0 text-sm text-neutral-500">
            <span className="font-[450] whitespace-nowrap shrink-0">
               {isThinking ? (
                 <motion.span 
                   animate={{ backgroundPosition: ["100% center", "0% center"] }}
                   transition={{ duration: 1.3, repeat: Infinity, ease: "linear" }}
                   className="inline-flex items-center bg-clip-text text-transparent bg-gradient-to-r from-[#6b7280] via-[#e5e5e5] to-[#6b7280] bg-[length:250%_100%]"
                 >
                   Thinking
                 </motion.span>
               ) : (
                 <span className="text-neutral-400">Thought process</span>
               )}
            </span>
            <span className="text-neutral-500 tabular-nums whitespace-nowrap">
               &nbsp;·&nbsp;<span>{seconds}</span>s
            </span>
          </div>
          <motion.div
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="shrink-0 ml-1 text-neutral-500"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </motion.div>
        </button>

        {/* Expandable Reasoning Text */}
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="pt-1">
                <div className="max-h-[175px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#2a2a30] scrollbar-track-transparent pr-2">
                  <div className="text-[13.5px] text-neutral-400 leading-relaxed font-mono think-markdown break-words">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        img: ({ src, alt }: any) => (
                          <div className="my-3 rounded-lg overflow-hidden border border-white/[0.08] inline-block shadow-lg">
                            <img src={src} alt={alt} referrerPolicy="no-referrer" className="h-24 w-auto object-cover opacity-90" />
                          </div>
                        ),
                        p: ({ children }: any) => <p className="mb-2 last:mb-0 whitespace-pre-wrap">{children}</p>
                      }}
                    >
                      {thinkingContent || "Initializing..."}
                    </ReactMarkdown>
                    {isThinking && (
                      <motion.span
                        animate={{ opacity: [1, 1, 0, 0] }}
                        transition={{ duration: 0.9, repeat: Infinity, ease: "linear", times: [0, 0.5, 0.5, 1] }}
                        className="inline-block w-[2px] h-[1em] bg-neutral-500 ml-0.5 align-middle"
                      />
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
