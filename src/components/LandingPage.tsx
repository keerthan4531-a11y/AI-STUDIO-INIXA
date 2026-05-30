"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform, useInView, AnimatePresence } from "framer-motion";
import {
  MessageSquare, FileText, ImageIcon, Video, Code, Search,
  Brain, Cpu, Shield, Sparkles, Mic, Globe, BookMarked, Code2,
  ArrowRight, ChevronDown, Zap, Star, Layers, Lock, Rocket,
  Monitor, Smartphone, ExternalLink
} from "lucide-react";
import ShaderAnimation from "./ui/shader-animation";
import { InteractiveShader } from "./ui/digital-aurora";
import { SplineScene } from "./ui/splite";
import { Spotlight } from "./ui/spotlight";
import { Card } from "./ui/card";
import { InixaLogo } from "./Logos";

/* ============================
   Animation Variants
   ============================ */

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as const }
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1, scale: 1,
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const }
  }
};

const slideInLeft = {
  hidden: { opacity: 0, x: -60 },
  visible: {
    opacity: 1, x: 0,
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as const }
  }
};

const slideInRight = {
  hidden: { opacity: 0, x: 60 },
  visible: {
    opacity: 1, x: 0,
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as const }
  }
};

/* ============================
   Feature Data
   ============================ */

const features = [
  {
    icon: MessageSquare,
    title: "Neural Chat",
    desc: "Blazing-fast AI responses powered by GPT-4, Gemini 2.5, Claude, and DeepSeek. Switch models mid-conversation.",
    color: "from-blue-500 to-cyan-400",
    iconColor: "text-blue-400",
    bgGlow: "bg-blue-500/20",
    tag: "MULTI-MODEL"
  },
  {
    icon: FileText,
    title: "PDF Intelligence",
    desc: "Upload massive documents and query them instantly using advanced RAG technology. Your AI reading companion.",
    color: "from-emerald-500 to-teal-400",
    iconColor: "text-emerald-400",
    bgGlow: "bg-emerald-500/20",
    tag: "RAG"
  },
  {
    icon: ImageIcon,
    title: "Image Genesis",
    desc: "Generate stunning high-fidelity artwork from text prompts. From concept art to photorealistic renders.",
    color: "from-purple-500 to-violet-400",
    iconColor: "text-purple-400",
    bgGlow: "bg-purple-500/20",
    tag: "AI ART"
  },
  {
    icon: Video,
    title: "Temporal Video",
    desc: "Transform ideas into cinematic videos with AI. Text-to-video generation powered by cutting-edge models.",
    color: "from-rose-500 to-pink-400",
    iconColor: "text-rose-400",
    bgGlow: "bg-rose-500/20",
    tag: "VIDEO AI"
  },
  {
    icon: Sparkles,
    title: "Vibe Studio",
    desc: "A full-stack IDE in your browser. Generate entire web apps from prompts. Code, preview, and deploy — all in one.",
    color: "from-fuchsia-500 to-purple-400",
    iconColor: "text-fuchsia-400",
    bgGlow: "bg-fuchsia-500/20",
    tag: "ELITE"
  },
  {
    icon: Mic,
    title: "Voice Assistant",
    desc: "Real-time voice conversations with AI. Natural speech recognition and synthesis for hands-free operation.",
    color: "from-amber-500 to-orange-400",
    iconColor: "text-amber-400",
    bgGlow: "bg-amber-500/20",
    tag: "VOICE"
  },
  {
    icon: Globe,
    title: "Deep Research",
    desc: "Automated web research that crawls, analyzes, and synthesizes information from multiple sources in real-time.",
    color: "from-green-500 to-emerald-400",
    iconColor: "text-green-400",
    bgGlow: "bg-green-500/20",
    tag: "AUTO"
  },
  {
    icon: BookMarked,
    title: "Note-IX",
    desc: "AI-powered note-taking and knowledge management. Create, organize, and enhance your notes with intelligence.",
    color: "from-indigo-500 to-blue-400",
    iconColor: "text-indigo-400",
    bgGlow: "bg-indigo-500/20",
    tag: "STUDIO"
  },
  {
    icon: Code2,
    title: "Developer API",
    desc: "Full API access with developer console. Build integrations, automate workflows, and extend Inixa's capabilities.",
    color: "from-cyan-500 to-sky-400",
    iconColor: "text-cyan-400",
    bgGlow: "bg-cyan-500/20",
    tag: "DEV"
  }
];

