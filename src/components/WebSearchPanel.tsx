"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, ExternalLink, Search, CheckCircle2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

export interface SearchSource {
  title: string;
  link: string;
  snippet?: string;
  favicon?: string;
  status: 'searching' | 'found' | 'done';
}

function getFaviconUrl(url: string): string {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`; } catch { return ''; }
}
function getDomain(url: string): string {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
}

interface WebSearchPanelProps {
  isSearching: boolean;
  sources: SearchSource[];
  query: string;
}

export function WebSearchPanel({ isSearching, sources, query }: WebSearchPanelProps) {
  const [expanded, setExpanded] = useState(false);

  // Automatically expand if we just got sources
  useEffect(() => {
    if (sources.length > 0) setExpanded(true);
  }, [sources.length]);

  if (sources.length === 0 && !isSearching) return null;

  return (
    <div className="w-full max-w-3xl my-2">
      <div 
        className="flex items-center gap-2 cursor-pointer text-white/70 hover:text-white transition-colors select-none w-fit"
        onClick={() => setExpanded(!expanded)}
      >
        <Globe className="w-4 h-4" />
        <span className="text-[14px] font-medium">Searched the web</span>
        {expanded ? <ChevronUp className="w-4 h-4 opacity-50" /> : <ChevronDown className="w-4 h-4 opacity-50" />}
      </div>
      
      <AnimatePresence>
        {expanded && sources.length > 0 && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-3"
          >
            <div className="border-l border-white/10 ml-2 pl-6 py-1 flex flex-col gap-4">
              
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between pr-2">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-white/40" />
                    <span className="text-[13px] text-white/60 font-medium">{query || 'Web Search'}</span>
                  </div>
                  <span className="text-[12px] text-white/40">{sources.length} results</span>
                </div>
                
                <div className="flex flex-col rounded-xl bg-white/[0.02] border border-white/10 overflow-hidden divide-y divide-white/[0.05]">
                  {sources.map((s, i) => (
                    <a 
                      key={i} 
                      href={s.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 hover:bg-white/[0.05] transition-colors group"
                    >
                      <div className="flex items-center gap-3 overflow-hidden mr-4">
                        <div className="w-5 h-5 shrink-0 bg-white/5 rounded flex items-center justify-center">
                          <img src={getFaviconUrl(s.link)} alt="" className="w-3.5 h-3.5 rounded-sm" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        </div>
                        <span className="text-[13px] font-medium text-white/80 group-hover:text-blue-400 truncate leading-relaxed">{s.title}</span>
                      </div>
                      <span className="text-[12px] text-white/40 shrink-0 max-w-[150px] truncate">{getDomain(s.link)}</span>
                    </a>
                  ))}
                </div>
              </div>
              
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {isSearching && sources.length === 0 && (
        <div className="flex items-center gap-2 mt-2 ml-2 pl-6 border-l border-white/10 text-white/50 py-2">
          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          <span className="text-[13px]">Searching...</span>
        </div>
      )}
    </div>
  );
}

export function WebSearchToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <motion.button whileTap={{ scale: 0.9 }} onClick={onToggle} className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all border ${enabled ? 'bg-blue-500/15 border-blue-500/40 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.15)]' : 'bg-white/[0.03] border-white/10 text-white/30 hover:text-white/60 hover:bg-white/[0.06]'}`}>
      <Globe className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">Search</span>
    </motion.button>
  );
}

