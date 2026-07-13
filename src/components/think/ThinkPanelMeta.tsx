import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronUp, Brain } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  thinkingContent: string;
  isThinking: boolean;
  modelName: string;
}

export function ThinkPanelMeta({ thinkingContent, isThinking, modelName }: Props) {
  const [expanded, setExpanded] = useState(isThinking);

  // Auto-collapse when thinking finishes
  React.useEffect(() => {
    if (!isThinking) setExpanded(false);
  }, [isThinking]);

  // Extract a small snippet for the finished state
  const snippet = thinkingContent 
    ? thinkingContent.replace(/<[^>]*>?/gm, '').split('\n').find(l => l.trim().length > 0)?.substring(0, 45) + '...'
    : 'planning the response structure...';

  // Dynamic Theme Colors
  const isMeta = modelName?.toLowerCase().includes("meta");
  const colorTitle = isMeta ? "text-[#a78bfa]" : "text-amber-300"; // Lighter purple for title
  const colorDot = isMeta ? "bg-[#8b5cf6]" : "bg-amber-400";
  const colorIcon = isMeta ? "text-[#8b5cf6]/50" : "text-amber-400/50";
  const colorBorder = isMeta ? "border-[#8b5cf6]/20" : "border-amber-500/10";
  const titleText = isMeta ? (isThinking ? 'Composing...' : 'Composition complete') : (isThinking ? 'Thinking...' : 'Thought Process');

  return (
    <div className={`my-3 rounded-2xl border ${colorBorder} bg-white/[0.01] overflow-hidden backdrop-blur-sm`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors cursor-pointer border-0 bg-transparent outline-none"
      >
        <div className="flex items-center gap-3">
          <motion.div
            animate={isThinking ? { rotate: [0, 360] } : {}}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className={`w-5 h-5 rounded-full border-2 border-dashed ${colorBorder} flex items-center justify-center`}
          >
            {isMeta ? (
               <div className={`w-2 h-2 rounded-full ${colorDot} animate-pulse`} />
            ) : (
               <Brain className={`w-3 h-3 ${colorIcon}`} />
            )}
          </motion.div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${colorTitle}`}>
              {titleText}
            </span>
            {isThinking && (
              <motion.div className="flex gap-1">
                {[0, 0.15, 0.3].map(d => (
                  <motion.div
                    key={d}
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1, delay: d }}
                    className={`w-1 h-1 rounded-full ${colorDot}`}
                  />
                ))}
              </motion.div>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp className={`w-4 h-4 ${colorIcon}`} /> : <ChevronRight className={`w-4 h-4 ${colorIcon}`} />}
      </button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 border-t border-amber-500/10">
              <div className="mt-3 text-[13px] leading-relaxed text-white/50 font-mono max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#2a2a30] scrollbar-track-transparent think-markdown pr-2">
                {thinkingContent ? (
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      img: ({ src, alt }: any) => (
                        <div className="my-3 rounded-lg overflow-hidden border border-white/[0.08] inline-block shadow-lg">
                          <img 
                            src={src} 
                            alt={alt || "Generated Image"} 
                            referrerPolicy="no-referrer" 
                            className="h-24 w-auto object-cover opacity-90 transition-opacity hover:opacity-100" 
                          />
                        </div>
                      ),
                      p: ({ children }: any) => <p className="mb-2 last:mb-0 whitespace-pre-wrap">{children}</p>
                    }}
                  >
                    {thinkingContent}
                  </ReactMarkdown>
                ) : (
                  <motion.span
                    initial={{ opacity: 0, filter: "blur(2px)" }}
                    animate={{ opacity: 1, filter: "blur(0)" }}
                    transition={{ duration: 0.32 }}
                  >
                    Initializing thought process...
                  </motion.span>
                )}
                {isThinking && (
                  <motion.span
                    animate={{ opacity: [1, 1, 0, 0] }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear", times: [0, 0.5, 0.5, 1] }}
                    className="inline-block w-[6px] h-[1em] bg-neutral-300 ml-1 align-text-bottom"
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
