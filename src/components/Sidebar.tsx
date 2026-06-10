"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MessageSquare, Image as ImageIcon, Video, Plus, X, Settings2, FileCode, Trash2, Info, Sparkles, Code2, Mic, MoreHorizontal, Globe, BookMarked, Music } from 'lucide-react';
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

/* ============================
   Animation Variants
   ============================ */

const sidebarVariants = {
  open: { width: "240px" },
  closed: { width: "56px" },
};

const labelVariants = {
  open: { x: 0, opacity: 1, display: "block" },
  closed: { x: -10, opacity: 0, transitionEnd: { display: "none" } },
};

const staggerContainer = {
  open: { transition: { staggerChildren: 0.02, delayChildren: 0.05 } },
  closed: {},
};

const transitionProps = {
  type: "tween",
  ease: "easeOut",
  duration: 0.2,
} as any;

/* ============================
   Nav Items Config
   ============================ */

const navItems = [
  { id: 'chat', icon: MessageSquare, label: 'Chat' },
  { id: 'deep-research', icon: Globe, label: 'Deep Research', badge: 'AUTO' },
  { id: 'note-ix', icon: BookMarked, label: 'NOTE-IX', badge: 'STUDIO' },
  { id: 'vibe', icon: Sparkles, label: 'Vibe Studio', badge: 'ELITE' },
  { id: 'pdf', icon: FileCode, label: 'PDF Chat', badge: 'RAG' },
  { id: 'image', icon: ImageIcon, label: 'Imagine' },
  { id: 'video', icon: Video, label: 'Video' },
  { id: 'music', icon: Music, label: 'Neural Music', badge: 'PRO' },
  { id: 'voice', icon: Mic, label: 'Voice', badge: 'NEW' },
  { id: 'api', icon: Code2, label: 'API Service', badge: 'DEV' },
  { id: 'about', icon: Info, label: 'About' },
];

/* ============================
   Desktop Collapsible Sidebar
   ============================ */

