import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  thinkingContent: string;
  isThinking: boolean;
}

export function ThinkPanelDeepSeek({ thinkingContent, isThinking }: Props) {
  // Split content into steps based on paragraphs, filtering out empty ones
  const rawSteps = thinkingContent.split(/\n\s*\n/).map(s => s.trim()).filter(s => s.length > 0);
  const steps = rawSteps.length > 0 ? rawSteps : [""]; // ensure at least one step for the thinking state

  return (
    <div className="my-4 bg-[#131314] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden">
      {/* Card top bar (macOS style) */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-[#27272a]/60 bg-[#1a1a1b]/30">
        <div className="w-2.5 h-2.5 rounded-full bg-zinc-700"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-zinc-700"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-zinc-700"></div>
        <span className="ml-auto text-[10px] font-mono text-zinc-500 tracking-widest uppercase">
          Reasoning Stream
        </span>
      </div>

      <div className="p-4 sm:p-5 space-y-1">
        {steps.map((stepContent, index) => {
          const isLast = index === steps.length - 1;
          const currentlyThinking = isThinking && isLast;
          return (
            <ThinkingStep 
              key={index} 
              content={stepContent} 
              isThinking={currentlyThinking} 
              defaultOpen={isLast} 
              isLast={isLast}
            />
          );
        })}
      </div>
    </div>
  );
}

function ThinkingStep({ content, isThinking, defaultOpen, isLast }: { content: string, isThinking: boolean, defaultOpen: boolean, isLast: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Automatically open if it becomes the thinking step
  React.useEffect(() => {
    if (isThinking) setIsOpen(true);
  }, [isThinking]);

  return (
    <div className="rounded-lg border border-transparent transition-all duration-200 -mx-1 px-1 hover:bg-white/[0.02]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center w-full select-none gap-1.5 rounded-[6px] bg-transparent border-0 p-2 m-0 text-left outline-none cursor-pointer"
      >
        {/* Accent Strip */}
        <div 
          className={`shrink-0 w-[2px] h-4 rounded-full mr-1 transition-all duration-300 ${
            isThinking ? 'bg-blue-400/60 shadow-[0_0_8px_rgba(96,165,250,0.4)]' : 'bg-zinc-700/50'
          }`}
        />
        
        {/* Label */}
        <span className="font-[450] whitespace-nowrap shrink-0 text-sm">
          {isThinking ? (
            <motion.span 
              animate={{ backgroundPosition: ["100% center", "0% center"] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              className="inline-flex items-center bg-clip-text text-transparent bg-gradient-to-r from-[#a1a1aa] via-[#e5e5e5] to-[#a1a1aa] bg-[length:250%_100%]"
            >
              Thinking
            </motion.span>
          ) : (
            <span className="text-zinc-400">Thought</span>
          )}
        </span>
        
        <div className="flex-1" />

        {/* Chevron */}
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
          className="shrink-0 flex items-center justify-center w-5 h-5 rounded-md transition-colors duration-200 group-hover:bg-zinc-800/50 text-zinc-500"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </motion.div>
      </button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pl-[13px] pr-2 pb-2">
              <div className="max-h-[175px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#3f3f46] scrollbar-track-transparent pl-3.5 border-l border-zinc-800/80">
                <div className="text-[13px] text-zinc-400 leading-[1.65] font-mono think-markdown break-words">
                  {content ? (
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
                      {content}
                    </ReactMarkdown>
                  ) : (
                    <motion.span
                      initial={{ opacity: 0, filter: "blur(2px)" }}
                      animate={{ opacity: 1, filter: "blur(0)" }}
                      transition={{ duration: 0.32 }}
                    >
                      Initializing step...
                    </motion.span>
                  )}
                  {isThinking && (
                    <motion.span
                      animate={{ opacity: [1, 1, 0, 0] }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear", times: [0, 0.5, 0.5, 1] }}
                      className="inline-block w-[6px] h-[1em] bg-zinc-300 ml-1 align-text-bottom"
                    />
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isLast && <div className="h-px bg-zinc-800/60 mx-2 mt-1" />}
    </div>
  );
}
