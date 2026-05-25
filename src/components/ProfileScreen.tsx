"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Film, Image as ImageIcon, XCircle, Loader2, History, Activity, Database, Trash2, Shield, Settings, MessageSquare } from 'lucide-react';
import { GlassCard, cn } from './GlassCard';
import { vibrate } from '../utils/helpers';
import type { UserData } from './AuthScreen';
import localforage from 'localforage';


function CustomInstructionsEditor() {
  const [instructions, setInstructions] = useState(() => localStorage.getItem('inixa_custom_instructions') || '');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem('inixa_custom_instructions', instructions);
    setSaved(true);
    vibrate(30);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Settings className="w-4 h-4 text-indigo-400" />
        <h3 className="text-base font-black text-white tracking-tight">Custom Instructions</h3>
      </div>
      <p className="text-[11px] text-white/30 px-1 leading-relaxed">
        Tell the AI about yourself and how you want it to respond. These rules apply to every conversation.
      </p>
      <textarea
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        placeholder={"Example:\n• I am a B.Tech AI & DS student\n• Always respond in Tamil\n• I prefer code examples in Python\n• Keep answers concise"}
        className="w-full h-32 bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 text-sm text-white/80 placeholder-white/20 resize-none focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 transition-all"
      />
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleSave}
        className={cn(
          "w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all",
          saved 
            ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400" 
            : "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20"
        )}
      >
        {saved ? '✓ Saved!' : 'Save Instructions'}
      </motion.button>
    </div>
  );
}