export function DesktopSidebar({ user, activeTab, onTabChange, onNewChat, onSelectSession, onDeleteSession, chatSessions = [], activeSessionId, onOpenModelSelector }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  // For vibe/note-ix, show minimal sidebar
  if (activeTab === 'vibe' || activeTab === 'note-ix') {
    return (
      <aside className="hidden lg:flex flex-col w-[56px] items-center bg-[#08090f]/90 backdrop-blur-xl border-r border-white/[0.04] sticky top-0 z-[100] h-screen shrink-0 py-6 transition-all">
        <button onClick={() => onTabChange('chat')} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all mb-4 group" title="Back to Chat">
          <InixaLogo size={22} className="text-white group-hover:scale-110 transition-transform" />
        </button>
        <button onClick={() => onTabChange('chat')} className="p-2 text-white/40 hover:text-white mt-auto group" title="Expand Menu">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </aside>
    );
  }

  return (
    <motion.aside
      className="hidden lg:flex flex-col h-screen sticky top-0 z-[100] shrink-0 border-r border-white/[0.08] overflow-hidden"
      initial="closed"
      animate={isCollapsed ? "closed" : "open"}
      variants={sidebarVariants}
      transition={transitionProps}
      onMouseEnter={() => setIsCollapsed(false)}
      onMouseLeave={() => setIsCollapsed(true)}
    >
      <div className="relative flex flex-col h-full bg-[#171717]">
        {/* Logo */}
        <div className="flex items-center gap-3 h-[56px] px-4 border-b border-white/[0.08] shrink-0">
          <div className="w-7 h-7 shrink-0 flex items-center justify-center">
            <InixaLogo size={20} className="text-white" />
          </div>
          <motion.div variants={labelVariants} className="flex flex-col min-w-0 overflow-hidden">
            <span className="text-[14px] font-bold tracking-tight text-white leading-none">Inixa</span>
          </motion.div>
        </div>

        {/* New Chat button */}
        <div className="px-3 pt-4 pb-2 shrink-0">
          <button
            onClick={() => { onNewChat(); vibrate(30); }}
            className={cn(
              "flex items-center gap-2.5 w-full rounded-lg transition-all duration-200 group border",
              isCollapsed 
                ? "justify-center p-2.5 hover:bg-white/5 border-transparent" 
                : "px-3 py-2 bg-transparent hover:bg-white/[0.05] border-white/20"
            )}
          >
            <Plus className="w-4 h-4 text-white shrink-0 group-hover:scale-110 transition-transform" />
            <motion.span variants={labelVariants} className="text-[13px] font-medium text-white whitespace-nowrap">
              New chat
            </motion.span>
          </button>
        </div>

        {/* Nav Items */}
        <motion.div variants={staggerContainer} className="flex flex-col gap-0.5 px-2 pt-2 flex-1 min-h-0 overflow-y-auto hide-scrollbar">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { onTabChange(item.id as TabType); vibrate(20); }}
                className={cn(
                  "relative flex items-center gap-2.5 rounded-xl transition-all duration-200 group overflow-hidden",
                  isCollapsed ? "justify-center p-2.5" : "px-3 py-2.5",
                  isActive
                    ? "text-white"
                    : "text-white/40 hover:text-white/80"
                )}
              >
                {/* Active background */}
                {isActive && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute inset-0 bg-white/[0.07] border border-white/[0.06] rounded-xl"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                {/* Hover background */}
                <div className={cn(
                  "absolute inset-0 rounded-xl transition-opacity duration-200",
                  isActive ? "opacity-0" : "opacity-0 group-hover:opacity-100 bg-white/[0.03]"
                )} />
                {/* Active indicator bar */}
                {isActive && (
                  <div className="absolute left-0 top-[25%] bottom-[25%] w-[2.5px] bg-indigo-400 rounded-r-full shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                )}

                <item.icon className={cn(
                  "w-4 h-4 shrink-0 relative z-10 transition-all",
                  isActive ? "text-indigo-400" : "group-hover:scale-110",
                  item.id === 'vibe' && isActive && "text-fuchsia-400",
                  item.id === 'note-ix' && isActive && "text-fuchsia-400",
                  item.id === 'deep-research' && isActive && "text-emerald-400"
                )} />
                <motion.span 
                  variants={labelVariants} 
                  className={cn(
                    "text-[13px] whitespace-nowrap relative z-10 transition-all",
                    isActive ? "font-bold" : "font-medium"
                  )}
                >
                  {item.label}
                </motion.span>
                {item.badge && !isCollapsed && (
                  <motion.span 
                    variants={labelVariants}
                    className={cn(
                      "ml-auto text-[8px] px-1.5 py-0.5 rounded font-bold tracking-wider relative z-10 shrink-0",
                      isActive 
                        ? "text-indigo-300 border border-indigo-400/30 bg-indigo-500/10" 
                        : "text-white/15 border border-white/5 bg-black/20"
                    )}
                  >
                    {item.badge}
                  </motion.span>
                )}
              </button>
            );
          })}

          {/* Recent Chats Section (only when expanded) */}
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-3 pt-3 border-t border-white/[0.04] overflow-hidden"
              >
                <p className="px-2 text-[9px] font-black text-white/15 uppercase tracking-[0.2em] mb-2">Recent</p>
                <div className="flex flex-col gap-0.5 max-h-[20vh] overflow-y-auto hide-scrollbar">
                  {chatSessions.length === 0 && (
                    <span className="px-2 py-2 text-[11px] text-white/20 italic">No recent chats</span>
                  )}
                  {chatSessions.slice(0, 8).map((session) => (
                    <div key={session.id} className="group/item relative">
                      <button
                        onClick={() => { onSelectSession?.(session.id); vibrate(15); }}
                        className={cn(
                          "w-full px-3 py-2.5 text-[12px] rounded-lg text-left truncate transition-all font-medium pr-8",
                          activeSessionId === session.id
                            ? "bg-white/10 text-white shadow-sm"
                            : "text-white/40 hover:text-white hover:bg-white/[0.04]"
                        )}
                      >
                        {session.title || "New conversation"}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteSession?.(session.id); vibrate(30); }}
                        className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-transparent group-hover/item:text-white/20 hover:!text-red-400 transition-all rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Bottom: User + Settings */}
        <div className="mt-auto border-t border-white/[0.08] px-3 py-3 shrink-0">
          <button
            onClick={() => { onTabChange('profile'); vibrate(20); }}
            className={cn(
              "flex items-center gap-2.5 w-full rounded-lg transition-all duration-200 group",
              isCollapsed ? "justify-center p-2" : "px-2 py-2 hover:bg-white/[0.05]"
            )}
          >
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <motion.div variants={labelVariants} className="flex flex-col min-w-0 overflow-hidden text-left">
              <span className="text-[13px] font-medium text-white/90 group-hover:text-white truncate transition-colors">{user.name}</span>
            </motion.div>
            {!isCollapsed && (
              <motion.div variants={labelVariants} className="ml-auto">
                <Settings2 
                  className="w-4 h-4 text-white/40 hover:text-white transition-colors cursor-pointer shrink-0" 
                  onClick={(e) => { e.stopPropagation(); onOpenModelSelector(); }}
                />
              </motion.div>
            )}
          </button>
        </div>
      </div>
    </motion.aside>
  );
}

