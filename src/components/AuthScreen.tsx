"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, Mail, ZapIcon, ArrowRight, Eye, EyeOff, Sparkles } from 'lucide-react';
import { BlurredStagger } from './ui/blurred-stagger-text';
import { InixaLogo } from './Logos';

export type UserData = { name: string; email: string; joined: string };

export function AuthScreen({ onLogin }: { onLogin: (d: UserData) => void }) {
  const [isLogin, setIsLogin] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate loading for premium feel
    await new Promise(r => setTimeout(r, 800));
    
    if (isLogin) {
      onLogin({ name: email.split('@')[0] || 'User', email, joined: new Date().toLocaleDateString() });
    } else {
      if (!name || !email) return setIsLoading(false);
      onLogin({ name, email, joined: new Date().toLocaleDateString() });
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#030712]">
      {/* Animated background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            x: [0, 30, -20, 0], 
            y: [0, -40, 20, 0],
            scale: [1, 1.1, 0.95, 1] 
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-30%] left-[-20%] w-[70%] h-[70%] bg-indigo-600/15 blur-[150px] rounded-full" 
        />
        <motion.div 
          animate={{ 
            x: [0, -40, 30, 0], 
            y: [0, 30, -30, 0],
            scale: [1, 0.9, 1.15, 1] 
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-30%] right-[-20%] w-[70%] h-[70%] bg-purple-600/15 blur-[150px] rounded-full" 
        />
        <motion.div 
          animate={{ 
            x: [0, 20, -30, 0], 
            y: [0, -20, 40, 0] 
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-blue-500/8 blur-[120px] rounded-full" 
        />
        {/* Noise texture */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')] opacity-[0.03] mix-blend-overlay" />
      </div>

      {/* Login Card */}
      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative z-10 w-full max-w-[420px] mx-4"
      >
        {/* Glass card */}
        <div className="relative rounded-3xl overflow-hidden">
          {/* Border glow */}
          <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-b from-white/[0.15] via-white/[0.05] to-transparent" />
          
          {/* Card body */}
          <div className="relative rounded-3xl bg-[#0a0b14]/80 backdrop-blur-[60px] border border-white/[0.08] p-8 sm:p-10 shadow-[0_32px_64px_rgba(0,0,0,0.6)]">
            {/* Top glow accent */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[2px] bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent" />
            
            {/* Logo */}
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="flex justify-center mb-8"
            >
              <div className="relative group">
                <div className="absolute inset-0 bg-indigo-500/30 blur-2xl rounded-full scale-150 opacity-60 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-white/10 flex items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.2)]">
                  <InixaLogo size={36} className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
                </div>
              </div>
            </motion.div>

            {/* Title with BlurredStagger */}
            <div className="text-center mb-2">
              <BlurredStagger 
                text={isLogin ? "Welcome Back" : "Get Started"} 
                className="text-3xl sm:text-4xl font-black tracking-tight text-white inline-flex flex-wrap justify-center"
              />
            </div>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center text-sm text-white/30 mb-8 font-medium"
            >
              {isLogin ? 'Sign in to your Inixa account' : 'Create your free Inixa AI Studio account'}
            </motion.p>

            {/* Form */}
            <motion.form 
              onSubmit={handleSubmit} 
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <AnimatePresence mode="wait">
                {!isLogin && (
                  <motion.div
                    key="name-field"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-white/30 mb-2">
                      <User className="w-3.5 h-3.5" /> Full Name
                    </label>
                    <div className="relative">
                      <input 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        placeholder="Enter your name" 
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-3.5 px-4 text-[15px] text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/40 focus:bg-white/[0.06] focus:shadow-[0_0_20px_rgba(99,102,241,0.1)] transition-all duration-300 font-medium" 
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-white/30 mb-2">
                  <Mail className="w-3.5 h-3.5" /> Email
                </label>
                <input 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  type="email" 
                  placeholder="you@example.com" 
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-3.5 px-4 text-[15px] text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/40 focus:bg-white/[0.06] focus:shadow-[0_0_20px_rgba(99,102,241,0.1)] transition-all duration-300 font-medium" 
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-white/30 mb-2">
                  <Lock className="w-3.5 h-3.5" /> Password
                </label>
                <div className="relative">
                  <input 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-3.5 px-4 pr-12 text-[15px] text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/40 focus:bg-white/[0.06] focus:shadow-[0_0_20px_rgba(99,102,241,0.1)] transition-all duration-300 font-medium" 
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-white/20 hover:text-white/50 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit button */}
              <motion.button 
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                disabled={isLoading}
                className="relative w-full mt-6 overflow-hidden rounded-xl py-4 font-bold text-[15px] transition-all duration-300 group disabled:opacity-70"
              >
                {/* Button gradient background */}
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 group-hover:from-indigo-500 group-hover:to-purple-500 transition-all duration-300" />
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                {/* Shadow */}
                <div className="absolute inset-0 shadow-[0_8px_32px_rgba(99,102,241,0.35)] group-hover:shadow-[0_8px_40px_rgba(99,102,241,0.5)] transition-shadow" />
                
                <span className="relative z-10 flex items-center justify-center gap-2 text-white">
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      {isLogin ? 'Sign In' : 'Create Account'}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </span>
              </motion.button>
            </motion.form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-white/10" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/15">or</span>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-white/10" />
            </div>

            {/* Google-style button (just uses same login) */}
            <motion.button 
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setIsLoading(true);
                setTimeout(() => {
                  onLogin({ name: 'User', email: 'user@inixa.ai', joined: new Date().toLocaleDateString() });
                }, 600);
              }}
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.15] transition-all duration-300 group"
            >
              {/* Google icon */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="text-sm font-bold text-white/60 group-hover:text-white/80 transition-colors">Continue with Google</span>
            </motion.button>

            {/* Switch login/signup */}
            <div className="text-center mt-6">
              <button 
                onClick={() => { setIsLogin(!isLogin); setName(''); setEmail(''); setPassword(''); }}
                className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/20 hover:text-indigo-400 transition-colors duration-300"
              >
                {isLogin ? "Don't have an account? Create One" : "Already have an account? Sign In"}
              </button>
            </div>
          </div>
        </div>
        
        {/* Bottom branding */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center mt-6"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/10">
            Powered by Inixa AI Studio
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