function HistoryGallery() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGallery = async () => {
    try {
      const data = await localforage.getItem<any[]>('inixa_gallery') || [];
      const renderedItems = data.map(item => ({
        ...item,
        renderUrl: typeof item.blob === 'string' ? item.blob : URL.createObjectURL(item.blob)
      }));
      setItems(renderedItems);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => {
    loadGallery();
    return () => {
      items.forEach(item => { if (item.renderUrl && typeof item.blob !== 'string') URL.revokeObjectURL(item.renderUrl); });
    };
  }, []);

  const deleteItem = async (id: number) => {
    vibrate(60);
    const newItems = items.filter(item => item.id !== id);
    setItems(newItems);
    const dbItems = newItems.map(item => {
      const { renderUrl, ...rest } = item;
      return rest;
    });
    await localforage.setItem('inixa_gallery', dbItems);
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="w-6 h-6 text-blue-400 animate-spin" /></div>;
  if (items.length === 0) return (
    <div className="flex flex-col items-center justify-center p-10 text-white/20 text-center gap-3 bg-white/[0.02] border border-white/[0.05] rounded-[32px]">
      <History className="w-10 h-10 mb-2 opacity-30" />
      <p className="text-sm font-bold">No Saved Creations</p>
      <p className="text-[9px] uppercase tracking-widest leading-relaxed px-4">Generated media will appear here.</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-5">
      {items.map(item => (
        <GlassCard key={item.id} className="overflow-hidden group">
          <div className="p-3 border-b border-white/[0.06] flex items-center justify-between bg-black/20">
            <div className="flex items-center gap-2">
              {item.type === 'video' ? <Film className="w-4 h-4 text-violet-400" /> : <ImageIcon className="w-4 h-4 text-cyan-400" />}
              <span className="text-[11px] font-bold text-white/70 max-w-[200px] truncate">{item.prompt || 'Untitled'}</span>
            </div>
            <motion.button onClick={() => deleteItem(item.id)} className="p-1 text-red-400/50 hover:text-red-400 transition-colors">
              <XCircle className="w-4 h-4" />
            </motion.button>
          </div>
          {item.type === 'video' ? (
            <video src={item.renderUrl} controls className="w-full max-h-[400px] bg-black/50 object-cover" />
          ) : (
            <img src={item.renderUrl} alt={item.prompt} className="w-full max-h-[400px] object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
          )}
        </GlassCard>
      ))}
    </div>
  );
}

export function ProfileScreen({ user, onLogout }: { user: UserData; onLogout: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto hide-scrollbar p-6 space-y-8 pb-32">
      <div className="flex items-center gap-5">
        <div className="w-20 h-20 rounded-[30px] bg-gradient-to-br from-indigo-500 to-purple-600 p-[1px] shadow-2xl">
          <div className="w-full h-full rounded-[29px] bg-black/40 backdrop-blur-3xl flex items-center justify-center border border-white/10 overflow-hidden">
             <User className="w-8 h-8 text-white/80" />
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-black text-white leading-tight">{user.name}</h2>
          <p className="text-sm text-white/40 font-medium">{user.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-black uppercase tracking-widest">Premium AI Plan</span>
            <span className="text-[9px] text-white/20 uppercase tracking-widest font-bold">Joined {user.joined}</span>
          </div>
        </div>
      </div>

      {/* Stats Widgets */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex flex-col gap-1">
           <Activity className="w-4 h-4 text-emerald-400 mb-1" />
           <p className="text-2xl font-black text-white">1,240</p>
           <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Total Prompts</p>
        </div>
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex flex-col gap-1">
           <Database className="w-4 h-4 text-cyan-400 mb-1" />
           <p className="text-2xl font-black text-white">45<span className="text-sm text-white/40">MB</span></p>
           <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Local Storage Used</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
           <h3 className="text-base font-black text-white tracking-tight">Saved Creations</h3>
        </div>
        <HistoryGallery />
      </div>

      {/* Custom Instructions */}
      <CustomInstructionsEditor />

      <div className="pt-4 space-y-3">
        <h3 className="text-[11px] font-black text-white/30 uppercase tracking-widest px-1">Settings & Data</h3>
        
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            const saved = localStorage.getItem('inixa_low_power');
            const current = saved === null ? true : saved === 'true';
            localStorage.setItem('inixa_low_power', (!current).toString());
            window.location.reload();
          }}
          className={cn("w-full py-4 rounded-2xl border flex items-center justify-between px-6 transition-all", 
            (localStorage.getItem('inixa_low_power') === null || localStorage.getItem('inixa_low_power') === 'true') ? "bg-amber-500/10 border-amber-500/30" : "bg-white/5 border-white/10"
          )}
        >
          <div className="flex items-center gap-3">
             <Activity className={cn("w-4 h-4", (localStorage.getItem('inixa_low_power') === null || localStorage.getItem('inixa_low_power') === 'true') ? "text-amber-400" : "text-white/40")} />
             <div className="text-left">
               <p className="text-xs font-bold text-white/80">Power Saver</p>
               <p className="text-[8px] text-white/30 uppercase tracking-widest">Disable UI Animations</p>
             </div>
          </div>
          <div className={cn("w-10 h-5 rounded-full relative transition-all", (localStorage.getItem('inixa_low_power') === null || localStorage.getItem('inixa_low_power') === 'true') ? "bg-amber-500" : "bg-white/10")}>
             <div className={cn("absolute top-1 w-3 h-3 rounded-full bg-white transition-all", (localStorage.getItem('inixa_low_power') === null || localStorage.getItem('inixa_low_power') === 'true') ? "left-6" : "left-1")} />
          </div>
        </motion.button>

        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            if (confirm('Are you sure you want to clear all chat history and cached data? This cannot be undone.')) {
              localStorage.clear();
              window.location.reload();
            }
          }}
          className="w-full py-4 rounded-2xl bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 flex items-center px-6 transition-all group"
        >
          <div className="flex items-center gap-3">
             <Trash2 className="w-4 h-4 text-white/40 group-hover:text-red-400 transition-colors" />
             <div className="text-left">
               <p className="text-xs font-bold text-white/80 group-hover:text-red-400 transition-colors">Clear Local Data</p>
               <p className="text-[8px] text-white/30 uppercase tracking-widest group-hover:text-red-400/50 transition-colors">Wipe all chats & settings</p>
             </div>
          </div>
        </motion.button>

        <motion.button onClick={onLogout} whileTap={{ scale: 0.95 }} className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 font-bold text-xs uppercase tracking-widest mt-4">
           Sign Out
        </motion.button>
      </div>

      <div className="flex flex-col items-center justify-center pt-8 pb-4 opacity-30">
        <Shield className="w-6 h-6 mb-2" />
        <p className="text-[10px] font-black uppercase tracking-widest">Inixa OS v8.5 Preview</p>
        <p className="text-[9px] mt-1 font-medium">End-to-End Encrypted Session</p>
      </div>
    </motion.div>
  );
}