/* ============================
   Mobile Slide-Out Sidebar
   ============================ */

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
        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm lg:hidden"
      />
      <motion.div 
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: "spring", stiffness: 300, damping: 35 }}
        className="fixed top-0 left-0 bottom-0 z-[200] w-[280px] bg-[#08090f]/95 backdrop-blur-xl border-r border-white/[0.05] p-4 flex flex-col gap-4 shadow-[20px_0_60px_rgba(0,0,0,0.6)] lg:hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-1 mb-1">
          <div className="flex items-center gap-3">
            <InixaLogo size={28} className="rounded-lg shadow-lg shadow-indigo-500/10" />
            <div>
              <span className="text-[14px] font-black tracking-tight uppercase text-white block leading-none">Inixa</span>
              <span className="text-[8px] font-bold uppercase tracking-[0.15em] text-indigo-400/70">AI Studio</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white transition-colors rounded-lg hover:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat */}
        <button 
          onClick={() => { onNewChat(); onClose(); }}
          className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/20 text-indigo-300 rounded-xl transition-all text-[13px] font-bold"
        >
          <Plus className="w-4 h-4" /> New Chat
        </button>

        {/* Nav */}
        <div className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { onTabChange(item.id as TabType); onClose(); }}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
                  isActive 
                    ? "bg-white/[0.07] text-white" 
                    : "text-white/50 hover:bg-white/[0.03] hover:text-white"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-[25%] bottom-[25%] w-[2.5px] bg-indigo-400 rounded-r-full" />
                )}
                <item.icon className={cn("w-4 h-4", isActive && "text-indigo-400")} />
                <span className={cn("text-[13px]", isActive ? "font-bold" : "font-medium")}>{item.label}</span>
                {item.badge && (
                  <span className={cn(
                    "ml-auto text-[8px] px-1.5 py-0.5 rounded font-bold tracking-wider",
                    isActive 
                      ? "text-indigo-300 border border-indigo-400/30 bg-indigo-500/10" 
                      : "text-white/15 border border-white/5"
                  )}>{item.badge}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Recent Sessions */}
        <div className="flex flex-col gap-1 mt-1 flex-1 min-h-0">
          <p className="px-2 text-[9px] font-black text-white/15 uppercase tracking-[0.2em] mb-1">Recent</p>
          <div className="flex flex-col gap-0.5 overflow-y-auto hide-scrollbar flex-1">
            {chatSessions.filter(s => {
              if (activeTab === 'pdf') return s.type === 'pdf';
              return !s.type || s.type === 'chat';
            }).length === 0 && (
              <span className="px-2 py-2 text-[11px] text-white/20 italic">No recent chats</span>
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
                      "w-full px-2.5 py-2.5 text-[12px] rounded-lg text-left truncate transition-all font-medium pr-9",
                      activeSessionId === session.id 
                        ? "bg-indigo-500/10 text-indigo-300"
                        : "text-white/30 hover:text-white/60 hover:bg-white/[0.03]"
                    )}
                  >
                    {session.title || "New conversation"}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteSession?.(session.id); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-transparent group-hover/item:text-white/20 hover:!text-red-400 transition-all rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
            ))}
          </div>
          {chatSessions.length > 0 && (
            <button 
              onClick={() => { if (confirm('Clear all chat history?')) { localStorage.removeItem('inixa_chat_sessions'); window.location.reload(); } }}
              className="flex items-center justify-center gap-2 w-full py-2 text-white/15 hover:text-red-400/60 transition-all text-[11px] font-bold mt-1"
            >
              <Trash2 className="w-3 h-3" /> Clear All
            </button>
          )}
        </div>

        {/* Profile */}
        <div className="mt-auto pt-3 border-t border-white/[0.04] flex items-center justify-between px-1">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => { onTabChange('profile'); onClose(); }}>
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-[11px] font-bold text-white shadow-md border border-white/10 group-hover:border-indigo-400/50 transition-all">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-[12px] font-bold text-white/80 group-hover:text-white transition-colors">{user.name}</span>
              <span className="text-[8px] text-white/15 font-bold uppercase tracking-[0.15em]">Premium</span>
            </div>
          </div>
          <button onClick={() => { onOpenModelSelector(); onClose(); }} className="p-2 text-white/15 hover:text-white/50 transition-colors">
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </>
  );
}
