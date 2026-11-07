"use client";
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Film, Smartphone, Monitor, Square, Image as ImageIcon, SmartphoneIcon, Wand2, Plus, XCircle, Download, Maximize, Layers, Zap as ZapIcon, Sparkles, AlertCircle, RefreshCw, Clock } from 'lucide-react';
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
  { id: 'aritek-sora', label: 'Aritek Sora v1.9.3 (Ultra)', desc: 'Direct 4K MP4 real video generation (Zero Auth • Unlimited Free)', badge: 'SORA REAL' },
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
  const [model, setModel] = useState<VideoModelType>('aritek-sora');
  const [duration, setDuration] = useState<number>(2);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(() => localStorage.getItem('inixa_video_last_url'));
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [referenceImg, setReferenceImg] = useState<string | null>(null);
  const [engineUsed, setEngineUsed] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

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

  const handleGenerate = async () => {
    vibrate();
    if (!prompt.trim() || loading) return;
    setLoading(true); 
    setVideoUrl(null); 
    setErrorMsg(null);
    setEngineUsed(null);
    setStatus('Connecting to Aritek Sora Engine...'); 
    setProgress(5);
    localStorage.setItem('inixa_video_last_prompt', prompt);

    abortRef.current = new AbortController();

    try {
      const result = await generateVideo(
        prompt, 
        aspect, 
        1, 
        (msg) => setStatus(msg), 
        (pct) => setProgress(pct), 
        abortRef.current.signal,
        {
          model: 'aritek-sora',
          referenceImg,
          duration
        }
      );
      setVideoUrl(result.url); 
      setEngineUsed(result.engineUsed || 'aritek-sora');
      localStorage.setItem('inixa_video_last_url', result.url); 
      setStatus('Complete');
      saveMediaToGallery({ id: Date.now(), type: 'video', prompt, blob: result.url });
    } catch (err: any) { 
      console.error('[VideoGenerator UI] Error:', err);
      setErrorMsg(err?.message || 'Video generation failed. Please try again.');
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
              {/* Zero-Auth Engine Status Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-300 text-[10px] font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Zero Auth • Free Active
              </div>

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

          {/* Active Video Engine */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <SectionLabel icon={ZapIcon} text="Video Engine" />
              {engineUsed && (
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Last: {engineUsed.toUpperCase()}
                </span>
              )}
            </div>
            <motion.div
              className="p-3.5 rounded-2xl border border-violet-400/50 bg-violet-600/20 shadow-[0_0_20px_rgba(139,92,246,0.2)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative overflow-hidden"
            >
              <div className="space-y-1 z-10">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white tracking-wide">Aritek Sora v1.9.3 (Ultra)</span>
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider bg-violet-400 text-black">
                    SORA REAL
                  </span>
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 uppercase tracking-wider">
                    ONLINE • ZERO AUTH
                  </span>
                </div>
                <span className="text-[10px] text-white/50 leading-snug">
                  Direct 4K MP4 real video generation • Auto-rotating guest token • Unlimited free generations
                </span>
              </div>
              <div className="shrink-0 z-10">
                <span className="text-[10px] font-mono font-bold text-violet-300 bg-white/5 px-2.5 py-1 rounded-xl border border-white/10">
                  ⚡ ~2.5s Latency
                </span>
              </div>
            </motion.div>
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
            <h4 className="text-white font-bold text-sm">Video Generation Failed</h4>
            <p className="text-white/70 text-xs leading-relaxed">{errorMsg}</p>
          </div>

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

