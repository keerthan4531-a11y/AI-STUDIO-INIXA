"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, 
  Lightbulb, 
  Zap, 
  FileText, 
  BookOpen, 
  MessageSquare, 
  TrendingUp, 
  Sparkles,
  Search,
  Code,
  PenTool,
  Clock
} from 'lucide-react';

interface ToolkitItem {
  title: string;
  description: string;
  icon: any;
  color: string;
  prompt: string;
  category: 'study' | 'creation' | 'research';
}

export const TOOLKIT_ITEMS: ToolkitItem[] = [
  {
    title: "Summarize & Mind Map",
    description: "Convert long text into structured mind maps and key takeaways.",
    icon: Brain,
    color: "#6366f1",
    prompt: "Please summarize the following text and create a Mermaid mind map for it: ",
    category: 'study'
  },
  {
    title: "Quiz Me",
    description: "Generate interactive quizzes to test your knowledge on any topic.",
    icon: Zap,
    color: "#f59e0b",
    prompt: "Generate an interactive quiz with 5 questions on the topic: ",
    category: 'study'
  },
  {
    title: "Flashcards",
    description: "Create memory cards for quick revision and memorization.",
    icon: Lightbulb,
    color: "#10b981",
    prompt: "Create a set of 5 interactive flashcards for the following concept: ",
    category: 'study'
  },
  {
    title: "Research Assistant",
    description: "Deep dive into topics with web citations and detailed analysis.",
    icon: Search,
    color: "#3b82f6",
    prompt: "Research this topic in depth and provide a structured report with sources: ",
    category: 'research'
  },
  {
    title: "Explain like I'm 5",
    description: "Simplify complex concepts into easy-to-understand metaphors.",
    icon: MessageSquare,
    color: "#ec4899",
    prompt: "Explain this concept like I'm 5 years old, using simple analogies: ",
    category: 'study'
  },
  {
    title: "Write an Essay",
    description: "Draft high-quality essays with proper structure and arguments.",
    icon: PenTool,
    color: "#8b5cf6",
    prompt: "Write a well-structured essay about: ",
    category: 'creation'
  }
];

interface StudentToolkitProps {
  onSelect: (prompt: string) => void;
}

export function StudentToolkit({ onSelect }: StudentToolkitProps) {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 mt-8">
      {/* Mobile View: Compact Pills */}
      <div className="flex flex-wrap justify-center gap-2 sm:hidden">
        {TOOLKIT_ITEMS.map((item, idx) => (
          <motion.button
            key={`mobile-${idx}`}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(item.prompt)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] active:bg-white/[0.1] transition-all shadow-md"
          >
            <item.icon className="w-3.5 h-3.5" style={{ color: item.color }} />
            <span className="text-[12px] font-bold text-white/80">{item.title}</span>
          </motion.button>
        ))}
      </div>

      {/* Web/Desktop View: Beautiful Visual Cards */}
      <div className="hidden sm:grid grid-cols-2 lg:grid-cols-3 gap-4">
        {TOOLKIT_ITEMS.map((item, idx) => (
          <motion.button
            key={`web-${idx}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + idx * 0.05 }}
            whileHover={{ scale: 1.02, translateY: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(item.prompt)}
            className="group relative flex flex-col items-start p-6 rounded-3xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/20 transition-all text-left overflow-hidden shadow-2xl"
          >
            {/* Background Glow */}
            <div 
              className="absolute -top-12 -right-12 w-24 h-24 blur-[60px] opacity-10 group-hover:opacity-30 transition-opacity"
              style={{ backgroundColor: item.color }}
            />
            
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-300 shadow-lg"
              style={{ backgroundColor: `${item.color}20`, border: `1px solid ${item.color}30` }}
            >
              <item.icon className="w-6 h-6" style={{ color: item.color }} />
            </div>

            <h3 className="text-lg font-bold text-white/90 mb-2 group-hover:text-white transition-colors">{item.title}</h3>
            <p className="text-sm text-white/40 leading-relaxed group-hover:text-white/60 transition-colors line-clamp-2">{item.description}</p>
            
            <div className="mt-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Launch Tool</span>
              <Sparkles className="w-3 h-3 text-white/30" />
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

