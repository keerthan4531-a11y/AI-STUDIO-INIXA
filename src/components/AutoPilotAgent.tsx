import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Send, Search, Loader2, Sparkles, CheckCircle2, AlertCircle, Globe, MousePointer2, Keyboard, MonitorPlay, ArrowRight, ArrowLeft, ArrowRight as ArrowRightIcon, RotateCcw, Lock, LayoutGrid } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { vibrate } from '../utils/helpers';

interface LogEntry {
  type: 'status' | 'step' | 'completed' | 'error';
  text: string;
  data?: any;
  timestamp: string;
}

export default function AutoPilotAgent() {
  const [prompt, setPrompt] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [finalResult, setFinalResult] = useState<string | null>(null);
  
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    vibrate(20);
    setIsGenerating(true);
    setLogs([{ type: 'status', text: 'Connecting to Inixa Web Auto-Pilot...', timestamp: new Date().toISOString() }]);
    setFinalResult(null);

    try {
      const response = await fetch('/api/auto-pilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.body) throw new Error('ReadableStream not supported.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const events = chunk.split('\n\n');
          
          for (const event of events) {
            if (!event.trim()) continue;
            
            // Basic SSE parsing
            const lines = event.split('\n');
            let eventType = 'message';
            let dataStr = '';
            
            for (const line of lines) {
              if (line.startsWith('event: ')) {
                eventType = line.substring(7);
              } else if (line.startsWith('data: ')) {
                dataStr = line.substring(6);
              }
            }
            
            if (dataStr) {
              try {
                const data = JSON.parse(dataStr);
                
                if (eventType === 'status') {
                  setLogs(prev => [...prev, { type: 'status', text: data.message, timestamp: new Date().toISOString() }]);
                } else if (eventType === 'step') {
                  setLogs(prev => [...prev, { type: 'step', text: data.text, data: data.data, timestamp: data.timestamp }]);
                } else if (eventType === 'completed') {
                  setLogs(prev => [...prev, { type: 'completed', text: 'Task execution completed.', timestamp: new Date().toISOString() }]);
                  setFinalResult(data.result);
                  setIsGenerating(false);
                } else if (eventType === 'error') {
                  setLogs(prev => [...prev, { type: 'error', text: data.message, timestamp: new Date().toISOString() }]);
                  setIsGenerating(false);
                }
              } catch (err) {
                console.error("Failed to parse event data", err);
              }
            }
          }
        }
      }
    } catch (error: any) {
      setLogs(prev => [...prev, { type: 'error', text: error.message, timestamp: new Date().toISOString() }]);
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#030712] p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Globe className="w-6 h-6 text-cyan-400" />
            Web Auto-Pilot <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">BETA</span>
          </h1>
          <p className="text-white/40 text-sm mt-1">Delegates web tasks to an autonomous computer-use agent in a virtual browser.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        
        {/* Left Column: Input and Terminal */}
        <div className="flex flex-col gap-6 flex-1 w-full lg:w-1/2 min-h-0">
          <GlassCard className="p-4 border-white/5 bg-white/[0.02]">
            <form onSubmit={handleSubmit} className="relative">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Find the top 3 AI news articles today and summarize them..."
                className="w-full bg-[#08090f] text-white rounded-xl pl-12 pr-16 py-4 outline-none border border-white/10 focus:border-cyan-500/50 transition-all font-mono text-sm"
                disabled={isGenerating}
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <button
                type="submit"
                disabled={!prompt.trim() || isGenerating}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 rounded-lg transition-colors disabled:opacity-50 disabled:hover:bg-cyan-500/20"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </GlassCard>

          {/* Terminal / Live Logs */}
          <GlassCard className="flex flex-col flex-1 border-white/5 bg-[#0a0a0a] overflow-hidden min-h-0">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-black/40">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono text-white/50 uppercase tracking-wider">Agent Action Log</span>
              {isGenerating && (
                <div className="ml-auto flex items-center gap-2 text-cyan-400 text-[10px] uppercase font-bold tracking-widest animate-pulse">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  Executing
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs md:text-sm space-y-3 hide-scrollbar">
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-white/20 italic">
                  Awaiting instructions...
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {logs.map((log, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start gap-3"
                    >
                      <span className="text-white/30 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                      <span className={`
                        ${log.type === 'status' ? 'text-cyan-400/80' : ''}
                        ${log.type === 'step' ? 'text-green-400' : ''}
                        ${log.type === 'completed' ? 'text-indigo-400 font-bold' : ''}
                        ${log.type === 'error' ? 'text-red-400 font-bold' : ''}
                      `}>
                        {log.text}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
              <div ref={logsEndRef} />
            </div>
          </GlassCard>
        </div>

        {/* Right Column: Results */}
        <div className="flex flex-col flex-1 w-full lg:w-1/2 min-h-0">
          <GlassCard className="flex flex-col h-full border-white/5 bg-white/[0.02] p-6 overflow-y-auto hide-scrollbar">
            <div className="flex items-center gap-2 mb-6 text-white/40 border-b border-white/10 pb-4">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-bold">Execution Result</h2>
            </div>

            {finalResult ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="prose prose-invert max-w-none"
              >
                <div className="whitespace-pre-wrap text-white/80 leading-relaxed">
                  {finalResult}
                </div>
              </motion.div>
            ) : isGenerating ? (
              <div className="h-full flex flex-col gap-4">
                {/* Mock Chrome Browser */}
                <div className="flex-1 border border-white/10 rounded-xl bg-black/60 overflow-hidden flex flex-col shadow-2xl relative">
                  {/* Browser Chrome/Header */}
                  <div className="h-12 bg-[#1a1b26] border-b border-white/5 flex items-center px-4 gap-4 shrink-0 relative z-20">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="w-3 h-3 rounded-full bg-red-500/80" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                      <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    </div>
                    
                    <div className="flex items-center gap-3 text-white/40 shrink-0">
                      <ArrowLeft className="w-4 h-4 hover:text-white transition-colors cursor-pointer" />
                      <ArrowRightIcon className="w-4 h-4 hover:text-white transition-colors cursor-pointer" />
                      <RotateCcw className="w-4 h-4 hover:text-white transition-colors cursor-pointer" />
                    </div>
                    
                    {/* URL Bar */}
                    <div className="flex-1 h-7 bg-black/40 border border-white/5 rounded-md flex items-center px-3 gap-2 overflow-hidden">
                      <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="text-xs font-mono text-white/70 truncate">
                        {(() => {
                          const navLog = [...logs].reverse().find(l => l.text.toLowerCase().includes('navigate'));
                          if (navLog) {
                            return navLog.text.split('to:')[1]?.trim() || navLog.text;
                          }
                          return "https://inixa.ai/virtual-browser";
                        })()}
                      </span>
                    </div>

                    <LayoutGrid className="w-4 h-4 text-white/40 hover:text-white transition-colors cursor-pointer shrink-0" />
                  </div>
                  
                  {/* Browser Content Area */}
                  <div className="flex-1 relative bg-[#0a0a0f] overflow-hidden flex flex-col items-center justify-center p-6">
                    {/* Scanning Animation Background */}
                    <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px]" />
                    <motion.div 
                      animate={{ y: ["-100%", "100%"] }} 
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 w-full h-[20%] bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent" 
                    />

                    {/* Visual Action Feed Overlay */}
                    <div className="relative z-10 w-full max-w-lg bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col gap-3 shadow-2xl">
                       <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5 text-white/50 text-xs font-bold uppercase tracking-wider">
                          <MonitorPlay className="w-4 h-4 text-cyan-400" />
                          Agent Vision Active
                       </div>
                       
                       <AnimatePresence initial={false}>
                          {logs.filter(l => l.type === 'step').slice(-4).map((log, i) => {
                            const actionText = log.text.toLowerCase();
                            let Icon = ArrowRight;
                            let color = "text-white/50";
                            
                            if (actionText.includes('click')) { Icon = MousePointer2; color = "text-blue-400"; }
                            else if (actionText.includes('typ') || actionText.includes('key')) { Icon = Keyboard; color = "text-emerald-400"; }
                            else if (actionText.includes('scroll')) { Icon = MousePointer2; color = "text-purple-400"; }
                            else if (actionText.includes('navigat') || actionText.includes('go ') || actionText.includes('load')) { Icon = Globe; color = "text-cyan-400"; }
                            else if (actionText.includes('screenshot') || actionText.includes('analyz')) { Icon = MonitorPlay; color = "text-pink-400"; }

                            return (
                              <motion.div
                                key={`${log.timestamp}-${i}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, position: 'absolute' }}
                                className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/5"
                              >
                                <div className={`p-2 rounded-lg bg-black/50 ${color}`}>
                                  <Icon className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-medium text-white/80 line-clamp-2">
                                  {log.text}
                                </span>
                              </motion.div>
                            );
                          })}
                       </AnimatePresence>
                       {logs.filter(l => l.type === 'step').length === 0 && (
                         <div className="py-8 flex items-center justify-center text-white/20 italic text-sm">
                           Awaiting first browser action...
                         </div>
                       )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-white/20 gap-3">
                <CheckCircle2 className="w-10 h-10 text-white/10" />
                <p>Task results will appear here</p>
              </div>
            )}
          </GlassCard>
        </div>

      </div>
    </div>
  );
}