const stats = [
  { value: "10+", label: "AI Models", icon: Cpu },
  { value: "9", label: "Power Tools", icon: Layers },
  { value: "∞", label: "Possibilities", icon: Rocket },
  { value: "100%", label: "Free Access", icon: Lock }
];

/* ============================
   Animated Counter
   ============================ */

function AnimatedStat({ value, label, icon: Icon, index }: { value: string; label: string; icon: React.ElementType; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.15 }}
      className="text-center group"
    >
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center group-hover:border-indigo-500/30 group-hover:bg-indigo-500/5 transition-all duration-500">
        <Icon className="w-6 h-6 text-indigo-400 group-hover:scale-110 transition-transform" />
      </div>
      <motion.span
        className="text-4xl sm:text-5xl font-black text-white block mb-2 tracking-tighter"
        initial={{ scale: 0.5 }}
        animate={isInView ? { scale: 1 } : {}}
        transition={{ duration: 0.5, delay: index * 0.15 + 0.2, type: "spring", stiffness: 200 }}
      >
        {value}
      </motion.span>
      <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/30">{label}</span>
    </motion.div>
  );
}

/* ============================
   Feature Card
   ============================ */

function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.25, 0.46, 0.45, 0.94] as const }}
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
      className="group relative"
    >
      <div className="relative overflow-hidden rounded-[28px] bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl p-7 h-full transition-all duration-500 landing-card-glow group-hover:border-white/[0.15]">
        {/* Glow effect */}
        <div className={`absolute -top-20 -right-20 w-40 h-40 ${feature.bgGlow} blur-[80px] rounded-full opacity-0 group-hover:opacity-60 transition-opacity duration-700`} />
        
        {/* Tag */}
        <div className="flex items-center justify-between mb-5">
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feature.color} bg-opacity-10 flex items-center justify-center shadow-lg`} style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))` }}>
            <feature.icon className={`w-5 h-5 ${feature.iconColor}`} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 px-2.5 py-1 rounded-full border border-white/[0.06] bg-white/[0.02]">
            {feature.tag}
          </span>
        </div>

        {/* Content */}
        <h3 className="text-lg font-bold text-white mb-2 tracking-tight group-hover:text-white transition-colors">{feature.title}</h3>
        <p className="text-white/30 text-sm leading-relaxed group-hover:text-white/50 transition-colors">{feature.desc}</p>

        {/* Bottom gradient line */}
        <div className={`absolute bottom-0 left-8 right-8 h-[2px] bg-gradient-to-r ${feature.color} opacity-0 group-hover:opacity-40 transition-opacity duration-500`} />
      </div>
    </motion.div>
  );
}

/* ============================
   Navbar
   ============================ */

function LandingNav({ onLaunch }: { onLaunch: () => void }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.3 }}
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
        scrolled
          ? "bg-[#030712]/80 backdrop-blur-2xl border-b border-white/[0.05] shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <InixaLogo size={36} className="rounded-xl shadow-lg shadow-indigo-500/10" />
          <div>
            <h1 className="text-[17px] font-black tracking-tight uppercase text-white">Inixa</h1>
            <span className="text-indigo-400/60 font-bold uppercase tracking-[0.2em] text-[8px]">AI Studio</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-white/40 hover:text-white text-sm font-medium transition-colors">Features</a>
          <a href="#3d-demo" className="text-white/40 hover:text-white text-sm font-medium transition-colors">Demo</a>
          <a href="#stats" className="text-white/40 hover:text-white text-sm font-medium transition-colors">Stats</a>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onLaunch}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/[0.08] border border-white/[0.1] text-white text-sm font-bold hover:bg-white/[0.12] hover:border-white/[0.2] transition-all duration-300 backdrop-blur-xl"
        >
          Launch App
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.nav>
  );
}

