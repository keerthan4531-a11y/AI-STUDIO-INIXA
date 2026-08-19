"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Info, Sparkles, MessageSquare, FileText, ImageIcon, Video, Code, Search, 
  HelpCircle, Star, Mail, ChevronRight, Zap, Shield, Cpu, Globe, Brain,
  Download, Music, Headphones, CheckCircle2, Smartphone, Volume2, Radio,
  Share2, ShieldCheck, Play, ArrowDownToLine, ChevronDown, ChevronUp
} from 'lucide-react';
import { GlassCard, cn } from './GlassCard';
import { InixaLogo } from './Logos';
import { vibrate } from '../utils/helpers';

export function AboutScreen() {
  const [downloadingEcho, setDownloadingEcho] = useState(false);
  const [downloadingInixa, setDownloadingInixa] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  const handleEchoDownload = () => {
    vibrate(60);
    setDownloadingEcho(true);
    setTimeout(() => {
      setDownloadingEcho(false);
    }, 4000);
  };

  const handleInixaDownload = () => {
    vibrate(60);
    setDownloadingInixa(true);
    setTimeout(() => {
      setDownloadingInixa(false);
    }, 4000);
  };

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

  const echoFeatures = [
    { icon: Volume2, label: 'Hi-Res Lossless Audio', desc: 'Studio grade sound output' },
    { icon: ShieldCheck, label: '100% Ad-Free & Free', desc: 'Zero interruptions, no subscription' },
    { icon: ArrowDownToLine, label: 'Offline Song Downloads', desc: 'Listen anywhere without data' },
    { icon: Headphones, label: 'Background Playback', desc: 'Lock screen controls & notification player' },
    { icon: Radio, label: 'YouTube Music Catalog', desc: 'Millions of songs & playlists' },
    { icon: Smartphone, label: 'Android 7.0+ Ready', desc: 'Optimized 64-bit native engine' },
  ];

  const videoPrompts = [
    "A futuristic cyberpunk city with neon lights and flying cars, cinematic lighting, 4k.",
    "A majestic dragon soaring over snow-capped mountains, epic orchestral atmosphere.",
    "Time-lapse of a flower blooming in a magical forest, glowing particles, dreamy.",
    "Macro shot of a robotic eye blinking, reflecting a digital landscape."
  ];

  const steps = [
    { title: "Select a Tool", desc: "Choose between Chat, Image, Video, or Audio from the sidebar." },
    { title: "Enter Prompt", desc: "Describe what you want in detail. Use the 'Enhance' wand for better results." },
    { title: "Choose Model", desc: "Use the model selector to pick the best AI engine for your task." },
    { title: "Interact & Download", desc: "View results, download images/code/apps, or continue chatting." }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }}
      className="flex-1 overflow-y-auto hide-scrollbar p-4 sm:p-6 space-y-10 pb-32 max-w-4xl mx-auto"
    >
      {/* Hero */}
      <div className="text-center space-y-6 pt-2">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex mb-2"
        >
          <InixaLogo size={80} className="rounded-[28px] shadow-[0_0_40px_rgba(99,102,241,0.25)]" />
        </motion.div>
        <div className="space-y-2">
          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tighter uppercase italic">
            Inixa <span className="text-indigo-400 not-italic">Studio</span>
          </h1>
          <div className="flex items-center justify-center gap-2">
            <span className="h-[1px] w-8 bg-indigo-500/30" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400/80">Version 8.5 Production</p>
            <span className="h-[1px] w-8 bg-indigo-500/30" />
          </div>
        </div>
        <p className="text-white/50 font-medium max-w-xl mx-auto text-sm leading-relaxed">
          The unified workspace for AI intelligence, creative engines, and author applications.
        </p>
      </div>

      {/* ============================================================ */}
      {/* 🚀 OUR AUTHOR APPS (FEATURED ECOSYSTEM) */}
      {/* ============================================================ */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-wider">Our Author Apps</h2>
              <p className="text-xs text-white/40 font-medium">Free native applications created by our author</p>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Direct APK
          </span>
        </div>

        {/* --- Echo Music App Card (FLAGSHIP) --- */}
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-b from-[#0e1120] via-[#090b14] to-[#04060a] border border-cyan-500/30 p-6 sm:p-8 shadow-[0_20px_60px_rgba(6,182,212,0.15)] group transition-all duration-500 hover:border-cyan-400/50">
          {/* Ambient Glows */}
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-cyan-500/15 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-500/15 blur-[100px] rounded-full pointer-events-none" />

          <div className="relative z-10 space-y-6">
            {/* Header / App Info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.35)] border border-cyan-400/30 shrink-0 bg-black/40 flex items-center justify-center">
                  <img 
                    src="/echo-music-icon.png" 
                    alt="Echo Music Icon" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      // Fallback if image not ready
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <Music className="w-8 h-8 text-cyan-400 absolute" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Echo Music</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      Free Music App
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      v1.0 FOSS
                    </span>
                  </div>
                  <p className="text-white/60 text-xs sm:text-sm font-medium leading-relaxed max-w-xl">
                    High-performance, ad-free music streamer & offline player with lossless audio engine, YouTube Music integration, and background playback.
                  </p>
                </div>
              </div>

              {/* Specs Badge */}
              <div className="flex sm:flex-col items-center sm:items-end gap-2 text-[11px] text-white/40 font-mono">
                <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/70">
                  📦 81.6 MB
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/70">
                  📱 ARM64-v8a
                </span>
              </div>
            </div>

            {/* Feature Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
              {echoFeatures.map((ef, i) => (
                <div key={i} className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] transition-colors">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0">
                    <ef.icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-xs font-bold truncate">{ef.label}</p>
                    <p className="text-white/30 text-[10px] truncate">{ef.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Download CTA Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <a
                href="/downloads/Echo-Music.apk"
                download="Echo-Music.apk"
                onClick={handleEchoDownload}
                className={cn(
                  "flex-1 relative group/btn flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider text-white shadow-lg transition-all duration-300 overflow-hidden text-center cursor-pointer",
                  downloadingEcho 
                    ? "bg-emerald-600 border border-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.5)]"
                    : "bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:via-indigo-500 hover:to-purple-500 border border-cyan-400/40 shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:shadow-[0_0_50px_rgba(6,182,212,0.5)]"
                )}
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                {downloadingEcho ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-white animate-bounce" />
                    <span>Download Started! Check Notifications</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 text-white group-hover/btn:scale-110 transition-transform" />
                    <span>Download Echo Music APK (81.6 MB)</span>
                  </>
                )}
              </a>

              <button
                type="button"
                onClick={() => setShowInstallGuide(!showInstallGuide)}
                className="px-4 py-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-white/60 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <HelpCircle className="w-4 h-4 text-cyan-400" />
                <span>How to Install</span>
                {showInstallGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Installation Instructions Accordion */}
            <AnimatePresence>
              {showInstallGuide && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden pt-2"
                >
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-cyan-500/20 space-y-3">
                    <p className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                      <Smartphone className="w-4 h-4" /> Android Installation Steps:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        <span className="text-cyan-400 font-bold block mb-1">1. Download</span>
                        <p className="text-white/40 text-[11px]">Click the download button above to download the APK file.</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        <span className="text-cyan-400 font-bold block mb-1">2. Open File</span>
                        <p className="text-white/40 text-[11px]">Tap the downloaded notification or locate in your Downloads folder.</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        <span className="text-cyan-400 font-bold block mb-1">3. Allow Source</span>
                        <p className="text-white/40 text-[11px]">If prompted, tap Settings and enable 'Allow from this source'.</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        <span className="text-cyan-400 font-bold block mb-1">4. Enjoy</span>
                        <p className="text-white/40 text-[11px]">Tap Install to complete setup. Enjoy free unlimited music!</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* --- Inixa AI Mobile App Card --- */}
        <div className="p-6 rounded-[24px] bg-white/[0.02] border border-white/[0.06] hover:border-indigo-500/30 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <InixaLogo size={36} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-white font-bold text-lg">Inixa AI Companion</h4>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Android APK
                </span>
              </div>
              <p className="text-white/40 text-xs">Full Inixa AI Intelligence Hub wrapped in a high-speed native Android application (4.1 MB).</p>
            </div>
          </div>

          <a
            href="/downloads/Inixa-AI.apk"
            download="Inixa-AI.apk"
            onClick={handleInixaDownload}
            className={cn(
              "px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shrink-0 w-full sm:w-auto",
              downloadingInixa
                ? "bg-emerald-600 text-white"
                : "bg-white/[0.06] hover:bg-indigo-600/30 border border-white/10 hover:border-indigo-500/40 text-white"
            )}
          >
            {downloadingInixa ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-indigo-400" />
                <span>Download APK (4.1 MB)</span>
              </>
            )}
          </a>
        </div>
      </section>

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

