"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Terminal,
  Copy,
  Check,
  Zap,
  Globe,
  Play,
  Sparkles,
  Laptop,
  Key,
  Layers,
  Activity,
  CheckCircle2,
  ExternalLink,
  Code2,
  Settings,
  Command,
  HelpCircle,
  RefreshCw,
  Cpu,
  ArrowRight
} from 'lucide-react';
import { InixaLogo } from './Logos';

export function ClaudeCodeSetupScreen() {
  const [activeOs, setActiveOs] = useState<'windows' | 'mac' | 'linux'>('windows');
  const [baseUrl, setBaseUrl] = useState<string>('http://localhost:3000');
  const [apiKey, setApiKey] = useState<string>('sk-inixa-local-key');
  const [selectedModel, setSelectedModel] = useState<string>('claude-3-5-sonnet-20241022');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Live Endpoint Tester State
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testLatency, setTestLatency] = useState<number | null>(null);
  const [testResponseText, setTestResponseText] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
    }
  }, []);

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const jsonConfig = JSON.stringify(
    {
      env: {
        ANTHROPIC_BASE_URL: baseUrl,
        ANTHROPIC_API_KEY: apiKey || 'sk-inixa-local-key',
        CLAUDE_CODE_SKIP_FAST_MODE_ORG_CHECK: '1',
      },
    },
    null,
    2
  );

  const getPowerShellCmd = () => {
    return `$env:ANTHROPIC_BASE_URL="${baseUrl}"\n$env:ANTHROPIC_API_KEY="${apiKey || 'sk-inixa-local-key'}"\nclaude`;
  };

  const getBashCmd = () => {
    return `export ANTHROPIC_BASE_URL="${baseUrl}"\nexport ANTHROPIC_API_KEY="${apiKey || 'sk-inixa-local-key'}"\nclaude`;
  };

  const runLiveTest = async () => {
    setTestStatus('testing');
    setTestLatency(null);
    setTestResponseText('');
    const startTime = Date.now();

    try {
      const res = await fetch('/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [{ role: 'user', content: 'Say "Inixa Claude Code Proxy Online!" in 5 words.' }],
          stream: false,
        }),
      });

      const elapsed = Date.now() - startTime;
      setTestLatency(elapsed);

      if (res.ok) {
        const data = await res.json();
        const msgText = data?.content?.[0]?.text || data?.choices?.[0]?.message?.content || JSON.stringify(data);
        setTestResponseText(msgText);
        setTestStatus('success');
      } else {
        const errJson = await res.json().catch(() => ({}));
        setTestResponseText(errJson?.error?.message || `HTTP ${res.status} Error`);
        setTestStatus('error');
      }
    } catch (err: any) {
      setTestLatency(Date.now() - startTime);
      setTestResponseText(err.message || 'Connection failed');
      setTestStatus('error');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#05060b] text-white overflow-y-auto custom-scrollbar p-4 md:p-8 lg:p-12 relative">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto w-full space-y-10 relative z-10">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 backdrop-blur-md shadow-lg">
            <Sparkles className="w-4 h-4 text-indigo-400 animate-spin-slow" />
            <span className="text-xs font-semibold tracking-wider text-indigo-300 uppercase">
              CLI Integration Center
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
              LIVE PROXY
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            Connect <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-amber-500 bg-clip-text text-transparent">Claude Code CLI</span> to <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">Inixa AI Engine</span>
          </h1>

          <p className="text-white/60 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
            Use Claude Code CLI directly with our free hosted endpoints on Vercel or locally. Bridge Claude’s agentic capabilities with GPT-5.2, Qwen 3.7, DeepSeek V3, and Gemini 2.5 Flash.
          </p>
        </motion.div>

        {/* Dynamic Endpoint Status Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-black/60 border border-indigo-500/20 backdrop-blur-xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <Globe className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="text-xs text-white/50 font-mono uppercase tracking-wider">Active Anthropic Target URL</div>
              <div className="text-lg font-bold text-white font-mono flex items-center gap-2">
                {baseUrl}
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={runLiveTest}
              disabled={testStatus === 'testing'}
              className="flex-1 md:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {testStatus === 'testing' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  Testing Ping...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current text-white" />
                  Test Live Endpoint
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Live Test Result Box */}
        <AnimatePresence>
          {testStatus !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`p-4 rounded-xl border text-sm font-mono flex flex-col gap-2 ${
                testStatus === 'success'
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                  : testStatus === 'error'
                  ? 'bg-rose-950/30 border-rose-500/30 text-rose-200'
                  : 'bg-indigo-950/30 border-indigo-500/30 text-indigo-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold">
                  {testStatus === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {testStatus === 'error' && <Activity className="w-4 h-4 text-rose-400" />}
                  {testStatus === 'testing' && <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />}
                  <span>
                    {testStatus === 'success' && 'Endpoint Reachable & Responding!'}
                    {testStatus === 'error' && 'Endpoint Connection Issue'}
                    {testStatus === 'testing' && 'Sending Anthropic Message Payload...'}
                  </span>
                </div>
                {testLatency !== null && (
                  <span className="text-xs opacity-75 font-mono">Latency: {testLatency}ms</span>
                )}
              </div>
              {testResponseText && (
                <div className="p-3 bg-black/40 rounded-lg border border-white/5 text-xs text-white/90 whitespace-pre-wrap">
                  {testResponseText}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main 2-Column Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Interactive Settings Builder */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-2xl bg-[#0b0d17]/80 border border-white/10 backdrop-blur-xl shadow-xl space-y-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Config Generator</h3>
                  <p className="text-xs text-white/50">Customize your target settings</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1.5">
                    Target Base URL
                  </label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-indigo-500/50 transition-all"
                  />
                  <p className="text-[11px] text-white/40 mt-1">Use this domain or http://localhost:3000 for local proxy.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1.5">
                    Inixa API Key (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-inixa-local-key"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-indigo-500/50 transition-all pr-10"
                    />
                    <Key className="w-4 h-4 text-white/30 absolute right-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1.5">
                    Default Preferred Model
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#121424] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-indigo-500/50 transition-all"
                  >
                    <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (OverChat Proxy)</option>
                    <option value="overchat/gpt-5.2">GPT-5.2 Elite Engine</option>
                    <option value="qwen-free/qwen-max">Qwen 3.7 Max (Free Engine)</option>
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Quick OS selector tabs */}
            <div className="p-6 rounded-2xl bg-[#0b0d17]/80 border border-white/10 backdrop-blur-xl shadow-xl space-y-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Laptop className="w-4 h-4 text-indigo-400" />
                Select Operating System
              </h3>

              <div className="grid grid-cols-3 gap-2">
                {(['windows', 'mac', 'linux'] as const).map((os) => (
                  <button
                    key={os}
                    onClick={() => setActiveOs(os)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-medium capitalize flex items-center justify-center gap-1.5 transition-all ${
                      activeOs === os
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20 font-bold'
                        : 'bg-white/5 hover:bg-white/10 text-white/60'
                    }`}
                  >
                    {os === 'windows' && <Laptop className="w-3.5 h-3.5" />}
                    {os === 'mac' && <Command className="w-3.5 h-3.5" />}
                    {os === 'linux' && <Terminal className="w-3.5 h-3.5" />}
                    {os}
                  </button>
                ))}
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-xs text-white/70 space-y-1 font-mono">
                <div className="font-bold text-indigo-300">File Location:</div>
                <div className="text-amber-300 break-all">
                  {activeOs === 'windows'
                    ? '%USERPROFILE%\\.claude\\settings.json'
                    : '~/.claude/settings.json'}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Code Blocks & Copy Instructions */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: JSON File Configuration */}
            <div className="p-6 rounded-2xl bg-[#0b0d17]/80 border border-white/10 backdrop-blur-xl shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold text-xs flex items-center justify-center">
                    1
                  </span>
                  <div>
                    <h3 className="font-bold text-base text-white">Save JSON Settings File</h3>
                    <p className="text-xs text-white/50">Save this content in your <code className="text-amber-300 font-mono">settings.json</code></p>
                  </div>
                </div>

                <button
                  onClick={() => copyToClipboard(jsonConfig, 'json')}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 font-medium text-xs flex items-center gap-1.5 transition-all active:scale-95"
                >
                  {copiedField === 'json' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy JSON
                    </>
                  )}
                </button>
              </div>

              <div className="relative rounded-xl bg-black/60 border border-white/10 overflow-hidden font-mono text-xs">
                <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5 text-[11px] text-white/40">
                  <span>settings.json</span>
                  <span className="text-indigo-400 font-semibold">JSON</span>
                </div>
                <pre className="p-4 text-emerald-300/90 overflow-x-auto custom-scrollbar leading-relaxed">
                  {jsonConfig}
                </pre>
              </div>
            </div>

            {/* Step 2: One-Liner Terminal Launch */}
            <div className="p-6 rounded-2xl bg-[#0b0d17]/80 border border-white/10 backdrop-blur-xl shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 font-bold text-xs flex items-center justify-center">
                    2
                  </span>
                  <div>
                    <h3 className="font-bold text-base text-white">Terminal Environment Commands</h3>
                    <p className="text-xs text-white/50">Run in your terminal for immediate session launch</p>
                  </div>
                </div>

                <button
                  onClick={() =>
                    copyToClipboard(
                      activeOs === 'windows' ? getPowerShellCmd() : getBashCmd(),
                      'term'
                    )
                  }
                  className="px-3.5 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 font-medium text-xs flex items-center gap-1.5 transition-all active:scale-95"
                >
                  {copiedField === 'term' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Script
                    </>
                  )}
                </button>
              </div>

              <div className="relative rounded-xl bg-black/60 border border-white/10 overflow-hidden font-mono text-xs">
                <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5 text-[11px] text-white/40">
                  <span>{activeOs === 'windows' ? 'PowerShell' : 'Bash / Zsh'}</span>
                  <span className="text-purple-400 font-semibold">CLI</span>
                </div>
                <pre className="p-4 text-purple-300 overflow-x-auto custom-scrollbar leading-relaxed">
                  {activeOs === 'windows' ? getPowerShellCmd() : getBashCmd()}
                </pre>
              </div>
            </div>

            {/* Step 3: Launching Claude Code */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border border-indigo-500/30 backdrop-blur-xl shadow-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0">
                  3
                </span>
                <div>
                  <h3 className="font-bold text-sm text-white">Start Coding in Terminal!</h3>
                  <p className="text-xs text-white/60">Type <code className="text-amber-300 font-bold">claude</code> in any directory to execute prompts using Inixa Proxy.</p>
                </div>
              </div>

              <div className="px-4 py-2 rounded-xl bg-black/40 border border-white/10 font-mono text-xs text-emerald-400 font-bold flex items-center gap-2 shrink-0">
                <Terminal className="w-4 h-4 text-emerald-400" />
                claude
              </div>
            </div>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Zap className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-white">Streaming Capabilities</h4>
            <p className="text-xs text-white/50 leading-relaxed">
              Supports real-time Server-Sent Events (SSE) streaming with zero latency lag during token generation.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Cpu className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-white">Multi-Model Engine</h4>
            <p className="text-xs text-white/50 leading-relaxed">
              Auto-routes requests to GPT-5.2, Qwen 3.7 Max, DeepSeek V3, and Gemini 2.5 Flash.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ExternalLink className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-white">Vercel & Local Ready</h4>
            <p className="text-xs text-white/50 leading-relaxed">
              Deploy to Vercel or run locally on port 3000 seamlessly with zero configuration changes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
