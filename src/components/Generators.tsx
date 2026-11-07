"use client";
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Film, Smartphone, Monitor, Square, Image as ImageIcon, SmartphoneIcon, Wand2, Plus, XCircle, Download, Maximize, Layers, Zap as ZapIcon, Sparkles, AlertCircle, RefreshCw, Clock, Key, Check, ExternalLink } from 'lucide-react';
import { GlassCard, SectionLabel, cn } from './GlassCard';
import { vibrate, saveMediaToGallery } from '../utils/helpers';
import { generateVideo, AspectRatio, VideoModelType } from '../api/veoApi';
import { aiChat, aiGenerateImageWithProgress, type ImageModelType, IMAGE_MODELS } from '../api/aiEngine';

const OPTIMIZER_SYSTEM_PROMPT = "You are an expert AI cinematographer and prompt engineer. Take the user's prompt and expand it into a visually stunning, cinematic video prompt. Specify camera motion, depth of field, dramatic lighting, vivid colors, and atmospheric textures. Keep it under 60 words. ONLY return the final prompt, nothing else.";

const STYLE_PRESETS = [
  { label: 'Cinematic', prompt: 'cinematic lighting, 35mm film, anamorphic bokeh, photorealistic, 8k render' },
  { label: 'Cyberpunk', prompt: 'cyberpunk aesthetic, vibrant neon reflections, volumetric fog, moody rain, futuristic' },
  { label: 'Anime / Ghibli', prompt: 'Studio Ghibli aesthetic, lush hand-painted background, anime motion, radiant light' },
  { label: 'Drone Flyover', prompt: 'smooth aerial drone flyover shot, breathtaking panoramic view, golden hour sunlight' },
  { label: 'Slow Motion', prompt: 'ultra slow motion 120fps, high shutter speed, fluid cinematic physics, dramatic capture' },
];

const VIDEO_MODELS: { id: VideoModelType; label: string; desc: string; badge: string }[] = [
  { id: 'aritek-sora', label: 'Aritek Sora v1.9.3 (Ultra)', desc: 'Direct 4K MP4 real video generation (Zero Auth)', badge: 'SORA REAL' },
  { id: 'auto', label: 'Sora Auto Motion Engine', desc: 'Auto high-speed real video synthesis', badge: 'RECOMMENDED' },
  { id: 'sora-2', label: 'Sora-2 Cinematic Motion', desc: 'Ultra-realistic physics & motion dynamics', badge: 'CINEMATIC' },
  { id: 't2v-ultra', label: 'T2V Diffusion HyperSpeed', desc: 'Instant real MP4 video in ~3 seconds', badge: 'FAST 3S' },
];

