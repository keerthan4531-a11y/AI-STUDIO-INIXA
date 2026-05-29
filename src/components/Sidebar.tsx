"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Search, MessageSquare, Image as ImageIcon, Video, ChevronDown, Plus, X, Download, Settings2, FileCode, Trash2, Info, Sparkles, Code2, Mic, MoreHorizontal, Globe, BookMarked, Music } from 'lucide-react';
import { cn } from './GlassCard';
import { InixaLogo } from './Logos';
import { vibrate } from '../utils/helpers';
import type { UserData } from './AuthScreen';
import type { ChatSession } from '../App';

export type TabType = 'video' | 'image' | 'chat' | 'codex' | 'pdf' | 'profile' | 'about' | 'vibe' | 'api' | 'voice' | 'deep-research' | 'note-ix' | 'music';

interface SidebarProps {
  user: UserData;
  activeTab: TabType;
  onTabChange: (t: TabType) => void;
  onNewChat: () => void;
  onSelectSession?: (id: string) => void;
  onDeleteSession?: (id: string) => void;
  chatSessions?: ChatSession[];
  activeSessionId?: string | null;
  onOpenModelSelector: () => void;
  chatKey: number;
  setChatKey: (fn: (prev: number) => number) => void;
}

// Desktop permanent sidebar
export function DesktopSidebar({ user, activeTab, onTabChange, onNewChat, onSelectSession, onDeleteSession, chatSessions = [], activeSessionId, onOpenModelSelector, chatKey, setChatKey }: SidebarProps) {
  if (activeTab === 'vibe' || activeTab === 'note-ix') {
    return (
      <aside className="hidden lg:flex flex-col w-[60px] items-center bg-[#0b0c14]/50 backdrop-blur-3xl border-r border-white/[0.05] sticky top-0 z-[100] h-screen shrink-0 py-6 transition-all hover:bg-[#0b0c14]/80">
        <button onClick={() => onTabChange('chat')} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all mb-4 group relative" title="Back to Chat">
          <InixaLogo size={24} className="text-white group-hover:scale-110 transition-transform" />
        </button>
        <button onClick={() => onTabChange('chat')} className="p-2 text-white/50 hover:text-white mt-auto group relative" title="Expand Menu">
          <MoreHorizontal className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="hidden lg:flex flex-col w-[280px] bg-[#05060b]/60 backdrop-blur-[60px] saturate-[150%] border-r border-white/[0.04] sticky top-0 z-[100] h-screen shrink-0 transition-all shadow-[10px_0_40px_rgba(0,0,0,0.5)]">
      <div className="p-7 flex flex-col h-full">
        <div className="flex items-center gap-4 mb-12 relative group cursor-default">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <InixaLogo size={40} className="rounded-xl shadow-[0_8px_32px_rgba(99,102,241,0.2)] relative z-10" />
          </div>
          <div>
            <h1 className="text-[19px] font-black tracking-tight uppercase leading-none text-white font-['Plus_Jakarta_Sans']">Inixa</h1>
            <span className="text-indigo-400 font-bold uppercase tracking-[0.2em] text-[9px] opacity-80">AI Studio</span>
          </div>
        </div>

        <div className="space-y-1.5 mb-8 flex-1 overflow-y-auto hide-scrollbar">
          {[
            { id: 'search', icon: Search, label: 'Search', kbd: '⌘K' },
            { id: 'chat', icon: MessageSquare, label: 'Chat' },
            { id: 'deep-research', icon: Globe, label: 'Deep Research', kbd: 'AUTO' },
            { id: 'note-ix', icon: BookMarked, label: 'NOTE-IX', kbd: 'STUDIO' },
            { id: 'vibe', icon: Sparkles, label: 'Vibe Studio', kbd: 'ELITE' },
            { id: 'pdf', icon: FileCode, label: 'Chat with PDF', kbd: 'RAG' },
            { id: 'image', icon: ImageIcon, label: 'Imagine' },
            { id: 'video', icon: Video, label: 'Video' },
            { id: 'music', icon: Music, label: 'Neural Music', kbd: 'PRO' },
            { id: 'voice', icon: Mic, label: 'Voice Assistant', kbd: 'NEW' },
            { id: 'api', icon: Code2, label: 'API Service', kbd: 'DEV' },
            { id: 'about', icon: Info, label: 'About' },
          ].map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { if (item.id !== 'search') onTabChange(item.id as TabType); }}
                className={cn(
                  "w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                  isActive 
                    ? "text-white" 
                    : "text-white/40 hover:text-white"
                )}
              >
                {/* Active/Hover Background */}
                <div className={cn(
                  "absolute inset-0 transition-all duration-300",
                  isActive 
                    ? "bg-white/[0.08] border border-white/[0.05] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]" 
                    : "opacity-0 group-hover:opacity-100 bg-white/[0.03] border border-transparent group-hover:border-white/[0.02]"
                )} />
                
                {/* Active Glow */}
                {isActive && (
                  <div className="absolute left-0 top-1/4 bottom-1/4 w-[3px] bg-indigo-400 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                )}

                <div className="flex items-center gap-3.5 relative z-10">
                 <item.icon className={cn(
                   "w-4 h-4 transition-transform duration-300",
                   isActive ? "text-indigo-400" : "group-hover:scale-110",
                   item.id === 'vibe' && isActive && "text-fuchsia-400",
                   item.id === 'note-ix' && isActive && "text-fuchsia-400",
                   item.id === 'deep-research' && isActive && "text-emerald-400"
                 )} />
                 <span className={cn(
                   "text-[14px] tracking-wide transition-all duration-300",
                   isActive ? "font-bold" : "font-medium"
                 )}>{item.label}</span>
                </div>
                {item.kbd && (
                  <span className={cn(
                    "relative z-10 text-[9px] px-1.5 py-0.5 rounded border transition-all duration-300",
                    isActive 
                      ? "text-indigo-300 border-indigo-400/30 bg-indigo-500/10 font-bold" 
                      : "text-white/20 font-bold border-white/10 group-hover:border-white/20 group-hover:text-white/40 bg-black/20"
                  )}>{item.kbd}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 mb-8">
          <p className="px-3 text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Recent</p>
          <div className="flex flex-col gap-0.5 overflow-y-auto hide-scrollbar max-h-[30vh]">
            {chatSessions.length === 0 && (
              <span className="px-3 py-2 text-[12px] text-white/30 italic">No recent chats</span>
            )}
            {chatSessions.map((session) => (
              <div key={session.id} className="group/item relative">
                <button 
                  onClick={() => onSelectSession?.(session.id)}
                  className={cn(
                    "w-full px-3 py-2 text-[13px] rounded-lg text-left truncate transition-all font-medium pr-8",
                    activeSessionId === session.id 
                      ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                      : "text-white/40 hover:text-white hover:bg-white/5 border border-transparent"
                  )}
                >
                  {session.title || "New conversation"}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteSession?.(session.id); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-white/0 group-hover/item:text-white/20 hover:!text-red-400 transition-all rounded-md hover:bg-red-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-2">
            <button 
              onClick={onNewChat}
              className="flex items-center gap-2 px-3 py-2 text-white/30 hover:text-white transition-all text-[12px] font-bold group"
            >
              <Plus className="w-3.5 h-3.5 group-hover:scale-110" /> New Chat
            </button>
            {chatSessions.length > 0 && (
              <button 
                onClick={() => { if (confirm('Clear all chat history?')) { localStorage.removeItem('inixa_chat_sessions'); window.location.reload(); } }}
                className="flex items-center gap-2 px-3 py-2 text-white/10 hover:text-red-400/60 transition-all text-[11px] font-bold group"
              >
                <Trash2 className="w-3 h-3" /> Clear All
              </button>
            )}
          </div>
        </div>

        <div className="mt-auto space-y-4">
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => onTabChange('profile')}>
              <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-[12px] font-bold shadow-lg border border-white/10 group-hover:border-indigo-400 transition-all">
                {user.name.charAt(0)}
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-bold text-white group-hover:text-indigo-300 transition-colors">{user.name}</span>
                <span className="text-[9px] text-white/20 font-black uppercase tracking-widest">Premium</span>
              </div>
            </div>
            <Settings2 className="w-5 h-5 text-white/20 hover:text-white cursor-pointer transition-colors" onClick={onOpenModelSelector} />
          </div>
        </div>
      </div>
    </aside>
  );
}

// Mobile slide-out sidebar
export function MobileSidebar({ 
  user, activeTab, onTabChange, onNewChat, onSelectSession, onDeleteSession, chatSessions = [], activeSessionId, onOpenModelSelector, onClose 
}: SidebarProps & { onClose: () => void }) {
  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm lg:hidden"
      />
      <motion.div 
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: "spring", stiffness: 300, damping: 35 }}
        className="fixed top-0 left-0 bottom-0 z-[200] w-[280px] bg-[#08090a] border-r border-white/5 p-4 flex flex-col gap-6 shadow-[20px_0_50px_rgba(0,0,0,0.5)] lg:hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-2 mb-2">
          <InixaLogo size={32} className="rounded-lg shadow-lg shadow-indigo-500/10" />
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <div className="flex flex-col gap-1">
          {[
            { id: 'chat', icon: MessageSquare, label: 'Chat' },
            { id: 'deep-research', icon: Globe, label: 'Deep Research' },
            { id: 'note-ix', icon: BookMarked, label: 'NOTE-IX' },
            { id: 'vibe', icon: Sparkles, label: 'Vibe Studio' },
            { id: 'pdf', icon: FileCode, label: 'Chat with PDF' },
            { id: 'image', icon: ImageIcon, label: 'Imagine' },
            { id: 'video', icon: Video, label: 'Video' },
            { id: 'music', icon: Music, label: 'Neural Music' },
            { id: 'voice', icon: Mic, label: 'Voice Assistant' },
            { id: 'api', icon: Code2, label: 'API Service' },
            { id: 'about', icon: Info, label: 'About' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => { onTabChange(item.id as TabType); onClose(); }}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
                activeTab === item.id 
                  ? "bg-white/10 text-white" 
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[14px] font-medium tracking-tight">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Actions & History */}
        <div className="flex flex-col gap-2 mt-2 flex-1 min-h-0">
          <button 
            onClick={() => { onNewChat(); onClose(); }}
            className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all text-[14px] font-bold shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" /> New Chat
          </button>
          
          <p className="px-2 mt-4 text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Recent</p>
          <div className="flex flex-col gap-1 overflow-y-auto hide-scrollbar">
            {chatSessions.filter(s => {
              if (activeTab === 'pdf') return s.type === 'pdf';
              return !s.type || s.type === 'chat';
            }).length === 0 && (
              <span className="px-2 py-2 text-[12px] text-white/30 italic">No recent {activeTab === 'pdf' ? 'PDF' : ''} chats</span>
            )}
            {chatSessions
              .filter(s => {
                if (activeTab === 'pdf') return s.type === 'pdf';
                return !s.type || s.type === 'chat';
              })
              .map((session) => (
                <div key={session.id} className="group/item relative">
                  <button 
                    onClick={() => { onSelectSession?.(session.id); onClose(); }}
                    className={cn(
                      "w-full px-3 py-3 text-[13px] rounded-lg text-left truncate transition-all font-medium pr-10",
                      activeSessionId === session.id 
                        ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                        : "text-white/40 hover:text-white hover:bg-white/5 border border-transparent"
                    )}
                  >
                    {session.title || "New conversation"}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteSession?.(session.id); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white/20 hover:text-red-400 transition-all rounded-md"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
            ))}
          </div>
          {chatSessions.length > 0 && (
            <button 
              onClick={() => { if (confirm('Clear all chat history?')) { localStorage.removeItem('inixa_chat_sessions'); window.location.reload(); } }}
              className="flex items-center justify-center gap-2 w-full py-2 mt-2 text-white/20 hover:text-red-400 transition-all text-[12px] font-bold"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear All History
            </button>
          )}
        </div>

        {/* Profile */}
        <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between px-2">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => { onTabChange('profile'); onClose(); }}>
            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-[12px] font-bold shadow-lg border border-white/10 group-hover:border-indigo-400 transition-all">
              {user.name.charAt(0)}
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-bold text-white group-hover:text-indigo-300 transition-colors">{user.name}</span>
              <span className="text-[10px] text-white/20 font-bold uppercase tracking-widest">Premium</span>
            </div>
          </div>
          <button onClick={() => { onOpenModelSelector(); onClose(); }} className="p-2 text-white/20 hover:text-white transition-colors">
             <Settings2 className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    </>
  );
}

