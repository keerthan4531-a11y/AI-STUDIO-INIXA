"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, User, KeyRound, Swords, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';
import { vibrate } from '../../utils/helpers';

interface Props {
  isOpen: boolean;
  onLoginSuccess: (username: string) => void;
}

export function BattleLoginModal({ isOpen, onLoginSuccess }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMsg('Please enter your contestant name.');
      vibrate(80);
      return;
    }

    if (password.trim() !== 'nscet@84') {
      setErrorMsg('Invalid Tournament Password. Password is nscet@84');
      vibrate(100);
      return;
    }

    vibrate(50);
    setErrorMsg('');
    onLoginSuccess(username.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-[#0f111a] border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden relative text-white"
      >
        {/* Glow Accent */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-36 h-36 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex flex-col items-center text-center gap-3 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 border border-white/20">
            <Swords className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-xl font-black bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent">
                INIXA Battle Gateway
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                AUTH REQUIRED
              </span>
            </div>
            <p className="text-xs text-white/50 mt-1">
              Enter your Contestant Name & Common Event Password
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </motion.div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-white/60 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              Contestant Name
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your full name (e.g. Ramesh, Priya)"
              className="w-full bg-white/[0.04] border border-white/15 focus:border-indigo-500 rounded-xl p-3.5 text-xs text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-semibold"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-white/60 mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-purple-400" />
              Event Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter common password (nscet@84)"
              className="w-full bg-white/[0.04] border border-white/15 focus:border-purple-500 rounded-xl p-3.5 text-xs text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all font-semibold"
            />
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white hover:brightness-110 shadow-lg shadow-indigo-600/30 transition-all mt-2"
          >
            <ShieldCheck className="w-4 h-4" />
            Unlock Tournament Arena
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-5 text-center text-[10px] text-white/40 border-t border-white/10 pt-3">
          Password: <strong className="text-indigo-300 font-mono">nscet@84</strong> (Same for all participants)
        </div>
      </motion.div>
    </div>
  );
}