function NeuralPlaceholder({ status, progress }: { status?: string; progress?: number }) {
  return (
    <div className="w-full rounded-[32px] bg-white/[0.02] border border-dashed border-violet-500/20 flex flex-col items-center justify-center p-8 gap-5 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-indigo-500/10 opacity-40 group-hover:opacity-60 transition-opacity" />
      
      {/* Animated glowing core */}
      <motion.div
        animate={{ 
          scale: [1, 1.08, 1],
          rotate: [0, 6, -6, 0],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="w-20 h-20 rounded-[28px] bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 flex items-center justify-center border border-white/20 shadow-[0_0_35px_rgba(139,92,246,0.35)] relative z-10"
      >
        <Film className="w-9 h-9 text-white drop-shadow" />
      </motion.div>

      {/* Status & Progress */}
      <div className="flex flex-col items-center gap-2 relative z-10 text-center max-w-sm">
        <span className="text-[11px] font-black uppercase tracking-[0.25em] text-violet-400">
          {status || 'Synthesizing Neural Frames'}
        </span>
        <div className="w-48 h-1.5 rounded-full bg-white/10 overflow-hidden relative">
          <motion.div
            className="h-full bg-gradient-to-r from-violet-500 to-indigo-400 rounded-full"
            style={{ width: `${Math.max(progress || 5, 5)}%` }}
            transition={{ ease: "easeOut" }}
          />
        </div>
        <span className="text-[10px] text-white/40 font-mono">
          {Math.round(progress || 5)}% Completed
        </span>
      </div>
    </div>
  );
}

export function VideoGenerator() {
  const [prompt, setPrompt] = useState(() => localStorage.getItem('inixa_video_last_prompt') || '');
  const [aspect, setAspect] = useState<AspectRatio>(() => (localStorage.getItem('inixa_video_aspect') as AspectRatio) || 'VIDEO_ASPECT_RATIO_PORTRAIT');
  const [model, setModel] = useState<VideoModelType>('auto');
  const [duration, setDuration] = useState<number>(2);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(() => localStorage.getItem('inixa_video_last_url'));
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [referenceImg, setReferenceImg] = useState<string | null>(null);
  const [engineUsed, setEngineUsed] = useState<string | null>(null);

  // Multi-Engine Credentials
  const [hfToken, setHfToken] = useState<string>(() => (typeof window !== 'undefined' ? localStorage.getItem('inixa_hf_token') || '' : ''));
  const [agnesKey, setAgnesKey] = useState<string>(() => (typeof window !== 'undefined' ? localStorage.getItem('inixa_agnes_key') || 'sk-4Hd4VlwRCqP4jfRKsdHzlsLe8ywgkUQTlg036giylru1sXEg' : 'sk-4Hd4VlwRCqP4jfRKsdHzlsLe8ywgkUQTlg036giylru1sXEg'));
  const defaultMuseCookie = 'ecd3959b-4a3d-4e80-ae48-8e463e173702.v1%3ASrdMpmI7iZMpttC3m2lWll7ciCDxnQ7JNG5cdjIGcFSVC3oRlykxUpo3D3Va6o3xnG3-q5Vp_mtFJn48dT0W_L_Z2hLvw74B2mcSm7OozoHjfU6HHr-ty_pTaifU_TaWOcA5PuWLnnTU-6y_yoJH6wkMCTZBZfD_2PLxW94CWBvTANalo2ZrJhmIWY4K8TNTrKueeQJ4A3wnJWiXQimquP0UPIOEpsm-dD4q9Tbyqh1QvsS2QfIhNmCVOSNH8YFXpdMnCHsMhzBX_fV8GirJAoVnoqR00VQR-t5yUmfXuUXYQ9ubsUoNgsJM-TvilzqInJKVU69Zf4BbjUUTd_NuCr1VQoO8ySymvi1Qd6aQ6xqS283RZhBvYHKQhnOQYpxyMnBq_53jFDpiATxQrFTYKoOHe2ULDYCZ_OrLaN9aB2h0soITFE-vGOwMnCpS0FROaRD9TGzESJx8kMpSPXcUQiSeDQ%3ApJ20iH422tEBQkJU%3Aus52_xUIH0PgMKtbmXJ6jQ.kAszzWQWMXnhqGqBnQ8ZT0Qhx3NU_NRNVpKoiyhcelQ';
  const [museToken, setMuseToken] = useState<string>(() => (typeof window !== 'undefined' ? localStorage.getItem('inixa_muse_token') || defaultMuseCookie : defaultMuseCookie));
  const [museEndpoint, setMuseEndpoint] = useState<string>(() => (typeof window !== 'undefined' ? localStorage.getItem('inixa_muse_endpoint') || 'http://localhost:18610' : 'http://localhost:18610'));
  const [mindVideoToken, setMindVideoToken] = useState<string>(() => (typeof window !== 'undefined' ? localStorage.getItem('inixa_mindvideo_token') || '' : ''));
  const [showTokenSettings, setShowTokenSettings] = useState(false);

  const [tempHfToken, setTempHfToken] = useState('');
  const [tempAgnesKey, setTempAgnesKey] = useState('');
  const [tempMuseToken, setTempMuseToken] = useState('');
  const [tempMuseEndpoint, setTempMuseEndpoint] = useState('');
  const [tempMindToken, setTempMindToken] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const activeTokensCount = (hfToken ? 1 : 0) + (agnesKey ? 1 : 0) + (museToken ? 1 : 0) + (mindVideoToken ? 1 : 0);

  const handleSaveCredentials = () => {
    const trimmedHf = tempHfToken.trim();
    const trimmedAgnes = tempAgnesKey.trim();
    const trimmedMuse = tempMuseToken.trim();
    const trimmedEndpoint = tempMuseEndpoint.trim();
    const trimmedMind = tempMindToken.trim();

    setHfToken(trimmedHf);
    setAgnesKey(trimmedAgnes);
    setMuseToken(trimmedMuse);
    setMuseEndpoint(trimmedEndpoint || 'http://localhost:18610');
    setMindVideoToken(trimmedMind);

    if (trimmedHf) localStorage.setItem('inixa_hf_token', trimmedHf);
    else localStorage.removeItem('inixa_hf_token');

    if (trimmedAgnes) localStorage.setItem('inixa_agnes_key', trimmedAgnes);
    else localStorage.removeItem('inixa_agnes_key');

    if (trimmedMuse) localStorage.setItem('inixa_muse_token', trimmedMuse);
    else localStorage.removeItem('inixa_muse_token');

    if (trimmedEndpoint) localStorage.setItem('inixa_muse_endpoint', trimmedEndpoint);
    else localStorage.removeItem('inixa_muse_endpoint');

    if (trimmedMind) localStorage.setItem('inixa_mindvideo_token', trimmedMind);
    else localStorage.removeItem('inixa_mindvideo_token');

    setShowTokenSettings(false);
    vibrate(30);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      vibrate(20);
      const reader = new FileReader();
      reader.onloadend = () => { 
        setReferenceImg(reader.result as string); 
        vibrate(30); 
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyPreset = (presetPrompt: string) => {
    vibrate(15);
    if (!prompt.trim()) {
      setPrompt(presetPrompt);
    } else {
      setPrompt(`${prompt.trim()}, ${presetPrompt}`);
    }
  };

  const handleGenerate = async (overrideToken?: string) => {
    vibrate();
    if (!prompt.trim() || loading) return;
    setLoading(true); 
    setVideoUrl(null); 
    setErrorMsg(null);
    setEngineUsed(null);
    setStatus('Connecting to Multi-Engine Video Router...'); 
    setProgress(5);
    localStorage.setItem('inixa_video_last_prompt', prompt);

    abortRef.current = new AbortController();

    const activeHf = overrideToken !== undefined ? overrideToken : hfToken;

    try {
      const result = await generateVideo(
        prompt, 
        aspect, 
        1, 
        (msg) => setStatus(msg), 
        (pct) => setProgress(pct), 
        abortRef.current.signal,
        {
          model,
          referenceImg,
          duration
        }
      );
      setVideoUrl(result.url); 
      setEngineUsed(result.engineUsed || model);
      localStorage.setItem('inixa_video_last_url', result.url); 
      setStatus('Complete');
      saveMediaToGallery({ id: Date.now(), type: 'video', prompt, blob: result.url });
    } catch (err: any) { 
      console.error('[VideoGenerator UI] Error:', err);
      setErrorMsg(err?.message || 'Video generation failed across all providers. Please try again.');
      setStatus('Failed'); 
    } finally { 
      setLoading(false); 
    }
  };

  const getVideoAspectClass = () => {
    if (aspect === 'VIDEO_ASPECT_RATIO_LANDSCAPE') return 'aspect-video';
    if (aspect === 'VIDEO_ASPECT_RATIO_SQUARE') return 'aspect-square';
    return 'aspect-[9/16] max-h-[580px] mx-auto';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 overflow-y-auto hide-scrollbar p-6 space-y-6 pb-32">
      <GlassCard className="p-6" glow="bg-violet-500/10">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <SectionLabel icon={Film} text="AI Video Generator" />
            <div className="flex items-center gap-2">
              {/* Credentials & Tokens Pool Drawer Toggle */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  setTempHfToken(hfToken);
                  setTempAgnesKey(agnesKey);
                  setTempMuseToken(museToken);
                  setTempMuseEndpoint(museEndpoint);
                  setTempMindToken(mindVideoToken);
                  setShowTokenSettings(!showTokenSettings);
                  vibrate(20);
                }}
                className={cn(
                  "px-2.5 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all",
                  activeTokensCount > 0
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20" 
                    : "bg-white/5 border-white/10 text-white/40 hover:text-white"
                )}
                title="Manage Provider Tokens & Session Keys"
              >
                <Key className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {activeTokensCount > 0 ? `${activeTokensCount} Keys Active` : 'Engine Keys'}
                </span>
                <span className={cn("w-1.5 h-1.5 rounded-full", activeTokensCount > 0 ? "bg-emerald-400" : "bg-white/30")} />
              </motion.button>

              <motion.button 
                whileTap={{ scale: 0.9 }} 
                onClick={() => { setPrompt(''); setVideoUrl(null); setReferenceImg(null); setStatus(''); setProgress(0); setErrorMsg(null); vibrate(40); }} 
                className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all"
                title="Clear all"
              >
                <Plus className="w-4 h-4" />
              </motion.button>

              <motion.button 
                whileTap={{ scale: 0.9 }} 
                onClick={async () => {
                  if (!prompt.trim() || loading) return;
                  vibrate(20); setLoading(true); setStatus('Optimizing Prompt with AI...');
                  try { 
                    const result = await aiChat([
                      { role: 'system', content: OPTIMIZER_SYSTEM_PROMPT }, 
                      { role: 'user', content: prompt }
                    ]); 
                    if (result) setPrompt(result.trim()); 
                  } catch {}
                  setLoading(false); setStatus('');
                }}
                disabled={loading || !prompt.trim()}
                className="px-3 py-1.5 rounded-xl bg-violet-600/20 border border-violet-500/30 text-[10px] font-black uppercase tracking-widest text-violet-300 hover:bg-violet-600/30 transition-all flex items-center gap-2 disabled:opacity-40"
              >
                <Wand2 className="w-3.5 h-3.5" /> Optimize
              </motion.button>
            </div>
          </div>

          {/* Multi-Engine Credentials Drawer */}
          <AnimatePresence>
            {showTokenSettings && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-violet-500/20 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-[12px] font-bold text-white flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-violet-400" /> Multi-Provider Account & Token Pool
                    </span>
                    <span className="text-[10px] text-white/40">Tokens are saved locally in your browser</span>
                  </div>

                  {/* 1. HuggingFace Token */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-white/90">HuggingFace Token (LTX-Video & CogVideoX)</label>
                      <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-[10px] text-violet-400 hover:underline flex items-center gap-1">
                        Get Token <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    <input 
                      type="password" 
                      value={tempHfToken} 
                      onChange={(e) => setTempHfToken(e.target.value)} 
                      placeholder="hf_..." 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500" 
                    />
                  </div>

                  {/* 2. Agnes AI Key */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-white/90">Agnes AI Free Key (720P HD Video)</label>
                      <a href="https://platform.agnes-ai.com" target="_blank" rel="noopener noreferrer" className="text-[10px] text-violet-400 hover:underline flex items-center gap-1">
                        Get Free Key <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    <input 
                      type="password" 
                      value={tempAgnesKey} 
                      onChange={(e) => setTempAgnesKey(e.target.value)} 
                      placeholder="ag_... or Bearer key" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500" 
                    />
                  </div>

                  {/* 3. Muse2API Gateway */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-white/90">Muse2API Gateway (muse.ai CDP Driver)</label>
                      <a href="https://github.com/www222fff/muse2api" target="_blank" rel="noopener noreferrer" className="text-[10px] text-violet-400 hover:underline flex items-center gap-1">
                        muse2api docs <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input 
                        type="text" 
                        value={tempMuseEndpoint} 
                        onChange={(e) => setTempMuseEndpoint(e.target.value)} 
                        placeholder="Gateway URL (e.g. http://localhost:18610)" 
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500" 
                      />
                      <input 
                        type="password" 
                        value={tempMuseToken} 
                        onChange={(e) => setTempMuseToken(e.target.value)} 
                        placeholder="API Key (Optional if open)" 
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500" 
                      />
                    </div>
                  </div>

                  {/* 4. MindVideo Token */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-white/90">MindVideo Token (Sora-2 Free Engine)</label>
                      <a href="https://mindvideo.ai" target="_blank" rel="noopener noreferrer" className="text-[10px] text-violet-400 hover:underline flex items-center gap-1">
                        mindvideo.ai <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    <input 
                      type="password" 
                      value={tempMindToken} 
                      onChange={(e) => setTempMindToken(e.target.value)} 
                      placeholder="Paste mindvideo session JWT" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500" 
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                    <button 
                      onClick={() => setShowTokenSettings(false)} 
                      className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-white/60 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSaveCredentials} 
                      className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 font-bold text-xs text-white transition-all flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" /> Save Credentials
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Model Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <SectionLabel icon={ZapIcon} text="Video Engine" />
              {engineUsed && (
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Last: {engineUsed.toUpperCase()}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {VIDEO_MODELS.map((m) => (
                <motion.button
                  key={m.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setModel(m.id); vibrate(20); }}
                  className={cn(
                    "flex flex-col items-start p-3 rounded-2xl border text-left transition-all relative overflow-hidden",
                    model === m.id 
                      ? "bg-violet-600/25 border-violet-400 shadow-[0_0_20px_rgba(139,92,246,0.25)]" 
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-[11px] font-bold text-white truncate max-w-[120px]">{m.label}</span>
                    <span className={cn(
                      "text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider",
                      model === m.id ? "bg-violet-400 text-black" : "bg-white/10 text-white/50"
                    )}>
                      {m.badge}
                    </span>
                  </div>
                  <span className="text-[10px] text-white/40 leading-snug line-clamp-1">{m.desc}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Prompt Area */}
          <div className="space-y-2">
            <textarea 
              value={prompt} 
              onChange={e => setPrompt(e.target.value)} 
              placeholder="Describe your cinematic scene (e.g. A neon cyberpunk supercar drifting through rain-soaked Tokyo streets at midnight, 4k 60fps)..." 
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder-white/30 h-28 focus:outline-none focus:border-violet-500/50 transition-all resize-none" 
            />

            {/* Quick Style Presets */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/30 flex items-center gap-1 shrink-0 mr-1">
                <Sparkles className="w-3 h-3 text-violet-400" /> Styles:
              </span>
              {STYLE_PRESETS.map((st) => (
                <button
                  key={st.label}
                  type="button"
                  onClick={() => handleApplyPreset(st.prompt)}
                  className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-violet-500/20 border border-white/10 hover:border-violet-500/40 text-[10px] font-medium text-white/70 hover:text-white transition-all shrink-0"
                >
                  + {st.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Aspect Ratio & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Aspect Ratio */}
            <div className="space-y-2">
              <SectionLabel icon={Maximize} text="Aspect Ratio" />
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'VIDEO_ASPECT_RATIO_PORTRAIT', icon: Smartphone, label: '9:16' },
                  { id: 'VIDEO_ASPECT_RATIO_LANDSCAPE', icon: Monitor, label: '16:9' },
                  { id: 'VIDEO_ASPECT_RATIO_SQUARE', icon: Square, label: '1:1' }
                ].map((item) => (
                  <motion.button
                    key={item.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setAspect(item.id as AspectRatio); localStorage.setItem('inixa_video_aspect', item.id); vibrate(20); }}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl border transition-all",
                      aspect === item.id 
                        ? "bg-violet-600 border-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.3)]" 
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                    )}
                  >
                    <item.icon className={cn("w-4 h-4", aspect === item.id ? "text-white" : "text-white/40")} />
                    <span className={cn("text-[9px] font-black uppercase tracking-widest", aspect === item.id ? "text-white" : "text-white/40")}>{item.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <SectionLabel icon={Clock} text="Duration" />
              <div className="grid grid-cols-3 gap-2">
                {[
                  { sec: 2, label: '2s Fast' },
                  { sec: 3, label: '3s Standard' },
                  { sec: 4, label: '4s Extended' },
                ].map((d) => (
                  <motion.button
                    key={d.sec}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setDuration(d.sec); vibrate(20); }}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 py-3 rounded-2xl border transition-all",
                      duration === d.sec
                        ? "bg-violet-600 border-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                    )}
                  >
                    <span className={cn("text-xs font-bold", duration === d.sec ? "text-white" : "text-white/70")}>{d.sec}s</span>
                    <span className={cn("text-[8px] font-semibold uppercase tracking-wider", duration === d.sec ? "text-white/80" : "text-white/30")}>
                      {duration === d.sec ? 'Active' : d.label.split(' ')[1]}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          {/* Reference Image for Image-to-Video */}
          <div className="space-y-3">
             <SectionLabel icon={Layers} text="Reference Image (Optional Image-to-Video)" />
             <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
             <div className="flex gap-3">
                <motion.button 
                  whileTap={{ scale: 0.95 }} 
                  onClick={() => { setReferenceImg(null); vibrate(10); }} 
                  className={cn("min-w-[90px] h-20 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all", !referenceImg ? "bg-violet-600/20 border-violet-400" : "bg-white/5 border-white/10 hover:bg-white/10")}
                >
                  <XCircle className="w-4 h-4 text-white/40" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/60">Text Only</span>
                </motion.button>
                <motion.button 
                  whileTap={{ scale: 0.95 }} 
                  onClick={() => fileInputRef.current?.click()} 
                  className={cn("min-w-[90px] h-20 rounded-2xl border flex flex-col items-center justify-center gap-1.5 overflow-hidden relative transition-all", referenceImg ? "border-violet-400 bg-violet-950/30" : "bg-white/5 border-white/10 hover:bg-white/10")}
                >
                  {referenceImg ? (
                    <img src={referenceImg} alt="Reference" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <>
                      <SmartphoneIcon className="w-4 h-4 text-white/50" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-white/60">Upload Image</span>
                    </>
                  )}
                </motion.button>
             </div>
          </div>

          {/* Generate Button */}
          <motion.button 
            onClick={() => handleGenerate()} 
            disabled={loading || !prompt.trim()} 
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 font-bold shadow-xl shadow-violet-500/25 text-sm overflow-hidden relative group disabled:opacity-50 transition-all cursor-pointer"
          >
             {loading && (
               <motion.div 
                 initial={{ width: 0 }} 
                 animate={{ width: `${progress}%` }} 
                 className="absolute inset-0 bg-white/20 backdrop-blur-sm" 
               />
             )}
             <span className="relative z-10 flex items-center justify-center gap-2">
               {loading ? (
                 <>
                   <RefreshCw className="w-4 h-4 animate-spin" />
                   <span>{status || `${Math.round(progress)}% Synthesizing...`}</span>
                 </>
               ) : (
                 <>
                   <Film className="w-4 h-4" />
                   <span>Generate Video</span>
                 </>
               )}
             </span>
          </motion.button>
        </div>
      </GlassCard>

      {/* Loading Progress State */}
      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <NeuralPlaceholder status={status} progress={progress} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Card */}
      {errorMsg && (
        <GlassCard className="p-6 border-red-500/30 bg-red-500/10 flex flex-col items-center text-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-400" />
          </div>
          <div className="max-w-md space-y-1">
            <h4 className="text-white font-bold text-sm">
              {errorMsg.toLowerCase().includes('quota') ? 'ZeroGPU Free Quota Limit' : 'Video Generation Failed'}
            </h4>
            <p className="text-white/70 text-xs leading-relaxed">{errorMsg}</p>
          </div>

          {/* Quick HF Token input if quota error */}
          {errorMsg.toLowerCase().includes('quota') && (
            <div className="w-full max-w-sm mt-2 p-3 rounded-xl bg-black/40 border border-white/10 space-y-2 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-violet-300 flex items-center gap-1">
                  <Key className="w-3 h-3" /> Add Free HF Token
                </span>
                <a 
                  href="https://huggingface.co/settings/tokens" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[10px] text-violet-400 hover:underline flex items-center gap-1"
                >
                  Create (Free) <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <div className="flex gap-2">
                <input 
                  type="password"
                  value={tempHfToken}
                  onChange={(e) => setTempHfToken(e.target.value)}
                  placeholder="Paste hf_..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500"
                />
                <button
                  onClick={() => {
                    const trimmed = tempHfToken.trim();
                    setHfToken(trimmed);
                    if (trimmed) localStorage.setItem('inixa_hf_token', trimmed);
                    handleGenerate(trimmed);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 font-bold text-xs text-white transition-all flex items-center gap-1"
                >
                  Save & Retry
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 mt-1">
            <button 
              onClick={() => handleGenerate()} 
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition-all flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Try Again
            </button>
          </div>
        </GlassCard>
      )}

      {/* Result Video Card */}
      {videoUrl && !loading && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
          <GlassCard className="overflow-hidden group p-2 bg-black/40 border-violet-500/30">
            <div className="relative rounded-2xl overflow-hidden bg-black flex items-center justify-center">
              <video 
                src={videoUrl} 
                controls 
                loop 
                autoPlay 
                playsInline 
                className={cn("w-full h-auto object-cover rounded-2xl", getVideoAspectClass())} 
              />
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-end justify-between p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[11px] font-bold text-white/80 line-clamp-1 max-w-[70%]">
                  {prompt}
                </span>
                <motion.a 
                  href={videoUrl} 
                  download="inixa-generated-video.mp4" 
                  whileTap={{ scale: 0.9 }}
                  className="p-3 rounded-full bg-violet-600/80 hover:bg-violet-600 backdrop-blur-xl border border-white/20 text-white shadow-lg transition-all"
                  title="Download MP4"
                >
                  <Download className="w-4 h-4" />
                </motion.a>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </motion.div>
  );
}

export function ImageGenerator() {
  const [prompt, setPrompt] = useState(() => localStorage.getItem('inixa_image_last_prompt') || '');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [imageUrl, setImageUrl] = useState<string | null>(() => localStorage.getItem('inixa_image_last_url'));
  const [selectedModel, setSelectedModel] = useState<ImageModelType>('flux');
  const [imageError, setImageError] = useState<string | false>(false);

  const handleGenerate = async () => {
    vibrate();
    if (!prompt.trim() || loading) return;
    setLoading(true); setImageUrl(null); setProgress(0); setImageError(false);
    try {
      const url = await aiGenerateImageWithProgress(prompt, p => setProgress(p), { width: 1024, height: 1024, model: selectedModel });
      setImageUrl(url); localStorage.setItem('inixa_image_last_url', url);
      saveMediaToGallery({ id: Date.now(), type: 'image', prompt, blob: url });
    } catch (e: any) { 
      setImageError(e.message || 'Generation failed'); 
      setLoading(false); 
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 overflow-y-auto hide-scrollbar p-6 space-y-6 pb-32">
      <GlassCard className="p-6" glow="bg-cyan-500/10">
        <div className="space-y-6">
          <SectionLabel icon={ImageIcon} text="Image Generator" />
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe your image..." className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white h-28 focus:outline-none focus:border-cyan-500/40 transition-all" />
          
          <div className="space-y-3">
             <SectionLabel icon={Layers} text="AI Model" />
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {IMAGE_MODELS.map((m) => (
                  <motion.button
                    key={m.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setSelectedModel(m.id); vibrate(20); }}
                    className={cn(
                      "flex items-center justify-between px-4 py-3 rounded-2xl border transition-all",
                      selectedModel === m.id 
                        ? "bg-cyan-600 border-cyan-400 shadow-lg" 
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                    )}
                  >
                    <span className={cn("text-[10px] font-black uppercase tracking-widest", selectedModel === m.id ? "text-white" : "text-white/40")}>{m.label}</span>
                    {selectedModel === m.id && <ZapIcon className="w-3.5 h-3.5 text-white" />}
                  </motion.button>
                ))}
             </div>
          </div>

          <motion.button onClick={handleGenerate} disabled={loading || !prompt} className="w-full h-14 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 font-bold shadow-xl shadow-cyan-500/20 text-sm overflow-hidden relative group disabled:opacity-50">
             {loading && <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="absolute inset-0 bg-white/10" />}
             <span className="relative z-10">{loading ? `${Math.round(progress)}% Generating...` : 'Generate Image'}</span>
          </motion.button>
        </div>
      </GlassCard>
      {loading && <NeuralPlaceholder />}
      
      {imageError && (
        <GlassCard className="p-8 border-red-500/20 bg-red-500/5 flex flex-col items-center text-center gap-4">
           <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-400" />
           </div>
           <div>
              <h3 className="text-white font-bold mb-1">Generation Failed</h3>
              <p className="text-white/60 text-[12px] whitespace-pre-wrap">{imageError}</p>
           </div>
           <button onClick={handleGenerate} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[11px] font-bold hover:bg-white/10 transition-all">Try Again</button>
        </GlassCard>
      )}

      {imageUrl && !imageError && (
        <GlassCard className={cn("overflow-hidden group relative", !loading && "animate-in fade-in zoom-in duration-700")}>
          <img 
            src={imageUrl} 
            alt="Result" 
            onLoad={() => setLoading(false)} 
            onError={() => { setImageError('Failed to load image'); setLoading(false); }}
            className={cn("w-full h-auto", loading ? "opacity-0 invisible h-0" : "opacity-100 visible")} 
          />
        </GlassCard>
      )}
    </motion.div>
  );
}

