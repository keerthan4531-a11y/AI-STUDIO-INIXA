"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Terminal, 
  Key, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  ExternalLink, 
  Code2, 
  ShieldCheck, 
  Zap, 
  Globe,
  Layers,
  Cpu
} from 'lucide-react';
import { generateApiKey, getApiKeys, deleteApiKey, type InixaApiKey } from '../api/apiService';
import { AI_MODELS } from '../api/aiEngine';
import { vibrate } from '../utils/helpers';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

// Mock data for the usage graph
const usageData = [
  { time: '00:00', requests: 12 },
  { time: '04:00', requests: 45 },
  { time: '08:00', requests: 120 },
  { time: '12:00', requests: 85 },
  { time: '16:00', requests: 210 },
  { time: '20:00', requests: 150 },
  { time: '23:59', requests: 180 },
];

export function DeveloperConsole() {
  const [keys, setKeys] = useState<InixaApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newlyGeneratedKey, setNewlyGeneratedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'keys' | 'docs' | 'analytics'>('keys');

  const refreshKeys = async () => {
    const freshKeys = await getApiKeys();
    setKeys(freshKeys);
  };

  useEffect(() => {
    refreshKeys();
  }, []);

  const [isGenerating, setIsGenerating] = useState(false);

  const handleAddKey = async () => {
    if (!newKeyName.trim() || isGenerating) return;
    setIsGenerating(true);
    vibrate(50);
    try {
      const result = await generateApiKey(newKeyName);
      setNewlyGeneratedKey(result.rawKey);
      await refreshKeys();
      setNewKeyName('');
      setShowAddModal(false);
    } catch (e) {
      console.error(e);
      alert('Failed to generate key');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteKey = async (keyHash: string) => {
    if (!confirm('Are you sure you want to delete this API key? This will break any apps using it.')) return;
    vibrate(100);
    try {
      await deleteApiKey(keyHash);
      await refreshKeys();
    } catch (e) {
      console.error(e);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    vibrate(30);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#080a14] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-8 border-b border-white/[0.05] apple-glass-thick relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 blur-[100px] rounded-full -mr-48 -mt-48 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                <Terminal className="w-4 h-4 text-indigo-400" />
              </div>
              <span className="text-[10px] font-black tracking-[0.2em] uppercase text-indigo-400">Developer Ecosystem</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white mb-2">
              Inixa <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">API Service</span>
            </h1>
            <p className="text-white/40 text-sm max-w-xl">
              Power your own applications with elite neural intelligence. Monitor your API usage and performance in real-time.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 w-fit">
            <button 
              onClick={() => setActiveTab('keys')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'keys' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-white/40 hover:text-white'}`}
            >
              API Keys
            </button>
            <button 
              onClick={() => setActiveTab('docs')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'docs' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-white/40 hover:text-white'}`}
            >
              Documentation
            </button>
            <button 
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'analytics' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-white/40 hover:text-white'}`}
            >
              Live Monitor
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 hide-scrollbar">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'analytics' && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Requests', value: keys.reduce((sum, k) => sum + (k.totalRequests || 0), 0).toLocaleString(), change: 'Live', color: 'text-indigo-400' },
                  { label: 'Avg Latency', value: '420ms', change: 'Stable', color: 'text-green-400' },
                  { label: 'Success Rate', value: '99.9%', change: 'Stable', color: 'text-blue-400' },
                  { label: 'Active Keys', value: keys.length.toString(), change: 'Live', color: 'text-purple-400' },
                ].map((stat, i) => (
                  <div key={i} className="p-6 rounded-3xl apple-glass border border-white/5 relative overflow-hidden group hover:border-white/10 transition-all">
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">{stat.label}</p>
                    <h3 className={`text-2xl font-black ${stat.color}`}>{stat.value}</h3>
                    <span className="text-[10px] font-bold text-white/40 mt-1 block">{stat.change}</span>
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                       <Zap className="w-8 h-8" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Usage Graph */}
              <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 relative">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">Traffic Real-time Monitor</h2>
                    <p className="text-white/40 text-xs">Visualizing API calls across all active developer keys.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Live Feed</span>
                  </div>
                </div>
                
                <div className="h-[300px] w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={usageData}>
                      <defs>
                        <linearGradient id="colorReq" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis 
                        dataKey="time" 
                        stroke="rgba(255,255,255,0.2)" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="rgba(255,255,255,0.2)" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        tickFormatter={(value) => `${value}`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(10, 10, 15, 0.9)', 
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '12px',
                          fontSize: '11px'
                        }} 
                        itemStyle={{ color: '#818cf8' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="requests" 
                        stroke="#6366f1" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorReq)" 
                        animationDuration={2000}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'keys' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">Your API Keys</h2>
                  <p className="text-white/40 text-xs">Manage your authentication tokens to access Inixa AI services.</p>
                </div>
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-500/20"
                >
                  <Plus className="w-4 h-4" />
                  Create New Key
                </button>
              </div>

              {keys.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 rounded-3xl border-2 border-dashed border-white/5 bg-white/[0.02]">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                    <Key className="w-8 h-8 text-white/20" />
                  </div>
                  <h3 className="text-lg font-bold text-white/60 mb-2">No API keys yet</h3>
                  <p className="text-white/30 text-sm max-w-xs text-center mb-6">Create your first API key to start integrating Inixa intelligence into your projects.</p>
                  <button 
                    onClick={() => setShowAddModal(true)}
                    className="text-indigo-400 font-bold text-sm hover:text-indigo-300 transition-colors"
                  >
                    Click here to generate one
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {keys.map((k) => (
                    <motion.div 
                      key={k.key}
                      layout
                      className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-between group hover:border-indigo-500/30 transition-all hover:bg-white/[0.05]"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                          <ShieldCheck className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white mb-1">{k.name}</h3>
                          <div className="flex items-center gap-3">
                            <code className="text-[11px] text-white/40 font-mono bg-black/40 px-2 py-0.5 rounded">
                              {k.keyPrefix}****************
                            </code>
                            <span className="text-[10px] text-white/20 uppercase tracking-widest font-black">
                              Created {new Date(k.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => copyToClipboard(`${k.keyPrefix}****************`)}
                          className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 transition-all"
                          title="Copy Key Prefix"
                        >
                          {copiedKey === `${k.keyPrefix}****************` ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button 
                          onClick={() => k.key && handleDeleteKey(k.key)}
                          className="w-9 h-9 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 transition-all"
                          title="Delete Key"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* API Capabilities Section */}
              <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-3xl apple-glass border border-white/5">
                  <Zap className="w-8 h-8 text-yellow-400 mb-4" />
                  <h4 className="text-lg font-bold text-white mb-2">Ultra Low Latency</h4>
                  <p className="text-white/40 text-xs leading-relaxed">Direct proxy to Tier-1 model providers ensures sub-second response times for global deployments.</p>
                </div>
                <div className="p-6 rounded-3xl apple-glass border border-white/5">
                  <Layers className="w-8 h-8 text-blue-400 mb-4" />
                  <h4 className="text-lg font-bold text-white mb-2">Multi-Model Mesh</h4>
                  <p className="text-white/40 text-xs leading-relaxed">Swap between GPT, Claude, and Gemini dynamically without changing your codebase integration.</p>
                </div>
                <div className="p-6 rounded-3xl apple-glass border border-white/5">
                  <ShieldCheck className="w-8 h-8 text-green-400 mb-4" />
                  <h4 className="text-lg font-bold text-white mb-2">Enterprise Security</h4>
                  <p className="text-white/40 text-xs leading-relaxed">AES-256 encrypted token handling and rate-limiting protect your infrastructure from abuse.</p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'docs' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-12 pb-20">
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <Globe className="w-6 h-6 text-indigo-400" />
                  <h2 className="text-2xl font-bold text-white">Public API Endpoint</h2>
                </div>
                <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Production URL</p>
                    <code className="text-sm text-white font-mono">https://ai-studio-inixa.vercel.app/api/v1/chat/completions</code>
                  </div>
                  <button onClick={() => copyToClipboard('https://ai-studio-inixa.vercel.app/api/v1/chat/completions')} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-bold transition-all border border-indigo-500/20">
                    <Copy className="w-4 h-4" /> Copy Endpoint
                  </button>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-3 mb-6">
                  <Code2 className="w-6 h-6 text-purple-400" />
                  <h2 className="text-2xl font-bold text-white">Integration Guide</h2>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] font-black">1</span>
                      JavaScript / TypeScript
                    </h3>
                    <div className="p-5 rounded-2xl bg-[#0d1117] border border-white/10 overflow-hidden relative group">
                      <pre className="text-[11px] leading-relaxed font-mono text-white/80 overflow-x-auto">
{`// API Call using Inixa Key
const res = await fetch('https://ai-studio-inixa.vercel.app/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_INIXA_KEY'
  },
  body: JSON.stringify({
    model: 'gpt-5.4-pro',
    messages: [{ role: 'user', content: 'Hello!' }]
  })
});

const data = await res.json();
console.log(data.choices[0].message.content);`}
                      </pre>
                      <button 
                        onClick={() => copyToClipboard(`const res = await fetch('https://ai-studio-inixa.vercel.app/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_INIXA_KEY'
  },
  body: JSON.stringify({
    model: 'gpt-5.4-pro',
    messages: [{ role: 'user', content: 'Hello!' }]
  })
});

const data = await res.json();
console.log(data.choices[0].message.content);`)}
                        className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-[10px] font-black">2</span>
                      Python Example
                    </h3>
                    <div className="p-5 rounded-2xl bg-[#0d1117] border border-white/10 overflow-hidden relative group">
                      <pre className="text-[11px] leading-relaxed font-mono text-white/80 overflow-x-auto">
{`import requests

url = "https://ai-studio-inixa.vercel.app/api/v1/chat/completions"
headers = {
    "Authorization": "Bearer YOUR_INIXA_KEY",
    "Content-Type": "application/json"
}
data = {
    "model": "claude-4.5-sonnet",
    "messages": [{"role": "user", "content": "Hi!"}]
}

response = requests.post(url, headers=headers, json=data)
print(response.json()["choices"][0]["message"]["content"])`}
                      </pre>
                      <button 
                        onClick={() => copyToClipboard(`import requests

url = "https://ai-studio-inixa.vercel.app/api/v1/chat/completions"
headers = {
    "Authorization": "Bearer YOUR_INIXA_KEY",
    "Content-Type": "application/json"
}
data = {
    "model": "claude-4.5-sonnet",
    "messages": [{"role": "user", "content": "Hi!"}]
}

response = requests.post(url, headers=headers, json=data)
print(response.json()["choices"][0]["message"]["content"])`)}
                        className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-3 mb-6">
                  <Cpu className="w-6 h-6 text-blue-400" />
                  <h2 className="text-2xl font-bold text-white">Supported Models</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {AI_MODELS.filter(m => m.id !== 'auto').slice(0, 8).map(m => (
                    <div key={m.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:border-indigo-500/20 transition-all">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-tighter">Model ID</span>
                      </div>
                      <div className="text-xs font-bold text-white mb-1">{m.modelStr}</div>
                      <div className="text-[10px] text-white/20">{m.label}</div>
                    </div>
                  ))}
                </div>
              </section>
            </motion.div>
          )}
        </div>
      </div>

      {/* Add Key Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md apple-glass-thick border border-white/10 rounded-[32px] overflow-hidden relative z-10 shadow-2xl"
            >
              <div className="p-8">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center mb-6 border border-indigo-500/30">
                  <Key className="w-8 h-8 text-indigo-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Create API Key</h3>
                <p className="text-white/40 text-sm mb-8">Give your key a descriptive name to help you identify it later.</p>
                
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2 block">Key Name</label>
                    <input 
                      autoFocus
                      type="text" 
                      placeholder="e.g. My Next.js Project" 
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddKey()}
                      className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-5 text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 transition-all"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button 
                      onClick={() => setShowAddModal(false)}
                      className="flex-1 h-14 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleAddKey}
                      disabled={!newKeyName.trim() || isGenerating}
                      className="flex-1 h-14 rounded-2xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition-all shadow-lg shadow-indigo-500/20"
                    >
                      {isGenerating ? 'Generating...' : 'Generate Key'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Newly Generated Key Modal */}
      <AnimatePresence>
        {newlyGeneratedKey && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#0f111a] border border-white/10 p-8 rounded-[32px] w-full max-w-lg shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 blur-[80px] rounded-full -mr-32 -mt-32 pointer-events-none" />
              
              <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20 mb-6">
                <ShieldCheck className="w-8 h-8 text-green-400" />
              </div>
              
              <h2 className="text-2xl font-black text-white mb-2">Save Your API Key</h2>
              <p className="text-white/40 text-sm mb-6">
                Please copy this API key now. <strong className="text-white">You won't be able to see it again!</strong>
              </p>
              
              <div className="bg-black/50 p-4 rounded-xl border border-white/5 flex items-center justify-between gap-4 mb-8">
                <code className="text-green-400 font-mono text-sm truncate">
                  {newlyGeneratedKey}
                </code>
                <button 
                  onClick={() => copyToClipboard(newlyGeneratedKey)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all flex-shrink-0"
                  title="Copy Full Key"
                >
                  {copiedKey === newlyGeneratedKey ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex justify-end">
                <button 
                  onClick={() => setNewlyGeneratedKey(null)}
                  className="px-6 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold transition-all"
                >
                  I've saved it
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

