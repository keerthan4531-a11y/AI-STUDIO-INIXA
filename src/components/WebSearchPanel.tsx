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

  if (sources.length === 0 && !isSearching) return null;

  const displayedSources = expanded ? sources : sources.slice(0, 3);

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Sources Header */}
      {!isSearching && sources.length > 0 && (
        <div className="flex items-center gap-2 mb-1">
          <Search className="w-4 h-4 text-white/50" />
          <span className="text-sm font-bold text-white/90">Sources</span>
        </div>
      )}

      {/* Perplexity-style source cards */}
      {sources.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {displayedSources.map((s, i) => (
            <motion.a
              key={i} href={s.link} target="_blank" rel="noopener noreferrer"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="flex flex-col gap-1.5 p-3.5 rounded-2xl bg-[#202123]/80 hover:bg-[#2a2b32] border border-white/[0.05] transition-all group cursor-pointer w-full max-w-2xl"
            >
              {/* Domain & Favicon */}
              <div className="flex items-center gap-2">
                <img src={getFaviconUrl(s.link)} alt="" className="w-4 h-4 rounded-sm" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <span className="text-[12px] font-medium text-white/60">{getDomain(s.link)}</span>
              </div>
              
              {/* Title */}
              <h3 className="text-[14px] font-semibold text-white/90 group-hover:text-blue-400 transition-colors leading-snug line-clamp-2">
                {s.title}
              </h3>
              
              {/* Date / Snippet */}
              {s.snippet && (
                <p className="text-[12px] text-white/40 line-clamp-1 mt-0.5">
                  {s.snippet.slice(0, 80)}...
                </p>
              )}
            </motion.a>
          ))}
          {sources.length > 3 && !expanded && (
            <button 
              onClick={() => setExpanded(true)}
              className="text-[13px] font-bold text-white/70 hover:text-white text-left mt-1 py-1"
            >
              More
            </button>
          )}
        </div>
      )}
      
      {/* Searching State */}
      {isSearching && sources.length === 0 && (
        <div className="flex items-center gap-3 py-2">
          <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
          <span className="text-[13px] font-medium text-white/50">Searching the web...</span>
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

