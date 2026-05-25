"use client";
import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Film, Smartphone, Monitor, Square, Image as ImageIcon, SmartphoneIcon, Wand2, Plus, XCircle, Download, Maximize, Layers, Zap as ZapIcon } from 'lucide-react';
import { GlassCard, SectionLabel, cn } from './GlassCard';
import { vibrate, saveMediaToGallery } from '../utils/helpers';
import { generateVideo, AspectRatio } from '../api/veoApi';
import { aiChat, aiGenerateImageWithProgress, type ImageModelType, IMAGE_MODELS } from '../api/aiEngine';

const OPTIMIZER_SYSTEM_PROMPT = "You are an expert AI prompt engineer. Take the user's short prompt and expand it into a highly detailed, cinematic, and descriptive prompt for high-quality production. Focus on lighting, textures, camera angles, and atmosphere. Keep the result concise but descriptive. ONLY output the optimized prompt. No chat, no filler.";

function NeuralPlaceholder() {
  return (
    <div className="aspect-[9/16] w-full rounded-[32px] bg-white/[0.02] border border-dashed border-white/10 flex flex-col items-center justify-center gap-6 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10 opacity-30 group-hover:opacity-50 transition-opacity" />
      <motion.div
        animate={{ 
          scale: [1, 1.1, 1],
          rotate: [0, 5, -5, 0],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="w-20 h-20 rounded-[28px] bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center border border-white/20 relative z-10"
      >
        <ZapIcon className="w-10 h-10 text-white fill-white/20" />
      </motion.div>
      <div className="flex flex-col items-center gap-2 relative z-10">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Processing</span>
        <div className="flex gap-1.5">
          {[0, 0.2, 0.4].map(d => (
            <motion.div 
              key={d} 
              animate={{ opacity: [0.2, 1, 0.2], scale: [1, 1.5, 1] }} 
              transition={{ repeat: Infinity, duration: 1.5, delay: d }} 
              className="w-1.5 h-1.5 rounded-full bg-white/40" 
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function VideoGenerator() {
  const [prompt, setPrompt] = useState(() => localStorage.getItem('inixa_video_last_prompt') || '');
  const [aspect, setAspect] = useState<AspectRatio>(() => (localStorage.getItem('inixa_video_aspect') as AspectRatio) || 'VIDEO_ASPECT_RATIO_PORTRAIT');
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(() => localStorage.getItem('inixa_video_last_url'));
  const [loading, setLoading] = useState(false);
  const [referenceImg, setReferenceImg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      vibrate(20);
      const reader = new FileReader();
      reader.onloadend = () => { setReferenceImg(reader.result as string); vibrate(30); };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    vibrate();
    if (!prompt.trim() || loading) return;
    setLoading(true); setVideoUrl(null); setStatus('Initializing...'); setProgress(0);
    abortRef.current = new AbortController();
    try {
      const result = await generateVideo(prompt, aspect, 1, (msg) => setStatus(msg), (pct) => setProgress(pct), abortRef.current.signal);
      setVideoUrl(result.url); localStorage.setItem('inixa_video_last_url', result.url); setStatus('Complete');
      saveMediaToGallery({ id: Date.now(), type: 'video', prompt, blob: result.url });
    } catch { setStatus('Failed'); } finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 overflow-y-auto hide-scrollbar p-6 space-y-6 pb-32">
      <GlassCard className="p-6" glow="bg-violet-500/10">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <SectionLabel icon={Film} text="Video Generator" />
            <div className="flex items-center gap-2">
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setPrompt(''); setVideoUrl(null); setReferenceImg(null); setStatus(''); setProgress(0); vibrate(60); }} className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/30 hover:text-white transition-all">
                <Plus className="w-4 h-4" />
              </motion.button>
              <motion.button 
                whileTap={{ scale: 0.9 }} 
                onClick={async () => {
                  if (!prompt.trim() || loading) return;
                  vibrate(20); setLoading(true);
                  try { const result = await aiChat([{ role: 'system', content: OPTIMIZER_SYSTEM_PROMPT }, { role: 'user', content: prompt }]); setPrompt(result); } catch {}
                  setLoading(false);
                }}
                className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-violet-400 transition-all flex items-center gap-2"
              >
                <Wand2 className="w-3.5 h-3.5" /> Optimize
              </motion.button>
            </div>
          </div>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe your video..." className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white h-28 focus:outline-none focus:border-violet-500/40 transition-all" />
          
          <div className="space-y-3">
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
                      "flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border transition-all",
                      aspect === item.id 
                        ? "bg-violet-600 border-violet-400 shadow-[0_0_20px_rgba(139,92,246,0.3)]" 
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                    )}
                  >
                    <item.icon className={cn("w-5 h-5", aspect === item.id ? "text-white" : "text-white/40")} />
                    <span className={cn("text-[10px] font-black uppercase tracking-widest", aspect === item.id ? "text-white" : "text-white/40")}>{item.label}</span>
                  </motion.button>
                ))}
             </div>
          </div>

          <div className="space-y-3">
             <SectionLabel icon={Layers} text="Reference Image" />
             <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
             <div className="flex gap-3">
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setReferenceImg(null); vibrate(10); }} className={cn("min-w-[100px] h-24 rounded-[28px] border flex flex-col items-center justify-center gap-1", !referenceImg ? "bg-violet-600/20 border-violet-400" : "bg-white/5 border-white/10")}>
                  <XCircle className="w-5 h-5 text-white/40" />
                  <span className="text-[9px] font-black uppercase tracking-widest">None</span>
                </motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => fileInputRef.current?.click()} className={cn("min-w-[100px] h-24 rounded-[28px] border flex flex-col items-center justify-center gap-2 overflow-hidden relative transition-all", referenceImg ? "border-violet-400" : "bg-white/5 border-white/10")}>
                  {referenceImg ? (<img src={referenceImg} className="absolute inset-0 w-full h-full object-cover" />) : (<><SmartphoneIcon className="w-5 h-5 text-white/50" /><span className="text-[9px] font-black uppercase tracking-widest">Upload</span></>)}
                </motion.button>
             </div>
          </div>

          <motion.button onClick={handleGenerate} disabled={loading || !prompt} className="w-full h-14 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 font-bold shadow-xl shadow-violet-500/20 text-sm overflow-hidden relative group disabled:opacity-50">
             {loading && <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="absolute inset-0 bg-white/10" />}
             <span className="relative z-10">{loading ? `${Math.round(progress)}% Generating...` : 'Generate Video'}</span>
          </motion.button>
        </div>
      </GlassCard>
      
      {loading && <NeuralPlaceholder />}
      
      {videoUrl && !loading && (
        <GlassCard className="overflow-hidden group">
          <video src={videoUrl} controls loop autoPlay className="w-full h-auto aspect-[9/16] object-cover" />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-end px-4 opacity-0 group-hover:opacity-100 transition-opacity">
             <motion.a href={videoUrl} download className="p-3 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white"><Download className="w-5 h-5" /></motion.a>
          </div>
        </GlassCard>
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

