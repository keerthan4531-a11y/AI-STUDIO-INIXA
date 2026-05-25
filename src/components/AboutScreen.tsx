"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { 
  Info, Sparkles, MessageSquare, FileText, ImageIcon, Video, Code, Search, 
  HelpCircle, Star, Mail, ChevronRight, Zap, Shield, Cpu, Globe, Brain 
} from 'lucide-react';
import { GlassCard, cn } from './GlassCard';
import { InixaLogo } from './Logos';

export function AboutScreen() {
  const features = [
    { 
      icon: MessageSquare, 
      title: 'Neural Chat', 
      desc: 'High-speed AI responses with multiple model support (GPT-4, Gemini, Claude).',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10'
    },
    { 
      icon: FileText, 
      title: 'PDF Intelligence', 
      desc: 'Upload large documents and query them instantly using advanced RAG technology.',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10'
    },
    { 
      icon: ImageIcon, 
      title: 'Image Genesis', 
      desc: 'Generate stunning high-fidelity images from text prompts.',
      color: 'text-purple-400',
      bg: 'bg-purple-500/10'
    },
    { 
      icon: Video, 
      title: 'Temporal Video', 
      desc: 'Transform ideas into high-quality cinematic videos with AI.',
      color: 'text-rose-400',
      bg: 'bg-rose-500/10'
    },
    { 
      icon: Code, 
      title: 'Codex Engine', 
      desc: 'Professional code generation with interactive previews and artifacts.',
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10'
    },
    { 
      icon: Search, 
      title: 'Web Recon', 
      desc: 'Real-time internet access for up-to-date information and citations.',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10'
    },
    { 
      icon: Brain, 
      title: 'Deep Think', 
      desc: 'Advanced reasoning mode for complex problem solving and logical analysis.',
      color: 'text-pink-400',
      bg: 'bg-pink-500/10'
    },
    { 
      icon: Cpu, 
      title: 'Artifacts', 
      desc: 'Interactive UI previews, charts, and code sandboxes rendered in real-time.',
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10'
    },
    { 
      icon: Shield, 
      title: 'Secure OS', 
      desc: 'Local-first data processing with end-to-end encrypted session states.',
      color: 'text-gray-400',
      bg: 'bg-gray-500/10'
    }
  ];

  const videoPrompts = [
    "A futuristic cyberpunk city with neon lights and flying cars, cinematic lighting, 4k.",
    "A majestic dragon soaring over snow-capped mountains, epic orchestral atmosphere.",
    "Time-lapse of a flower blooming in a magical forest, glowing particles, dreamy.",
    "Macro shot of a robotic eye blinking, reflecting a digital landscape."
  ];

  const steps = [
    { title: "Select a Tool", desc: "Choose between Chat, Image, or Video from the sidebar." },
    { title: "Enter Prompt", desc: "Describe what you want in detail. Use the 'Enhance' wand for better results." },
    { title: "Choose Model", desc: "Use the model selector to pick the best AI engine for your task." },
    { title: "Interact", desc: "View results, download images, or continue the chat." }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }}
      className="flex-1 overflow-y-auto hide-scrollbar p-6 space-y-10 pb-32 max-w-4xl mx-auto"
    >
      {/* Hero */}
      <div className="text-center space-y-6">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex mb-2"
        >
          <InixaLogo size={80} className="rounded-[28px] shadow-[0_0_40px_rgba(99,102,241,0.2)]" />
        </motion.div>
        <div className="space-y-2">
          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tighter uppercase italic">
            Inixa <span className="text-indigo-400 not-italic">Preview</span>
          </h1>
          <div className="flex items-center justify-center gap-2">
            <span className="h-[1px] w-8 bg-indigo-500/30" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400/60">Version 8.5 Preview</p>
            <span className="h-[1px] w-8 bg-indigo-500/30" />
          </div>
        </div>
        <p className="text-white/40 font-medium max-w-xl mx-auto text-sm leading-relaxed">
          The next generation of creative intelligence. A unified workspace for visionaries, 
          engineers, and creators to transcend the boundaries of AI.
        </p>
      </div>

      {/* Features A-Z */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 px-2">
          <Zap className="w-5 h-5 text-indigo-400" />
          <h2 className="text-xl font-black text-white uppercase tracking-wider">Features A-Z</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <GlassCard key={i} className="p-5 hover:border-white/20 transition-all group">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110", f.bg)}>
                <f.icon className={cn("w-5 h-5", f.color)} />
              </div>
              <h3 className="text-white font-bold mb-1">{f.title}</h3>
              <p className="text-white/30 text-xs leading-relaxed">{f.desc}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* How to use */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 px-2">
          <HelpCircle className="w-5 h-5 text-emerald-400" />
          <h2 className="text-xl font-black text-white uppercase tracking-wider">How to Use</h2>
        </div>
        <div className="space-y-3">
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] font-black text-emerald-400 shrink-0 mt-0.5">
                {i + 1}
              </div>
              <div>
                <h4 className="text-white font-bold text-sm">{s.title}</h4>
                <p className="text-white/30 text-xs mt-1">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Example Prompts */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 px-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <h2 className="text-xl font-black text-white uppercase tracking-wider">Example Capabilities</h2>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {[
            { 
              title: "Advanced Data Visualization", 
              q: "Generate a JSON format for a line chart showing Tesla vs Apple stock growth in 2026. Use 'type': 'line'. Ensure you provide 'title', 'data', and 'dataKeys'.",
              icon: Brain
            },
            { 
              title: "Instant Web Development", 
              q: "Write a single HTML file containing a futuristic glowing neon button. Do not use React, just pure HTML and inline CSS.",
              icon: Code
            },
            { 
              title: "Real-time Intelligence", 
              q: "What are the top 3 trending technology news updates happening right now? Provide references.",
              icon: Search
            }
          ].map((item, i) => (
            <div key={i} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-indigo-500/30 transition-all group cursor-pointer">
               <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                    <item.icon className="w-4 h-4" />
                  </div>
                  <h4 className="text-white font-bold text-sm tracking-tight">{item.title}</h4>
               </div>
               <p className="text-white/40 text-xs leading-relaxed italic group-hover:text-white/60 transition-colors">"{item.q}"</p>
            </div>
          ))}
        </div>
      </section>

      {/* Video Prompts */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 px-2">
          <Video className="w-5 h-5 text-rose-400" />
          <h2 className="text-xl font-black text-white uppercase tracking-wider">Video Example Prompts</h2>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {videoPrompts.map((p, i) => (
            <div key={i} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.05] transition-colors cursor-pointer group">
              <p className="text-white/50 text-[13px] italic font-medium leading-relaxed group-hover:text-white/80 transition-colors">"{p}"</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 px-2">
          <Globe className="w-5 h-5 text-blue-400" />
          <h2 className="text-xl font-black text-white uppercase tracking-wider">Connect with Creator</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a 
            href="https://instagram.com/dark.shadow_4531" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-5 rounded-3xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-white/5 hover:border-pink-500/30 transition-all group"
          >
            <div className="w-12 h-12 rounded-2xl bg-pink-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Star className="w-6 h-6 text-pink-400" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Instagram</p>
              <p className="text-white font-bold tracking-tight">@dark.shadow_4531</p>
            </div>
            <ChevronRight className="w-5 h-5 text-white/10 ml-auto group-hover:text-white/30" />
          </a>
          <a 
            href="mailto:keerthan4531@gmail.com" 
            className="flex items-center gap-4 p-5 rounded-3xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-white/5 hover:border-blue-500/30 transition-all group"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Mail className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Email Support</p>
              <p className="text-white font-bold tracking-tight">keerthan4531@gmail.com</p>
            </div>
            <ChevronRight className="w-5 h-5 text-white/10 ml-auto group-hover:text-white/30" />
          </a>
        </div>
      </section>

      {/* Footer Branding */}
      <div className="pt-10 flex flex-col items-center gap-4 opacity-20 border-t border-white/5">
        <div className="flex items-center gap-4">
          <Shield className="w-4 h-4" />
          <Cpu className="w-4 h-4" />
          <Globe className="w-4 h-4" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-center">
          Inixa AI Intelligence Hub • Built for the future
        </p>
      </div>
    </motion.div>
  );
}

