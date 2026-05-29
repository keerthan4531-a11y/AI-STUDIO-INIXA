"use client";
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Play, Pause, Download, Wand2, Plus, FastForward, Rewind, Volume2 } from 'lucide-react';
import { GlassCard, SectionLabel, cn } from './GlassCard';
import { vibrate, saveMediaToGallery } from '../utils/helpers';
import { aiChat } from '../api/aiEngine';
import { generateSunoMusic, pollSunoMusic } from '../api/sunoApi';

const OPTIMIZER_SYSTEM_PROMPT = "You are an expert AI music producer and lyricist. The user will give you a short prompt. Expand it into detailed lyrics and musical style descriptions (e.g., genre, mood, tempo, instruments). Output should be highly structured with [Verse 1], [Chorus], etc. Focus on emotional impact and rhythm. ONLY output the lyrics and style tags. No chat, no filler.";

export function MusicStudio() {
  const [prompt, setPrompt] = useState(() => localStorage.getItem('inixa_music_last_prompt') || '');
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [songs, setSongs] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem('inixa_music_history') || '[]'); } catch { return []; }
  });
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    localStorage.setItem('inixa_music_history', JSON.stringify(songs));
  }, [songs]);

  const handleGenerate = async () => {
    vibrate(50);
    if (!prompt.trim() || loading) return;
    setLoading(true); setStatus('Initializing Neural Engine...'); setProgress(5);
    abortRef.current = new AbortController();
    
    try {
      // 1. Generate Request
      setStatus('Composing lyrics and melody...');
      setProgress(20);
      const taskId = await generateSunoMusic(prompt, isInstrumental);
      
      // 2. Poll for Results
      setStatus('Rendering audio layers...');
      setProgress(40);
      
      let attempts = 0;
      let newSongs = null;
      while (attempts < 60) {
        await new Promise(r => setTimeout(r, 5000));
        attempts++;
        setProgress(Math.min(95, 40 + attempts));
        
        const result = await pollSunoMusic(taskId);
        if (result && result.length > 0 && result[0].status === 'complete') {
          newSongs = result;
          break;
        } else if (result && result.length > 0 && result[0].status === 'error') {
          throw new Error('Generation failed');
        }
      }
      
      if (newSongs) {
        setSongs(prev => [...newSongs, ...prev]);
        setStatus('Complete');
        setProgress(100);
      } else {
        setStatus('Timeout waiting for audio');
      }
    } catch (err: any) {
      console.error(err);
      setStatus(err.message || 'Generation Failed');
    } finally {
      setTimeout(() => { setLoading(false); }, 1000);
    }
  };

  const togglePlay = (url: string, id: string) => {
    vibrate(20);
    if (playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(url);
      audioRef.current.play();
      setPlayingId(id);
      audioRef.current.onended = () => setPlayingId(null);
    }
  };

  const handleOptimize = async () => {
    if (!prompt.trim() || loading) return;
    vibrate(20); setLoading(true); setStatus('Optimizing prompt...');
    try { 
      const result = await aiChat([{ role: 'system', content: OPTIMIZER_SYSTEM_PROMPT }, { role: 'user', content: prompt }]); 
      setPrompt(result); 
    } catch {}
    setLoading(false); setStatus('');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 overflow-y-auto hide-scrollbar p-6 space-y-6 pb-32">
      <GlassCard className="p-6" glow="bg-fuchsia-500/10">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <SectionLabel icon={Music} text="Neural Music Studio" />
            <div className="flex items-center gap-2">
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setPrompt(''); vibrate(60); }} className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/30 hover:text-white transition-all">
                <Plus className="w-4 h-4" />
              </motion.button>
              <motion.button 
                whileTap={{ scale: 0.9 }} 
                onClick={handleOptimize}
                className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-fuchsia-400 transition-all flex items-center gap-2"
              >
                <Wand2 className="w-3.5 h-3.5" /> Optimize
              </motion.button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <textarea 
              value={prompt} 
              onChange={e => { setPrompt(e.target.value); localStorage.setItem('inixa_music_last_prompt', e.target.value); }} 
              placeholder="E.g., A fast-paced rock song about coding in Tamil... or write your own lyrics!" 
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white h-32 focus:outline-none focus:border-fuchsia-500/40 transition-all font-mono" 
            />
            
            <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl p-3">
              <span className="text-[11px] font-bold text-white/60 uppercase tracking-widest">Instrumental Only</span>
              <button 
                onClick={() => setIsInstrumental(!isInstrumental)}
                className={`w-10 h-5 rounded-full transition-all relative ${isInstrumental ? 'bg-fuchsia-500' : 'bg-white/10'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${isInstrumental ? 'left-5.5 translate-x-0.5' : 'left-0.5'}`} />
              </button>
            </div>
          </div>

          <button 
            onClick={handleGenerate} 
            disabled={!prompt.trim() || loading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-fuchsia-500/25 disabled:opacity-50 transition-all relative overflow-hidden group"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span className="animate-pulse">{status}</span>
              </div>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Music className="w-4 h-4" /> Generate Music
              </span>
            )}
            {loading && (
              <div className="absolute bottom-0 left-0 h-1 bg-white/20 transition-all" style={{ width: `${progress}%` }} />
            )}
          </button>
        </div>
      </GlassCard>

      {/* Generated Songs History */}
      {songs.length > 0 && (
        <div className="space-y-4">
          <SectionLabel icon={Volume2} text="Your Studio Tracks" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {songs.map((song) => (
              <GlassCard key={song.id} className="p-4 overflow-hidden relative group" glow="bg-fuchsia-500/5">
                <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 flex gap-4">
                  <div 
                    className="w-20 h-20 rounded-xl bg-cover bg-center border border-white/10 flex-shrink-0 relative overflow-hidden flex items-center justify-center cursor-pointer group/play"
                    style={{ backgroundImage: `url(${song.image_url})` }}
                    onClick={() => togglePlay(song.audio_url, song.id)}
                  >
                    <div className="absolute inset-0 bg-black/40 group-hover/play:bg-black/60 transition-colors" />
                    {playingId === song.id ? (
                      <Pause className="w-8 h-8 text-white relative z-10" />
                    ) : (
                      <Play className="w-8 h-8 text-white relative z-10 ml-1" />
                    )}
                    {playingId === song.id && (
                      <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(i => (
                          <motion.div key={i} animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }} className="w-1 bg-fuchsia-400 rounded-full" />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h4 className="text-sm font-bold text-white truncate mb-1">{song.title || 'Untitled Track'}</h4>
                    <p className="text-[10px] text-fuchsia-300 font-medium truncate mb-2">{song.tags || 'AI Generated'}</p>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                           const a = document.createElement('a');
                           a.href = song.audio_url;
                           a.download = `${song.title}.mp3`;
                           document.body.appendChild(a); a.click(); document.body.removeChild(a);
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
