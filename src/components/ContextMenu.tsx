"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, RefreshCw, Share2, Trash2, Edit3, BookmarkPlus, MessageSquare, Volume2, Code } from 'lucide-react';

interface ContextMenuItem {
  label: string;
  icon: any;
  action: () => void;
  danger?: boolean;
  divider?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  const adjustedX = Math.min(x, window.innerWidth - 220);
  const adjustedY = Math.min(y, window.innerHeight - (items.length * 42 + 20));

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.9, y: -5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.12 }}
      style={{ left: adjustedX, top: adjustedY }}
      className="fixed z-[9999] w-[200px] py-1.5 rounded-2xl bg-[#1a1b25] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-xl overflow-hidden"
    >
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {item.divider && <div className="my-1 border-t border-white/5" />}
          <button
            onClick={() => { item.action(); onClose(); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
              item.danger
                ? 'text-red-400 hover:bg-red-500/10'
                : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span className="text-[13px] font-medium">{item.label}</span>
          </button>
        </React.Fragment>
      ))}
    </motion.div>
  );
}

// Helper to get context menu items for an AI message
export function getMessageContextItems(
  messageContent: string,
  onCopy: () => void,
  onRegenerate: () => void,
  onDelete: () => void,
): ContextMenuItem[] {
  return [
    { label: 'Copy message', icon: Copy, action: onCopy },
    { label: 'Copy as code block', icon: Code, action: () => {
      navigator.clipboard.writeText('```\n' + messageContent + '\n```');
    }},
    { label: 'Edit message', icon: Edit3, action: () => {}, divider: true },
    { label: 'Regenerate response', icon: RefreshCw, action: onRegenerate },
    { label: 'Read aloud', icon: Volume2, action: () => {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(messageContent);
        utterance.rate = 1;
        window.speechSynthesis.speak(utterance);
      }
    }},
    { label: 'Save to Bookmarks', icon: BookmarkPlus, action: () => {}, divider: true },
    { label: 'Share conversation', icon: Share2, action: () => {} },
    { label: 'Delete message', icon: Trash2, action: onDelete, danger: true, divider: true },
  ];
}

// Hook for managing context menu state
export function useContextMenu() {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);

  const showMenu = (e: React.MouseEvent, items: ContextMenuItem[]) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  const hideMenu = () => setContextMenu(null);

  return { contextMenu, showMenu, hideMenu };
}

