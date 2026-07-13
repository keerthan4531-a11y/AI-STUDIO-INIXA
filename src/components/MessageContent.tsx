"use client";
import React, { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FileCode, Maximize2, Minimize2, Brain, Copy, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import mermaid from 'mermaid';
import { useState } from 'react';
import { DataChartAgent } from './DataChartAgent';
import { MathSolverAgent } from './MathSolverAgent';
import { FlashcardAgent } from './FlashcardAgent';
import { QuizAgent } from './QuizAgent';


mermaid.initialize({
  startOnLoad: true,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'Inter, system-ui, sans-serif',
  flowchart: { useMaxWidth: false, htmlLabels: true, curve: 'basis' },
  mindmap: { useMaxWidth: false },
  sequence: { useMaxWidth: false },
  gantt: { useMaxWidth: false },
  state: { useMaxWidth: false },
});

function Mermaid({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (ref.current && chart) {
      // Basic cleanup for AI generated charts with unescaped quotes in labels
      let cleanChart = chart.replace(/\[(.*?)"(.*?)"(.*?)\]/g, '[$1&quot;$2&quot;$3]');
      
      const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
      mermaid.render(id, cleanChart)
        .then((res) => {
          if (ref.current) {
            ref.current.innerHTML = res.svg;
            const svg = ref.current.querySelector('svg');
            if (svg) {
              svg.style.maxWidth = isFullscreen ? '100%' : 'none';
              svg.style.height = 'auto';
              svg.style.display = 'block';
              svg.style.margin = '0 auto';
              // Ensure it's readable on mobile by setting a minimum width if it's too small
              if (!isFullscreen && window.innerWidth < 640) {
                 svg.style.minWidth = '600px'; 
              }
            }
          }
          setError(null);
        })
        .catch(err => {
          setError(err.message || "Mermaid Syntax Error");
        });
    }
  }, [chart, isFullscreen]);

  return (
    <div className={`relative bg-white/[0.03] p-4 sm:p-8 rounded-3xl border border-white/10 my-8 group/mermaid transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-[9999] bg-[#0a0a0b]/98 p-6 sm:p-12 overflow-auto flex flex-col items-center' : 'overflow-x-auto min-h-[100px] flex flex-col items-center'}`}>
      
      {/* Controls */}
      <div className={`flex gap-2 mb-4 transition-opacity ${isFullscreen ? 'fixed top-6 right-6 z-[10000]' : 'absolute top-4 right-4 opacity-0 group-hover/mermaid:opacity-100'}`}>
        <button 
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all shadow-xl backdrop-blur-md"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      <div 
        ref={ref} 
        className={`${error ? 'hidden' : 'block'} w-full transition-all duration-500 ${isFullscreen ? 'max-w-6xl mx-auto my-auto' : ''}`}
      />
      
      {error && (
        <div className="w-full text-red-400/80 text-[11px] font-mono bg-red-500/10 p-4 rounded-2xl border border-red-500/20 max-w-md">
          <span className="font-bold block mb-1">Graph Rendering Error (Waiting for complete code...):</span>
          {error.split('\n')[0]} 
        </div>
      )}

      {!error && !isFullscreen && (
        <div className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/20 flex items-center gap-2 sm:hidden">
          <div className="w-8 h-[1px] bg-white/10" />
          Swipe to scroll
          <div className="w-8 h-[1px] bg-white/10" />
        </div>
      )}
    </div>
  );
}

