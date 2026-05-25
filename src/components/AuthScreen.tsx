"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Globe, ZapIcon } from 'lucide-react';
import { GlassCard, SectionLabel } from './GlassCard';

export type UserData = { name: string; email: string; joined: string };

export function AuthScreen({ onLogin }: { onLogin: (d: UserData) => void }) {
  const [isLogin, setIsLogin] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
       onLogin({ name: 'User', email: 'user@example.com', joined: new Date().toLocaleDateString() });
    } else {
       if (!name || !email) return;
       onLogin({ name, email, joined: new Date().toLocaleDateString() });
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex items-center justify-center p-6 bg-transparent">
      <GlassCard className="w-full max-w-sm p-8 space-y-8" glow="bg-blue-500/10">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-600/20 rounded-[24px] flex items-center justify-center mx-auto mb-4 border border-blue-500/20 shadow-2xl">
            <ZapIcon className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">{isLogin ? 'Welcome Back' : 'Get Started'}</h2>
          <p className="text-sm text-white/40">{isLogin ? 'Sign in to continue.' : 'Create your Inixa account'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <SectionLabel icon={User} text="Full Name" />
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Type your name..." className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 text-sm text-white focus:outline-none focus:border-blue-500/40 transition-all font-medium" />
            </div>
          )}
          <div className="space-y-2">
             <SectionLabel icon={Globe} text="Email" />
             <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="email@example.com" className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 text-sm text-white focus:outline-none focus:border-blue-500/40 transition-all font-medium" />
          </div>
          <motion.button whileTap={{ scale: 0.98 }} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-500/20 transition-all mt-4">
            {isLogin ? 'Sign In' : 'Create Account'}
          </motion.button>
        </form>

        <div className="text-center">
          <button onClick={() => setIsLogin(!isLogin)} className="text-[11px] font-bold uppercase tracking-widest text-white/30 hover:text-white transition-colors">
            {isLogin ? "Don't have an account? Create One" : "Already have an account? Sign In"}
          </button>
        </div>
      </GlassCard>
    </motion.div>
  );
}