/* ============================
   Main Landing Page
   ============================ */

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95]);
  const [showApp, setShowApp] = useState(() => {
    // Auto-skip landing page if user is already logged in
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('inixa_user');
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser);
          if (user && user.name) return true;
        } catch {}
      }
    }
    return false;
  });

  const handleLaunch = () => {
    setShowApp(true);
  };

  if (showApp) {
    // Dynamically load the main app
    const AppComponent = React.lazy(() => import("../App"));
    return (
      <React.Suspense fallback={
        <div className="h-screen bg-[#030712] flex items-center justify-center">
          <div className="text-center">
            <InixaLogo size={64} className="mx-auto mb-6 rounded-2xl animate-pulse" />
            <div className="loader mx-auto"></div>
          </div>
        </div>
      }>
        <AppComponent />
      </React.Suspense>
    );
  }

  return (
    <div className="bg-[#030712] text-white min-h-screen overflow-x-hidden selection:bg-indigo-500/30">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap');
        body { font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; }
        .font-serif { font-family: 'Playfair Display', serif; }
        html { scroll-behavior: smooth; }
      `}</style>

      <LandingNav onLaunch={handleLaunch} />

      {/* ===== HERO SECTION ===== */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
      >
        {/* Shader Background */}
        <div className="absolute inset-0 z-0">
          <ShaderAnimation />
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-[#030712]/50 z-10" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#030712] z-10" />
        </div>

        {/* Hero Content */}
        <div className="relative z-20 text-center px-6 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.5, filter: "blur(20px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 1, delay: 0.5 }}
            className="mb-8"
          >
            <InixaLogo size={100} className="mx-auto rounded-[28px] shadow-[0_0_60px_rgba(99,102,241,0.3)]" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mb-3"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-300/80 backdrop-blur-xl">
              <Zap className="w-3 h-3" />
              Version 8.5 Preview — Now Available
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] mb-6 uppercase"
          >
            <span className="text-gradient-landing">The Future</span>
            <br />
            <span className="text-white/90">of AI</span>
            <br />
            <span className="text-gradient-landing italic font-serif not-italic" style={{ fontStyle: 'italic' }}>Reimagined</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            className="text-white/40 text-base sm:text-lg max-w-2xl mx-auto mb-10 font-medium leading-relaxed"
          >
            A unified AI workspace for visionaries, engineers, and creators.
            Chat, code, create, and research — all powered by the world's most advanced AI models.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(139, 92, 246, 0.4)" }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLaunch}
              className="group relative px-10 py-4 rounded-2xl bg-gradient-landing text-white font-bold text-base tracking-wide overflow-hidden shadow-[0_8px_32px_rgba(139,92,246,0.3)] transition-all"
            >
              <span className="relative z-10 flex items-center gap-3">
                Launch Inixa
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.button>

            <motion.a
              href="#features"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl border border-white/[0.08] text-white/60 font-medium text-base hover:text-white hover:border-white/[0.2] hover:bg-white/[0.04] transition-all"
            >
              Explore Features
              <ChevronDown className="w-4 h-4" />
            </motion.a>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2"
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/20">Scroll</span>
          <ChevronDown className="w-5 h-5 text-white/20 animate-scroll-bounce" />
        </motion.div>
      </motion.section>

      {/* ===== PLATFORMS BAR ===== */}
      <section className="relative z-10 py-16 border-y border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="flex flex-wrap items-center justify-center gap-8 sm:gap-16"
          >
            {[
              { icon: Monitor, label: "Desktop" },
              { icon: Smartphone, label: "Mobile" },
              { icon: Globe, label: "Web App" },
            ].map((platform, i) => (
              <motion.div
                key={platform.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="flex items-center gap-3 text-white/30 group hover:text-white/60 transition-colors"
              >
                <platform.icon className="w-5 h-5 group-hover:text-indigo-400 transition-colors" />
                <span className="text-sm font-bold uppercase tracking-widest">{platform.label}</span>
              </motion.div>
            ))}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.45 }}
              className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400/80 text-[11px] font-bold uppercase tracking-widest">100% Free</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ===== 3D INTERACTIVE SECTION ===== */}
      <section id="3d-demo" className="relative z-10 py-20 sm:py-32">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <Card className="w-full min-h-[500px] bg-black/[0.96] relative overflow-hidden rounded-[32px] border-white/[0.06]">
            <Spotlight
              className="-top-40 left-0 md:left-60 md:-top-20"
              fill="white"
            />

            <div className="flex flex-col lg:flex-row h-full min-h-[500px]">
              {/* Left content */}
              <motion.div
                variants={slideInLeft}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="flex-1 p-8 sm:p-12 relative z-10 flex flex-col justify-center"
              >
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300/80 text-[10px] font-bold uppercase tracking-[0.2em] w-fit mb-6">
                  <Star className="w-3 h-3" />
                  Interactive 3D Experience
                </span>
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-black bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 tracking-tighter leading-[1.1] mb-5">
                  Meet Your
                  <br />
                  AI Partner
                </h2>
                <p className="text-neutral-400 max-w-lg text-base sm:text-lg leading-relaxed mb-8">
                  Experience intelligence that adapts to you. Inixa combines the power of 
                  multiple AI engines into one seamless, beautiful interface.
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLaunch}
                  className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-white/[0.08] border border-white/[0.1] text-white font-bold text-sm hover:bg-white/[0.15] transition-all w-fit group"
                >
                  Try it Now
                  <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </motion.button>
              </motion.div>

              {/* Right content - 3D */}
              <motion.div
                variants={slideInRight}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="flex-1 relative min-h-[350px] lg:min-h-0"
              >
                <SplineScene
                  scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                  className="w-full h-full"
                />
              </motion.div>
            </div>
          </Card>
        </div>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section id="features" className="relative z-10 py-20 sm:py-32 overflow-hidden">
        {/* Digital Aurora WebGL Shader Background */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
          <InteractiveShader flowSpeed={0.25} colorIntensity={1.4} noiseLayers={4.0} mouseInfluence={0.3} />
          {/* Dark fading overlays for legibility */}
          <div className="absolute inset-0 bg-[#030712]/30" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#030712] via-transparent to-[#030712]" />
        </div>

        <div className="max-w-7xl mx-auto px-6 sm:px-8 relative z-10">
          {/* Section Header */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-16 sm:mb-20"
          >
            <motion.div variants={fadeInUp} className="mb-4">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">
                <Zap className="w-3 h-3 text-indigo-400" />
                Powerhouse Features
              </span>
            </motion.div>
            <motion.h2
              variants={fadeInUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-300 via-cyan-300 to-indigo-400 drop-shadow-[0_0_30px_rgba(52,211,153,0.3)] mb-5"
            >
              Everything You Need,
              <br />
              <span>One Platform</span>
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-white/30 text-base sm:text-lg max-w-2xl mx-auto"
            >
              Nine powerful tools unified into one elegant AI workspace.
              From chat to code to creation — Inixa has you covered.
            </motion.p>
          </motion.div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => (
              <FeatureCard key={feature.title} feature={feature} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== HIGHLIGHT SECTION ===== */}
      <section className="relative z-10 py-20 sm:py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid lg:grid-cols-2 gap-12 items-center"
          >
            {/* Left - Feature highlight */}
            <motion.div variants={slideInLeft} className="space-y-8">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-300/80 text-[10px] font-bold uppercase tracking-[0.2em]">
                <Code className="w-3 h-3" />
                Vibe Studio
              </span>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tighter text-white leading-[1.1]">
                Build Entire Apps
                <br />
                <span className="text-gradient-landing">From a Prompt</span>
              </h2>
              <p className="text-white/40 text-base leading-relaxed max-w-lg">
                Vibe Studio is a full-stack development environment built right into Inixa.
                Describe what you want, and watch as the AI generates complete, working web applications
                with real-time preview, file management, and instant deployment.
              </p>
              <div className="flex flex-wrap gap-3">
                {["React", "Next.js", "HTML/CSS", "TypeScript", "Live Preview", "File System"].map((tech) => (
                  <span key={tech} className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/40 text-xs font-bold">
                    {tech}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Right - Mock terminal */}
            <motion.div variants={slideInRight}>
              <div className="relative rounded-[28px] bg-[#0a0b0f] border border-white/[0.08] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)]">
                {/* Terminal header */}
                <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.06]">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  <span className="ml-3 text-white/20 text-[11px] font-mono font-bold">vibe-studio — inixa</span>
                </div>
                {/* Terminal body */}
                <div className="p-6 font-mono text-sm space-y-3">
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                  >
                    <span className="text-indigo-400">❯</span>
                    <span className="text-white/60 ml-2">Build me a dashboard with charts and dark theme</span>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.6 }}
                    className="text-emerald-400/60 text-xs"
                  >
                    ✓ Generating React components...
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.9 }}
                    className="text-emerald-400/60 text-xs"
                  >
                    ✓ Creating chart visualizations with Recharts...
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 1.2 }}
                    className="text-emerald-400/60 text-xs"
                  >
                    ✓ Applying glassmorphism dark theme...
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 1.5 }}
                    className="text-fuchsia-400 text-xs font-bold"
                  >
                    ⚡ Dashboard ready! Opening preview...
                  </motion.div>
                </div>
                {/* Gradient border glow */}
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-fuchsia-500/40 to-transparent" />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ===== STATS SECTION ===== */}
      <section id="stats" className="relative z-10 py-20 sm:py-28">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/[0.02] to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto px-6 sm:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-12">
            {stats.map((stat, i) => (
              <AnimatedStat key={stat.label} {...stat} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== AI MODELS SECTION ===== */}
      <section className="relative z-10 py-20 sm:py-28">
        <div className="max-w-5xl mx-auto px-6 sm:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="mb-12"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[10px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
              <Cpu className="w-3 h-3 text-indigo-400" />
              Multi-Model Architecture
            </span>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tighter text-white mt-4 mb-5">
              Powered by the <span className="text-gradient-landing">Best AI</span>
            </h2>
            <p className="text-white/30 text-base max-w-xl mx-auto">
              Switch between the world's most powerful AI models instantly. 
              One interface, infinite possibilities.
            </p>
          </motion.div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            {[
              { name: "GPT-4o", color: "from-green-400 to-emerald-500" },
              { name: "Gemini 2.5", color: "from-blue-400 to-purple-500" },
              { name: "Claude 4", color: "from-amber-400 to-orange-500" },
              { name: "DeepSeek", color: "from-cyan-400 to-blue-500" },
              { name: "Grok", color: "from-gray-300 to-gray-500" },
              { name: "Llama 4", color: "from-indigo-400 to-violet-500" },
            ].map((model, i) => (
              <motion.div
                key={model.name}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                whileHover={{ scale: 1.08, y: -4 }}
                className="group px-6 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.15] transition-all duration-300 cursor-default"
              >
                <span className={`text-sm font-bold bg-gradient-to-r ${model.color} bg-clip-text text-transparent`}>
                  {model.name}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section className="relative z-10 py-24 sm:py-36">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 blur-[200px] rounded-full" />
        </div>
        <div className="max-w-4xl mx-auto px-6 sm:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tighter text-white mb-6 leading-[1]">
              Ready to
              <br />
              <span className="text-gradient-landing italic font-serif">Experience the Future?</span>
            </h2>
            <p className="text-white/30 text-base sm:text-lg max-w-xl mx-auto mb-10">
              Join the next generation of AI-powered creativity. 
              No sign-up required. 100% free. Always.
            </p>
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 0 60px rgba(139, 92, 246, 0.5)" }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLaunch}
              className="group relative px-12 py-5 rounded-2xl bg-gradient-landing text-white font-bold text-lg tracking-wide overflow-hidden shadow-[0_12px_40px_rgba(139,92,246,0.35)] transition-all"
            >
              <span className="relative z-10 flex items-center gap-3 justify-center">
                <Rocket className="w-5 h-5" />
                Launch Inixa Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="relative z-10 border-t border-white/[0.04] py-12">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <InixaLogo size={28} className="rounded-lg" />
              <div>
                <span className="text-sm font-black uppercase tracking-tight text-white/60">Inixa AI Studio</span>
                <span className="text-[10px] text-white/20 font-bold ml-2">v8.5</span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <a
                href="https://instagram.com/dark.shadow_4531"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/20 hover:text-white/60 text-sm font-medium transition-colors"
              >
                Instagram
              </a>
              <a
                href="mailto:keerthan4531@gmail.com"
                className="text-white/20 hover:text-white/60 text-sm font-medium transition-colors"
              >
                Contact
              </a>
            </div>

            <div className="flex items-center gap-4 text-white/10">
              <Shield className="w-4 h-4" />
              <Cpu className="w-4 h-4" />
              <Globe className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/[0.04] text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/15">
              Built for the future • © 2025 Inixa AI
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
