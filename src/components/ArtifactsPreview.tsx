"use client";
import React, { useState } from 'react';
import { 
  SandpackProvider, 
  SandpackLayout, 
  SandpackCodeEditor, 
  SandpackPreview 
} from "@codesandbox/sandpack-react";
import { X, Copy, Download, Zap, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from './GlassCard';

interface ArtifactsPreviewProps {
  code: string;
  language?: string;
  onClose?: () => void;
  title?: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function ArtifactsPreview({ code, language = 'html', onClose, title = "Artifact Preview", isExpanded, onToggleExpand }: ArtifactsPreviewProps) {
  const [viewMode, setViewMode] = useState<'preview' | 'code' | 'split'>('preview');
  
  // Determine template based on language
  const isReact = language.toLowerCase() === 'tsx' || language.toLowerCase() === 'jsx' || language.toLowerCase() === 'react';
  const isHtml = language.toLowerCase() === 'html';
  const template = isReact ? 'react-ts' : (isHtml ? 'static' : 'vanilla');
  const filename = isReact ? '/App.tsx' : (isHtml ? '/index.html' : '/index.js');

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `artifact-${Date.now()}.${isHtml ? 'html' : isReact ? 'tsx' : 'js'}`;
    a.click();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#050505] overflow-hidden">
      {/* Premium Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-[#0a0a0a] border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
             <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight line-clamp-1">{title}</h3>
            <div className="flex items-center gap-2 mt-0.5">
               <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
               <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.15em] text-white/30">Instant Preview • Live</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2">
           <div className="flex items-center bg-white/5 p-1 rounded-xl mr-1 sm:mr-2 scale-90 sm:scale-100">
              <button 
                onClick={() => setViewMode('preview')} 
                className={cn("px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[8px] sm:text-[10px] font-black uppercase tracking-widest transition-all", viewMode === 'preview' ? "bg-white text-black shadow-lg" : "text-white/30 hover:text-white")}
              >
                Preview
              </button>
              <button 
                onClick={() => setViewMode('code')} 
                className={cn("px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[8px] sm:text-[10px] font-black uppercase tracking-widest transition-all", viewMode === 'code' ? "bg-white text-black shadow-lg" : "text-white/30 hover:text-white")}
              >
                Code
              </button>
              <button 
                onClick={() => setViewMode('split')} 
                className={cn("px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[8px] sm:text-[10px] font-black uppercase tracking-widest transition-all hidden sm:block", viewMode === 'split' ? "bg-white text-black shadow-lg" : "text-white/30 hover:text-white")}
              >
                Split
              </button>
           </div>

           <button onClick={onToggleExpand} className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-all mr-1" title={isExpanded ? "Collapse" : "Full Screen"}>
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
           </button>

           <button onClick={handleCopy} className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-all hidden sm:block">
              <Copy className="w-4 h-4" />
           </button>
           <button onClick={handleDownload} className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-all hidden sm:block">
              <Download className="w-4 h-4" />
           </button>
           <div className="w-[1px] h-4 bg-white/10 mx-1 hidden sm:block" />
           {onClose && (
             <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-red-500/10 rounded-lg text-white/20 hover:text-red-400 transition-all">
               <X className="w-5 h-5" />
             </button>
           )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-[#050505] relative">
        <style>{`
          .sp-layout { height: 100% !important; border: none !important; border-radius: 0 !important; background: transparent !important; }
          .sp-stack { height: 100% !important; }
          .sp-pane { height: 100% !important; }
          .sp-wrapper { height: 100% !important; }
        `}</style>
        
        <SandpackProvider
          template={template}
          theme="dark"
          files={{
            [filename]: code,
            ...(!isReact && !isHtml && { '/index.js': '' })
          }}
          options={{
            classes: {
              "sp-layout": "h-full",
              "sp-stack": "h-full",
            }
          }}
        >
          <SandpackLayout>
            {(viewMode === 'code' || viewMode === 'split') && (
              <SandpackCodeEditor 
                showLineNumbers 
                showTabs={false} 
                style={{ height: '100%' }}
              />
            )}
            {(viewMode === 'preview' || viewMode === 'split') && (
              <SandpackPreview 
                showNavigator={viewMode === 'split'} 
                style={{ height: '100%' }}
              />
            )}
          </SandpackLayout>
        </SandpackProvider>
      </div>
    </div>
  );
}

