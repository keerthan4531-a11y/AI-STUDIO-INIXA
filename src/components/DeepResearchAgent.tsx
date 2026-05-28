"use client";
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Search, BookOpen, Loader2, Sparkles, FileText, CheckCircle2, RefreshCw, ChevronDown, ExternalLink, Download, Copy, Check } from 'lucide-react';
import { aiChat, aiWebSearch, aiWebScrape, type AIModel } from '../api/aiEngine';
import { MessageContent } from './MessageContent';

interface ResearchLog {
  time: string;
  msg: string;
  type: 'info' | 'success' | 'warn' | 'error';
}

interface ResearchSource {
  title: string;
  url: string;
  domain: string;
  favicon: string;
  status: 'searching' | 'found' | 'reading' | 'done' | 'failed';
}

interface DeepResearchProps {
  currentModel: AIModel;
  setShowModelSelector: (v: boolean) => void;
}

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
}
function getFavicon(url: string): string {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`; } catch { return ''; }
}

export function DeepResearchAgent({ currentModel, setShowModelSelector }: DeepResearchProps) {
  const [topic, setTopic] = useState('');
  const [status, setStatus] = useState<'idle' | 'planning' | 'searching' | 'scraping' | 'generating' | 'done'>('idle');
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<ResearchLog[]>([]);
  const [report, setReport] = useState('');
  const [sources, setSources] = useState<ResearchSource[]>([]);
  const [copied, setCopied] = useState(false);
  
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showEditBox, setShowEditBox] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (format: 'md' | 'txt' | 'html') => {
    let content = report;
    let mimeType = 'text/plain';

    if (format === 'html') {
      mimeType = 'text/html';
      // Simple Markdown to HTML conversion for export
      content = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${topic} - Deep Research</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.1/github-markdown-light.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
<style>
  body {
    box-sizing: border-box;
    min-width: 200px;
    max-width: 980px;
    margin: 0 auto;
    padding: 45px;
  }
  @media (max-width: 767px) {
    body { padding: 15px; }
  }
</style>
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
</head>
<body class="markdown-body">
  <div id="content">Loading report...</div>
  <script>
    // Configure marked to use highlight.js
    marked.setOptions({
      highlight: function(code, lang) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
      },
      langPrefix: 'hljs language-'
    });
    
    // Safely parse the markdown string
    const rawMarkdown = decodeURIComponent("${encodeURIComponent(report)}");
    document.getElementById('content').innerHTML = marked.parse(rawMarkdown);
  </script>
</body>
</html>`;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DeepResearch_Report_${topic.replace(/\s+/g, '_').substring(0, 30)}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const addLog = (msg: string, type: ResearchLog['type'] = 'info') => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg, type }]);
  };

  const addSource = (title: string, url: string, sourceStatus: ResearchSource['status'] = 'found') => {
    setSources(prev => {
      if (prev.find(s => s.url === url)) {
        return prev.map(s => s.url === url ? { ...s, status: sourceStatus } : s);
      }
      return [...prev, { title, url, domain: getDomain(url), favicon: getFavicon(url), status: sourceStatus }];
    });
  };
  const updateSourceStatus = (url: string, newStatus: ResearchSource['status']) => {
    setSources(prev => prev.map(s => s.url === url ? { ...s, status: newStatus } : s));
  };

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const startResearch = async () => {
    if (!topic.trim() || status !== 'idle') return;
    
    setStatus('planning');
    setProgress(5);
    setLogs([]);
    setReport('');
    setSources([]);
    
    addLog(`Initiating Deep Research on: "${topic}"`, 'info');
    
    try {
      // Step 1: Generate Queries
      addLog('Generating optimal search queries...', 'info');
      const queryPrompt = `Generate 3 distinct search queries to thoroughly research the following topic: "${topic}". Return ONLY the queries separated by newlines. No quotes, no numbers.`;
      const queriesRes = await aiChat([{ role: 'user', content: queryPrompt }]);
      const queries = queriesRes.split('\n').map(q => q.trim().replace(/^[-*0-9.]+\s*/, '')).filter(q => q.length > 5).slice(0, 3);
      
      addLog(`Generated ${queries.length} queries.`, 'success');
      setProgress(15);

      // Step 2: Search Web
      setStatus('searching');
      const allLinks = new Map<string, { title: string; url: string }>();
      
      for (const query of queries) {
        addLog(`Searching: ${query}`, 'info');
        const results = await aiWebSearch(query);
        results.forEach((r: any) => {
          if (!allLinks.has(r.link)) {
             allLinks.set(r.link, { title: r.title, url: r.link });
             addSource(r.title, r.link, 'found');
          }
        });
        setProgress(prev => prev + 5);
      }
      
      const targetLinks = Array.from(allLinks.values()).slice(0, 10);
      addLog(`Found ${targetLinks.length} unique sources to analyze.`, 'success');
      
      // Step 3: Scrape Content
      setStatus('scraping');
      let successCount = 0;
      
      const scrapePromises = targetLinks.map(async (link) => {
        updateSourceStatus(link.url, 'reading');
        addLog(`Reading: ${link.title.substring(0, 40)}...`, 'info');
        const text = await aiWebScrape(link.url);
        if (text && text.length > 200) {
          successCount++;
          updateSourceStatus(link.url, 'done');
          addLog(`Extracted ${(text.length / 1024).toFixed(1)}KB from ${getDomain(link.url)}`, 'success');
          return `\n\n--- Source: ${link.url} ---\n${text.substring(0, 8000)}`;
        } else {
          updateSourceStatus(link.url, 'failed');
          addLog(`Failed to read content from ${getDomain(link.url)}`, 'warn');
          return '';
        }
      });
      
      const scrapedResults = await Promise.all(scrapePromises);
      const scrapedData = scrapedResults.join('\n');
      
      setProgress(75);
      addLog(`Successfully analyzed ${successCount} sources. Total data extracted: ${(scrapedData.length / 1024).toFixed(1)}KB`, 'success');
      
      if (successCount === 0) {
         addLog('Failed to extract sufficient data. Aborting generation.', 'error');
         setStatus('idle');
         return;
      }

      // Step 4: Generate Report
      setStatus('generating');
      setProgress(85);
      addLog('Synthesizing data and generating comprehensive report...', 'info');
      
      const reportPrompt = `You are an elite research analyst. I have compiled raw data from multiple websites regarding the topic: "${topic}".
      
Please write a highly detailed, comprehensive, and well-structured Markdown research paper based on the data below.
Use academic formatting, clear headings, bullet points, and cite your sources using the URLs provided.
CRITICAL: Ensure the entire report is complete. DO NOT stop abruptly. If necessary, be concise, but you must complete the document and properly close all formatting.

RAW EXTRACTED DATA:
${scrapedData.substring(0, 60000)}

Topic to focus on: ${topic}`;

      const finalReport = await aiChat(
        [{ role: 'user', content: reportPrompt }],
        (chunk) => setReport(chunk)
      );
      
      setReport(finalReport);
      setStatus('done');
      setProgress(100);
      addLog('Research Complete!', 'success');
      
    } catch (e: any) {
      addLog(`Error during research: ${e.message}`, 'error');
      setStatus('idle');
    }
  };

  const handleEditReport = async () => {
    if (!editPrompt.trim() || isEditing) return;
    setIsEditing(true);
    addLog(`AI Editing Report: "${editPrompt}"`, 'info');
    try {
      const prompt = `You are an elite research analyst. I have an existing research report on the topic: "${topic}".
The user has requested the following edits: "${editPrompt}"

EXISTING REPORT:
${report}

Please rewrite the report incorporating the user's edits. Keep it highly detailed and well-structured in Markdown.
CRITICAL: Ensure the entire report is complete. DO NOT stop abruptly. If necessary, be concise, but you must complete the final sections. Do not cut off halfway!`;
      
      const updatedReport = await aiChat(
        [{ role: 'user', content: prompt }],
        (chunk) => setReport(chunk)
      );
      setReport(updatedReport);
      setEditPrompt('');
      setShowEditBox(false);
      addLog('Report successfully updated!', 'success');
    } catch (e: any) {
      addLog(`Edit failed: ${e.message}`, 'error');
      alert('Failed to edit report.');
    } finally {
      setIsEditing(false);
    }
  };

  const getStatusColor = (type: ResearchLog['type']) => {
    switch (type) {
      case 'info': return 'text-blue-400';
      case 'success': return 'text-emerald-400';
      case 'warn': return 'text-amber-400';
      case 'error': return 'text-rose-400';
      default: return 'text-white/60';
    }
  };

  const getSourceStatusIcon = (s: ResearchSource['status']) => {
    switch (s) {
      case 'searching': return <Loader2 className="w-3 h-3 animate-spin text-blue-400" />;
      case 'found': return <Globe className="w-3 h-3 text-white/40" />;
      case 'reading': return <Loader2 className="w-3 h-3 animate-spin text-amber-400" />;
      case 'done': return <CheckCircle2 className="w-3 h-3 text-emerald-400" />;
      case 'failed': return <span className="w-3 h-3 rounded-full bg-rose-500/30 block" />;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-4 sm:p-6 gap-4 sm:gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-lg shadow-indigo-500/5">
            <Globe className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight font-['Plus_Jakarta_Sans']">Deep Research Agent</h1>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mt-1">Autonomous multi-source web intelligence</p>
          </div>
        </div>
      </div>

      {status === 'idle' && !report && (
        <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full gap-6">
          <div className="w-20 h-20 rounded-3xl bg-blue-500/10 flex items-center justify-center animate-pulse">
            <Search className="w-10 h-10 text-blue-400" />
          </div>
          <h2 className="text-4xl font-['Playfair_Display'] font-medium text-white/90 text-center tracking-tight">What would you like to research?</h2>
          <div className="w-full relative apple-glass-card rounded-2xl overflow-hidden p-2 transition-all duration-300 focus-within:border-white/20 focus-within:shadow-[0_8px_30px_rgba(99,102,241,0.1)] group">
            <textarea
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. The impact of solid-state batteries on the EV market by 2030..."
              className="w-full bg-transparent border-none outline-none text-white p-4 resize-none min-h-[120px] placeholder:text-white/20 font-['DM_Sans'] text-lg"
            />
            <div className="flex items-center justify-between p-2 pointer-events-auto">
              <button 
                onClick={() => setShowModelSelector(true)} 
                className="flex items-center gap-1 px-3 py-1.5 rounded-full hover:bg-white/5 text-[11px] font-bold text-white/50 hover:text-white transition-all border border-transparent hover:border-white/5"
              >
                <span>{currentModel.label}</span>
                <ChevronDown className="w-3 h-3 opacity-50" />
              </button>
              
              <button 
                onClick={startResearch}
                disabled={!topic.trim()}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg"
              >
                <Sparkles className="w-4 h-4" /> Start Research
              </button>
            </div>
          </div>
        </div>
      )}

      {status !== 'idle' && (
        <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-y-auto lg:overflow-hidden pb-safe">
          
          {/* Left: Sources Panel + Logs */}
          <div className="flex flex-col gap-4 w-full lg:w-[320px] shrink-0 lg:overflow-hidden">
            {/* Sources Panel */}
            {sources.length > 0 && (
              <div className="apple-glass-card rounded-3xl border border-white/10 flex flex-col overflow-hidden max-h-[50%] shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
                <div className="px-5 py-4 border-b border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50 flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-blue-400" />
                    Sources Found
                  </span>
                  <span className="text-[11px] font-bold text-white/30">{sources.length} sites</span>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04] hide-scrollbar">
                  {sources.map((src, i) => (
                    <motion.a
                      key={i}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors group"
                    >
                      <div className="w-6 h-6 bg-white/5 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                        <img src={src.favicon} alt="" className="w-4 h-4" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-[12px] font-medium text-white/80 truncate group-hover:text-blue-400 transition-colors">{src.title}</p>
                        <p className="text-[10px] text-white/30 truncate">{src.domain}</p>
                      </div>
                      <div className="shrink-0">
                        {getSourceStatusIcon(src.status)}
                      </div>
                    </motion.a>
                  ))}
                </div>
              </div>
            )}

            {/* Terminal / Logs Panel */}
            <div className="h-[250px] shrink-0 lg:h-auto lg:flex-1 apple-glass-card rounded-3xl border border-white/10 flex flex-col overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
              <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50 flex items-center gap-2">
                  <Loader2 className={`w-3.5 h-3.5 ${status !== 'done' ? 'animate-spin text-indigo-400' : 'text-emerald-400 hidden'}`} />
                  {status !== 'done' ? 'Agent Active' : 'Task Complete'}
                </span>
                <span className="text-[11px] font-bold text-white/30">{progress}%</span>
              </div>
              {/* Progress Bar */}
              <div className="w-full h-1 bg-black/40">
                <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed hide-scrollbar space-y-2">
                {logs.map((log, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex gap-3">
                    <span className="text-white/20 shrink-0">[{log.time}]</span>
                    <span className={getStatusColor(log.type)}>{log.msg}</span>
                  </motion.div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
          </div>

          {/* Right: Report Panel */}
          <div className="min-h-[500px] shrink-0 lg:min-h-0 lg:flex-1 apple-glass-card rounded-3xl border border-white/10 flex flex-col overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
            <div className="px-6 py-5 border-b border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-indigo-400" />
                <span className="font-bold text-white/90 hidden sm:inline">Research Paper</span>
              </div>
              {status === 'done' && (
                <div className="flex items-center gap-2">
                  <button onClick={handleCopy} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/70 hover:text-white" title="Copy to clipboard">
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <div className="hidden sm:flex items-center gap-1 bg-white/5 p-1 rounded-xl">
                    <button onClick={() => handleDownload('md')} className="px-3 py-1.5 text-[10px] font-bold text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                      .MD
                    </button>
                    <button onClick={() => handleDownload('txt')} className="px-3 py-1.5 text-[10px] font-bold text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                      .TXT
                    </button>
                    <button onClick={() => handleDownload('html')} className="px-3 py-1.5 text-[10px] font-bold text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                      .HTML
                    </button>
                  </div>
                  <button onClick={() => handleDownload('md')} className="sm:hidden p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/70 hover:text-white" title="Download">
                    <Download className="w-4 h-4" />
                  </button>
                  
                  <button 
                    onClick={() => setShowEditBox(!showEditBox)} 
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${showEditBox ? 'bg-indigo-600 text-white' : 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30'}`}
                  >
                    <Sparkles className="w-3 h-3" /> <span className="hidden sm:inline">Edit</span>
                  </button>
                  
                  <div className="w-px h-6 bg-white/10 mx-1" />
                  
                  <button onClick={() => { setStatus('idle'); setTopic(''); setReport(''); setSources([]); }} className="px-3 py-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2">
                    <RefreshCw className="w-3 h-3" /> <span className="hidden sm:inline">New Research</span>
                  </button>
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 lg:p-10 hide-scrollbar user-message-markdown">
              {report ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <MessageContent content={report} isCodex={false} />
                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-white/20 space-y-4">
                  <BookOpen className="w-16 h-16 opacity-20" />
                  <p className="text-sm font-medium">Waiting for data synthesis...</p>
                </div>
              )}
            </div>

            {/* AI Edit Box */}
            <AnimatePresence>
              {showEditBox && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: 20 }}
                  className="p-4 border-t border-white/10 bg-black/40 backdrop-blur-md"
                >
                  <div className="flex items-center gap-2 max-w-3xl mx-auto relative">
                    <input 
                      type="text" 
                      value={editPrompt}
                      onChange={e => setEditPrompt(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleEditReport()}
                      disabled={isEditing}
                      placeholder="e.g. Make the introduction shorter, or add a section about cost..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-indigo-500/50 transition-all"
                    />
                    <button 
                      onClick={handleEditReport}
                      disabled={!editPrompt.trim() || isEditing}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-3 rounded-xl transition-all font-bold text-sm flex items-center gap-2 shadow-lg"
                    >
                      {isEditing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      <span className="hidden sm:inline">Apply</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
