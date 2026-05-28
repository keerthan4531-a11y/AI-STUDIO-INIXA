"use client";
import React, { useState } from 'react';
import { Notebook } from './NoteIXTypes';
import { SourceManager } from './SourceManager';
import { NoteIXChat } from './NoteIXChat';
import { StudioPanel } from './StudioPanel';
import { type AIModel } from '../../api/aiEngine';
import { BookMarked, MessageSquare, Sparkles, Book, LayoutDashboard } from 'lucide-react';

export function NoteIXLayout({ currentModel, setShowModelSelector }: { currentModel: AIModel; setShowModelSelector: (s: boolean) => void }) {
  const [mobileTab, setMobileTab] = useState<'sources' | 'chat' | 'studio'>('chat');
  
  // Temporary mock state, later move to Context or custom hook hooked to IndexedDB
  const [notebook, setNotebook] = useState<Notebook>({
    id: '1',
    title: 'Untitled Notebook',
    sources: [],
    chatHistory: [],
    artifacts: [],
    lastAccessed: Date.now()
  });

  return (
    <div className="absolute inset-0 w-full flex flex-col overflow-hidden lg:p-6 lg:pb-0 lg:gap-6 bg-gradient-to-br from-[#050508] via-[#0a0a0f] to-[#050508]">
      {/* Dynamic Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-fuchsia-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between shrink-0 px-4 py-3 lg:px-2 lg:py-0 relative z-10 border-b border-white/[0.05] lg:border-none bg-white/[0.02] lg:bg-transparent backdrop-blur-md lg:backdrop-blur-none">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.1)] backdrop-blur-md">
            <BookMarked className="w-6 h-6 text-fuchsia-300 drop-shadow-[0_0_10px_rgba(217,70,239,0.8)]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-fuchsia-100 to-white/70 tracking-tight font-['Plus_Jakarta_Sans'] drop-shadow-sm">{notebook.title}</h1>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-fuchsia-400/80 mt-1">NOTE-IX Premium Workspace</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 backdrop-blur-md text-xs font-bold text-white transition-all border border-white/10 shadow-lg hover:shadow-white/5">Share</button>
          <button className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-xs font-bold text-white transition-all shadow-[0_0_20px_rgba(192,38,211,0.4)] hover:shadow-[0_0_30px_rgba(192,38,211,0.6)] border border-fuchsia-400/30">Notebook Guide</button>
        </div>
      </div>

      {/* 3-Column Workspace (Desktop) / 1-Column with Tabs (Mobile) */}
      <div className="flex-1 flex flex-col lg:flex-row gap-5 overflow-hidden lg:mt-2 relative z-10 pb-16 lg:pb-0">
        
        {/* Column 1: Sources (Left Sidebar) */}
        <div className={`w-full lg:w-[300px] shrink-0 flex-col min-h-0 lg:apple-glass-card lg:border border-white/10 overflow-hidden lg:shadow-[0_8px_32px_rgba(0,0,0,0.4)] lg:rounded-3xl ${mobileTab === 'sources' ? 'flex h-full' : 'hidden lg:flex lg:h-full'}`}>
          <SourceManager notebook={notebook} setNotebook={setNotebook} />
        </div>

        {/* Column 2: Chat (Main Center) */}
        <div className={`flex-1 flex-col min-h-0 lg:apple-glass lg:border border-white/10 overflow-hidden relative lg:shadow-[inset_0_0_30px_rgba(255,255,255,0.02),0_8px_32px_rgba(0,0,0,0.4)] lg:rounded-3xl ${mobileTab === 'chat' ? 'flex h-full' : 'hidden lg:flex lg:h-full'}`}>
          <NoteIXChat notebook={notebook} setNotebook={setNotebook} currentModel={currentModel} />
        </div>

        {/* Column 3: Studio / Output (Right Sidebar) */}
        <div className={`w-full lg:w-[340px] shrink-0 flex-col min-h-0 lg:apple-glass-card lg:border border-white/10 overflow-hidden lg:shadow-[0_8px_32px_rgba(0,0,0,0.4)] lg:rounded-3xl ${mobileTab === 'studio' ? 'flex h-full' : 'hidden lg:flex lg:h-full'}`}>
          <StudioPanel notebook={notebook} setNotebook={setNotebook} currentModel={currentModel} />
        </div>

      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="lg:hidden absolute bottom-0 left-0 right-0 h-16 bg-black/60 backdrop-blur-xl border-t border-white/10 z-50 flex items-center justify-around px-4">
        <button 
          onClick={() => setMobileTab('sources')}
          className={`flex flex-col items-center justify-center gap-1 w-20 h-full transition-colors ${mobileTab === 'sources' ? 'text-fuchsia-400' : 'text-white/50 hover:text-white/80'}`}
        >
          <Book className={`w-5 h-5 ${mobileTab === 'sources' ? 'drop-shadow-[0_0_8px_rgba(232,121,249,0.8)]' : ''}`} />
          <span className="text-[10px] font-bold">Sources</span>
        </button>
        
        <button 
          onClick={() => setMobileTab('chat')}
          className={`flex flex-col items-center justify-center gap-1 w-20 h-full transition-colors ${mobileTab === 'chat' ? 'text-fuchsia-400' : 'text-white/50 hover:text-white/80'}`}
        >
          <MessageSquare className={`w-5 h-5 ${mobileTab === 'chat' ? 'drop-shadow-[0_0_8px_rgba(232,121,249,0.8)]' : ''}`} />
          <span className="text-[10px] font-bold">Chat</span>
        </button>

        <button 
          onClick={() => setMobileTab('studio')}
          className={`flex flex-col items-center justify-center gap-1 w-20 h-full transition-colors ${mobileTab === 'studio' ? 'text-fuchsia-400' : 'text-white/50 hover:text-white/80'}`}
        >
          <LayoutDashboard className={`w-5 h-5 ${mobileTab === 'studio' ? 'drop-shadow-[0_0_8px_rgba(232,121,249,0.8)]' : ''}`} />
          <span className="text-[10px] font-bold">Studio</span>
        </button>
      </div>
    </div>
  );
}