function CodeBlockHeader({ lang, codeString, onOpenArtifact }: { lang: string; codeString: string; onOpenArtifact?: (type: string, data: string, title: string) => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="px-4 py-2.5 bg-[#141416] border-b border-white/[0.08] flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <FileCode className="w-4 h-4 text-blue-400" />
        <span className="text-[11px] font-black uppercase tracking-widest text-white/40">{lang || 'Code'}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        {onOpenArtifact && (
          <button 
            onClick={() => onOpenArtifact(lang || 'text', codeString, `${lang || 'Code'} Artifact`)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all"
          >
            <Maximize2 className="w-3 h-3" /> Artifact
          </button>
        )}
      </div>
    </div>
  );
}

export function MessageContent({ content, isCodex, onOpenArtifact }: { 
  content: string; 
  isCodex: boolean; 
  onOpenArtifact?: (type: string, data: string, title: string) => void;
}) {
  const cleanContent = content.includes('[SEARCH_MODE_ACTIVE]') ? content.split('\n\n')[1] || content : content.split('\n\n*(')[0];

  // Pre-process LaTeX delimiters: convert \[...\] to $$...$$ and \(...\) to $...$
  const processedContent = cleanContent
    .replace(/\\\[([\s\S]*?)\\\]/g, '$$$$\n$1\n$$$$')
    .replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$')
    // Handle cases where the AI uses [ ... ] for math blocks without backslashes
    // This is common in some models. We check if the content looks like LaTeX.
    .replace(/^\[([\s\S]*?)\]$/gm, (match, p1) => {
      if (p1.includes('\\') || p1.includes('_') || p1.includes('^')) {
        return `$$$$\n${p1}\n$$$$`;
      }
      return match;
    });
  
  return (
    <div className="text-[14.5px] sm:text-[15px] leading-[1.7] markdown-content text-white/85 break-words">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm, remarkMath]} 
        rehypePlugins={[rehypeKatex]} 
        components={{
        code({ node, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '');
          const lang = match ? match[1] : '';
          const codeString = String(children).replace(/\n$/, '');

          if (lang === 'mermaid') {
            return <Mermaid chart={codeString} />;
          }

          // Robust JSON detection: check if language is json OR if content looks like a tool JSON
          const isPotentialJson = lang === 'json' || (codeString.trim().startsWith('{') && codeString.trim().endsWith('}'));
          
          if (isPotentialJson) {
             try {
                // Remove potential leading "json" if the AI included it inside the block
                const cleanJson = codeString.trim().replace(/^json\s+/, '').trim();
                const parsed = JSON.parse(cleanJson);
                
                if (parsed && (parsed.type === 'line' || parsed.type === 'bar' || parsed.type === 'pie' || parsed.type === 'scatter')) {
                   return (
                     <div className="my-6 w-full max-w-full overflow-hidden">
                       <DataChartAgent {...parsed} />
                     </div>
                   );
                }

                if (parsed && parsed.type === 'math-solver') {
                   return (
                     <div className="my-6 w-full max-w-full overflow-hidden">
                       <MathSolverAgent {...(parsed.data || parsed)} />
                     </div>
                   );
                }

                if (parsed && parsed.type === 'flashcards') {
                   return (
                     <div className="my-6 w-full max-w-full overflow-hidden">
                       <FlashcardAgent {...parsed} />
                     </div>
                   );
                }

                if (parsed && parsed.type === 'quiz') {
                   return (
                     <div className="my-6 w-full max-w-full overflow-hidden">
                       <QuizAgent {...parsed} />
                     </div>
                   );
                }
             } catch(e) {
                // If it fails to parse but was explicitly json, we show it as code later
             }
          }

          if (match || codeString.includes('\n')) {
            return (
              <div className="my-6 rounded-2xl overflow-hidden bg-[#0a0a0b] border border-white/[0.08] shadow-2xl group/code">
                <CodeBlockHeader lang={lang} codeString={codeString} onOpenArtifact={onOpenArtifact} />
                <SyntaxHighlighter
                  language={lang}
                  style={atomDark}
                  customStyle={{ 
                    margin: 0, 
                    padding: window.innerWidth < 640 ? '12px' : '20px', 
                    background: 'transparent', 
                    fontSize: window.innerWidth < 640 ? '12px' : '13.5px', 
                    lineHeight: '1.7' 
                  }}
                  codeTagProps={{ style: { fontFamily: '"JetBrains Mono", monospace' } }}
                >
                  {codeString}
                </SyntaxHighlighter>
              </div>
            );
          }
          return <code className="bg-white/[0.08] px-1.5 py-0.5 rounded-md text-[#e2a874] font-mono text-[13.5px] border border-white/[0.05]" {...props}>{children}</code>;
        },
        a: ({ href, children }: any) => <a href={href} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-4 decoration-blue-400/30 transition-colors font-semibold">{children}</a>,
        p: ({ children }: any) => <p className="mb-3 last:mb-0 leading-[1.7]">{children}</p>,
        ul: ({ children }: any) => <ul className="list-disc pl-5 sm:pl-6 mb-4 sm:mb-5 space-y-2 marker:text-white/20">{children}</ul>,
        ol: ({ children }: any) => <ol className="list-decimal pl-5 sm:pl-6 mb-4 sm:mb-5 space-y-2 marker:text-white/20">{children}</ol>,
        li: ({ children }: any) => <li className="pl-0.5">{children}</li>,
        strong: ({ children }: any) => <strong className="font-bold text-white tracking-[0.01em]">{children}</strong>,
        blockquote: ({ children }: any) => <blockquote className="border-l-4 border-blue-500/50 bg-blue-500/10 px-6 py-5 rounded-r-3xl my-6 text-blue-200/90 text-[15px] italic shadow-sm">{children}</blockquote>,
        h1: ({ children }: any) => <h1 className="text-2xl sm:text-3xl font-black mt-8 mb-4 sm:mt-10 sm:mb-6 text-white tracking-tight border-b border-white/10 pb-2">{children}</h1>,
        h2: ({ children }: any) => <h2 className="text-xl sm:text-2xl font-bold mt-7 mb-4 sm:mt-9 sm:mb-5 text-white tracking-tight">{children}</h2>,
        h3: ({ children }: any) => <h3 className="text-lg sm:text-xl font-bold mt-6 mb-3 sm:mt-8 sm:mb-4 text-white tracking-tight">{children}</h3>,
        table: ({ children }: any) => <div className="overflow-x-auto my-7 -mx-4 sm:mx-0 rounded-2xl sm:rounded-[24px] border border-white/10 shadow-2xl"><table className="w-full border-collapse text-[12px] sm:text-[14px] bg-[#0a0a0b]">{children}</table></div>,
        th: ({ children }: any) => <th className="border-b border-r last:border-r-0 border-white/10 bg-white/[0.04] px-3 py-3 sm:px-5 sm:py-4 text-left font-black uppercase tracking-widest text-[10px] sm:text-[11px] text-white/40">{children}</th>,
        td: ({ children }: any) => <td className="border-b border-r last:border-r-0 last:border-b-0 border-white/5 px-3 py-3 sm:px-5 sm:py-4 text-white/80">{children}</td>,
        img: ({ src, alt }: any) => (
          <div className="my-4 relative group rounded-2xl overflow-hidden max-w-sm sm:max-w-md border border-white/[0.08] shadow-2xl">
            <img 
              src={src} 
              alt={alt || "Generated Image"} 
              referrerPolicy="no-referrer" 
              className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.02]" 
            />
          </div>
        ),
      }}>
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}

