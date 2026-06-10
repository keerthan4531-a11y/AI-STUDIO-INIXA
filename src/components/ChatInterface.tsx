"use client";
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ArrowDown, Plus, X, Copy, Check, RefreshCw, Paintbrush, Brain, Code, Sparkles, Coffee, FileText, Image as ImageIcon, Wand2, Settings, BookOpen, TrendingUp } from 'lucide-react';
import { cn } from './GlassCard';
import { InixaLogo } from './Logos';
import { MessageContent } from './MessageContent';
import { TypingCursor } from './StreamingText';
import { DeepThinkPanel, DeepThinkToggle, isDeepThinkModel } from './DeepThinkPanel';
import { WebSearchPanel, WebSearchToggle, type SearchSource } from './WebSearchPanel';
import { extractTextFromDoc, chunkText, findRelevantChunks } from '../utils/docReader';
import { ContextMenu, getMessageContextItems, useContextMenu } from './ContextMenu';
import { vibrate } from '../utils/helpers';
import { aiChat, aiWebSearch, type AIModel } from '../api/aiEngine';
import { ArtifactsPreview } from './ArtifactsPreview';
import { CodeSandbox } from './CodeSandbox';
import { DataChartAgent } from './DataChartAgent';
import { StudentToolkit, TOOLKIT_ITEMS } from './StudentToolkit';
import { BoltStyleChatInput } from './ui/bolt-style-chat';
import { LoadingBreadcrumb } from './ui/animated-loading-svg-text-shimmer';

interface ChatInterfaceProps {
  isCodex?: boolean;
  isPdfMode?: boolean;
  sessionId?: string | null;
  onUpdateSessionTitle?: (title: string) => void;
  userName?: string;
  currentModel: AIModel;
  setShowModelSelector: (v: boolean) => void;
}

// Read file content as text for AI context
async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (result.startsWith('data:image')) { resolve(result); return; }
      if (result.startsWith('data:')) {
        try { resolve(atob(result.split(',')[1])); } catch { resolve(result); }
        return;
      }
      resolve(result);
    };
    if (file.type.startsWith('image/')) reader.readAsDataURL(file);
    else reader.readAsText(file);
  });
}

const downscaleImage = (dataUrl: string, maxWidth = 800): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width; let h = img.height;
      if (w > maxWidth) { h = Math.round((h * maxWidth) / w); w = maxWidth; }
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = dataUrl;
  });
};

const getTextContent = (content: any): string => {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n');
  return '';
};

export function ChatInterface({ isCodex, isPdfMode, sessionId, onUpdateSessionTitle, userName, currentModel, setShowModelSelector }: ChatInterfaceProps) {
  const storageKey = sessionId 
    ? (isCodex ? `inixa_codex_${sessionId}` : `inixa_chat_${sessionId}`) 
    : (isCodex ? 'inixa_codex_messages' : 'inixa_chat_messages');
    
  const defaultMsg = { role: 'assistant', content: isPdfMode ? 'Upload a PDF to analyze it.' : 'How can I help you today?' };

  const [messages, setMessages] = useState<{ role: string; content: any; thinking?: string; sources?: SearchSource[] }[]>(() => {
    try { const s = localStorage.getItem(storageKey); if (s) { const p = JSON.parse(s); if (Array.isArray(p) && p.length > 0) return p; } } catch {}
    return [defaultMsg];
  });

  // Sync messages when session ID changes (for new chat -> saved chat transition)
  useEffect(() => {
    try {
      const s = localStorage.getItem(storageKey);
      if (s) {
        const p = JSON.parse(s);
        if (Array.isArray(p) && p.length > 0) {
          setMessages(p);
          return;
        }
      }
    } catch {}
    setMessages([defaultMsg]);
  }, [sessionId, isCodex, isPdfMode]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<{ file: File; preview?: string; textContent?: string }[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [deepThinkEnabled, setDeepThinkEnabled] = useState(false);
  const [thinkingContent, setThinkingContent] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const searchModels = ['poll-search-gpt', 'gemini-search', 'poll-perplexity-reasoning'];
  const [webSearchEnabled, setWebSearchEnabled] = useState(searchModels.includes(currentModel.id));
  const [isSearching, setIsSearching] = useState(false);
  const [searchSources, setSearchSources] = useState<SearchSource[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeArtifact, setActiveArtifact] = useState<{ type: string; data: string; title?: string } | null>(null);
  const [isArtifactExpanded, setIsArtifactExpanded] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { contextMenu, showMenu, hideMenu } = useContextMenu();

  const [pdfChunks, setPdfChunks] = useState<string[]>([]);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [suggestedFollowups, setSuggestedFollowups] = useState<string[]>([]);
  const [isEnhancing, setIsEnhancing] = useState(false);

  useEffect(() => {
    setWebSearchEnabled(searchModels.includes(currentModel.id));
  }, [currentModel.id]);

  // Handle file selection - images, PDFs, code files, text
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    vibrate(20);
    const newFiles: typeof selectedFiles = [];
    for (const file of files) {
      const entry: typeof selectedFiles[0] = { file };
      const extension = file.name.split('.').pop()?.toLowerCase();

      if (file.type.startsWith('image/')) {
        const rawData = await new Promise<string>(r => { const rd = new FileReader(); rd.onloadend = () => r(rd.result as string); rd.readAsDataURL(file); });
        entry.preview = await downscaleImage(rawData, 800);
      }
      
      // Document processing (PDF, Word, Text)
      if (!file.type.startsWith('image/')) {
        const isDoc = ['pdf', 'docx'].includes(extension || '');
        if (isDoc) {
           setIsProcessingPdf(true); // Re-use processing state for docs
           try {
              const text = await extractTextFromDoc(file);
              if (text === "[SCANNED_OR_EMPTY]") {
                 entry.textContent = `[Warning: ${file.name} appears to be a scanned image or empty. No text could be extracted for AI analysis.]`;
              } else {
                 const chunks = chunkText(text, 1200, 200);
                 setPdfChunks(prev => [...prev, ...chunks]);
                 entry.textContent = `[${extension?.toUpperCase()} Document Loaded: ${file.name} (${chunks.length} text chunks extracted for intelligent search)]`;
              }
           } catch(e: any) {
              console.error("Doc Error", e);
              entry.textContent = `[Error parsing ${extension?.toUpperCase()}: ${file.name}]`;
           }
           setIsProcessingPdf(false);
        } else {
           try { entry.textContent = await readFileAsText(file); } catch {}
        }
      }
      newFiles.push(entry);
    }
    setSelectedFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (idx: number) => { setSelectedFiles(prev => prev.filter((_, i) => i !== idx)); };

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(messages));
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 80);
  }, [messages, loading, storageKey, streamingText, isStreaming]);

  // Simulate streaming
  const simulateStreaming = async (fullText: string, thinkText?: string) => {
    if (thinkText) {
      setIsThinking(true); setThinkingContent('');
      for (let i = 0; i < thinkText.length; i += Math.floor(Math.random() * 4) + 2) {
        setThinkingContent(thinkText.slice(0, i + 2));
        await new Promise(r => setTimeout(r, 8));
      }
      setThinkingContent(thinkText); setIsThinking(false);
    }
    setIsStreaming(true); setStreamingText('');
    for (let i = 0; i < fullText.length; i += Math.floor(Math.random() * 4) + 2) {
      setStreamingText(fullText.slice(0, i + 2));
      await new Promise(r => setTimeout(r, 10));
    }
    setStreamingText(''); setIsStreaming(false);
    return fullText;
  };

  // Web search Grok-style
  const performWebSearch = async (query: string) => {
    setIsSearching(true); setSearchSources([]); setSearchQuery(query);
    try {
      const results = await aiWebSearch(query);
      if (results?.length) {
        // Stagger the presentation of results for Grok animation
        for (let i = 0; i < results.length; i++) {
          await new Promise(r => setTimeout(r, 400));
          setSearchSources(prev => [...prev, { title: results[i].title, link: results[i].link, snippet: results[i].snippet, status: 'found' }]);
        }
        await new Promise(r => setTimeout(r, 500));
        const finalSources = results.map(r => ({ title: r.title, link: r.link, snippet: r.snippet, status: 'done' as const }));
        setSearchSources(finalSources);
        const ctx = "Web Search Results:\n" + results.map((r, i) => `[${i+1}] ${r.title} (${r.link})\n${r.snippet || ''}`).join('\n') + "\n\nUsing the above search results, provide a comprehensive answer with inline citations like [1], [2]. Question: " + query;
        return { ctx, sources: finalSources };
      }
    } catch (e) { console.error("Search Error:", e); }
    return null;
  };

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text && !selectedFiles.length) return;
    if (loading) return;
    vibrate();

    if (messages.length === 1 && onUpdateSessionTitle) {
      const generatedTitle = text.slice(0, 30) + (text.length > 30 ? '...' : '');
      onUpdateSessionTitle(generatedTitle);
    }

    // Build content with files (Claude-style)
    let content: any = text;
    const hasImages = selectedFiles.some(f => f.file.type.startsWith('image/'));
    const hasTextFiles = selectedFiles.some(f => f.textContent);

    if (hasImages) {
      const parts: any[] = [];
      if (hasTextFiles) {
        const fileContext = selectedFiles.filter(f => f.textContent).map(f => `--- File: ${f.file.name} ---\n${f.textContent!.slice(0, 10000)}`).join('\n\n');
        parts.push({ type: "text", text: (text || "Analyze this") + "\n\n" + fileContext });
      } else {
        parts.push({ type: "text", text: text || "What is in this image?" });
      }
      for (const f of selectedFiles.filter(f => f.preview)) {
        parts.push({ type: "image_url", image_url: { url: f.preview } });
      }
      content = parts;
    } else if (hasTextFiles) {
      const normalFiles = selectedFiles.filter(f => f.textContent && !f.textContent.includes('[PDF Document Loaded'));
      const fileContext = normalFiles.map(f => `--- File: ${f.file.name} ---\n${f.textContent!.slice(0, 15000)}`).join('\n\n');
      const pdfFiles = selectedFiles.filter(f => f.textContent?.includes('[PDF Document Loaded'));
      const pdfContext = pdfFiles.map(f => `[Attached Document: ${f.file.name}]`).join('\n');
      
      content = (text || (pdfFiles.length > 0 ? "Please provide a comprehensive summary of this document." : "Analyze these files")) + 
                (fileContext ? "\n\n" + fileContext : "") + 
                (pdfContext ? "\n\n" + pdfContext : "");
    }

    const userMsg = { role: 'user', content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setSelectedFiles([]);
    setLoading(true);
    setThinkingContent('');
    setStreamingText('');
    setSearchSources([]);
    setSuggestedFollowups([]);

    try {
      let finalQuery = text;
      let localSearchSources: any[] = [];
      if (webSearchEnabled) {
        const result = await performWebSearch(text);
        if (result) {
          finalQuery = result.ctx;
          localSearchSources = result.sources;
        }
      }
      setIsSearching(false);

      if (deepThinkEnabled && isDeepThinkModel(currentModel.id)) {
        finalQuery = "Please think step-by-step and wrap your thoughts in <think> tags. Then answer: " + finalQuery;
      }

      let msgsForAI = [...newMessages];

      if (finalQuery !== text) {
        const lastMsg = msgsForAI[msgsForAI.length - 1];
        if (typeof lastMsg.content === 'string') {
          msgsForAI[msgsForAI.length - 1] = { ...lastMsg, content: finalQuery };
        } else if (Array.isArray(lastMsg.content)) {
          // If it's an array (images + text), replace the text part with finalQuery
          const newContent = lastMsg.content.map((c: any) => c.type === 'text' ? { ...c, text: finalQuery } : c);
          msgsForAI[msgsForAI.length - 1] = { ...lastMsg, content: newContent };
        }
      }

      if (pdfChunks.length > 0) {
        setIsSearching(true);
        const queryToSearch = text || "Please provide a comprehensive summary of this document.";
        const relevantChunks = findRelevantChunks(queryToSearch, pdfChunks, 4);
        
        const ragContext = "=== EXTRACTED DOCUMENT TEXT ===\n" + relevantChunks.join('\n\n...\n\n') + "\n================================\nUse the above document context to accurately answer the query.";
        
        const lastMsg = msgsForAI[msgsForAI.length - 1];
        if (typeof lastMsg.content === 'string') {
           msgsForAI[msgsForAI.length - 1] = { ...lastMsg, content: lastMsg.content + "\n\n" + ragContext };
        } else {
           msgsForAI[msgsForAI.length - 1] = { ...lastMsg, content: [...(lastMsg.content as any[]), { type: "text", text: "\n\n" + ragContext }] };
        }
        setIsSearching(false);
      }

      let thinkContent = '';
      let answerContent = '';

      let receivedSources: string[] = [];

      const result = await aiChat(msgsForAI, (chunk, citations) => {
         if (citations && citations.length > 0) {
            receivedSources = citations;
            // Map to SearchSource format
            const mappedSources: SearchSource[] = citations.map((url, i) => {
               try {
                  const domain = new URL(url).hostname.replace('www.', '');
                  return { title: domain, link: url, snippet: '', status: 'done' };
               } catch {
                  return { title: `Source ${i+1}`, link: url, snippet: '', status: 'done' };
               }
            });
            setSearchSources(mappedSources);
            
            // Also append to the last message real-time
            setMessages(prev => {
               const newMsgs = [...prev];
               newMsgs[newMsgs.length - 1] = {
                  ...newMsgs[newMsgs.length - 1],
                  sources: mappedSources
               };
               return newMsgs;
            });
         }

         setIsStreaming(true);
         const thinkMatch = chunk.match(/<think>([\s\S]*?)(?:<\/think>|$)/);
         if (thinkMatch) {
            thinkContent = thinkMatch[1].trim();
            setIsThinking(true);
            setThinkingContent(thinkContent);
            const split = chunk.split('</think>');
            if (split.length > 1) {
               answerContent = split[1].trimStart();
               setIsThinking(false);
            } else {
               answerContent = '';
            }
         } else if (chunk.includes('</think>')) {
            const split = chunk.split('</think>');
            answerContent = split[1].trimStart();
            setIsThinking(false);
         } else {
            answerContent = chunk;
         }
         
         setStreamingText(answerContent);
      });
      
      setIsStreaming(false);
      setIsThinking(false);
      
      setMessages([...newMessages, { 
         role: 'assistant', 
         content: result.replace(/<think>[\s\S]*?<\/think>/g, '').trim(), 
         ...(thinkContent ? { thinking: thinkContent } : {}),
         ...(localSearchSources.length > 0 ? { sources: localSearchSources } : {}) 
      }]);

      // Generate follow-up suggestions from the AI response
      const cleanedResult = (result || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      if (cleanedResult.length > 50) {
        const words = text.split(/\s+/).slice(0, 5).join(' ');
        const followups: string[] = [];
        if (cleanedResult.length > 200) followups.push('Explain this in more detail');
        if (cleanedResult.includes('```')) followups.push('Explain this code');
        if (!cleanedResult.includes('```')) followups.push('Give me an example');
        followups.push('Tell me more');
        setSuggestedFollowups(followups.slice(0, 3));
      }
    } catch {
      if (messages.length === 1 && onUpdateSessionTitle) {
         const generatedTitle = text.slice(0, 30) + (text.length > 30 ? '...' : '');
         onUpdateSessionTitle(generatedTitle);
      }

      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }]);
    }
    setLoading(false);
  };

  const copyToClipboard = (t: string, i: number) => {
    navigator.clipboard.writeText(t).then(() => { setCopiedIdx(i); vibrate(15); setTimeout(() => setCopiedIdx(null), 2000); });
  };
  const deleteMessage = (idx: number) => { vibrate(30); setMessages(prev => prev.filter((_, i) => i !== idx)); };
  const regenerateMessage = async (idx: number) => {
    vibrate(30);
    const msgsUpTo = messages.slice(0, idx);
    setMessages(msgsUpTo); setLoading(true); setIsStreaming(false); setStreamingText(''); setThinkingContent('');
    let answerContent = '';
    try { 
      const r = await aiChat(msgsUpTo, (chunk, citations) => {
        if (citations && citations.length > 0) {
          const mappedSources: SearchSource[] = citations.map((url, i) => {
             try {
                const domain = new URL(url).hostname.replace('www.', '');
                return { title: domain, link: url, snippet: '', status: 'done' };
             } catch {
                return { title: `Source ${i+1}`, link: url, snippet: '', status: 'done' };
             }
          });
          setSearchSources(mappedSources);
          setMessages(prev => {
             const newMsgs = [...prev];
             newMsgs[newMsgs.length - 1] = {
                ...newMsgs[newMsgs.length - 1],
                sources: mappedSources
             };
             return newMsgs;
          });
        }
        setIsStreaming(true);
         answerContent = chunk.replace(/<think>[\s\S]*?<\/think>/g, '').trimStart();
         setStreamingText(answerContent);
      }); 
      setIsStreaming(false);
      setMessages([...msgsUpTo, { role: 'assistant', content: r.replace(/<think>[\s\S]*?<\/think>/g, '').trim() }]); 
    }
    catch { setMessages([...msgsUpTo, { role: 'assistant', content: 'Failed. Try again.' }]); }
    setLoading(false);
  };

  const showDeepThink = isDeepThinkModel(currentModel.id);
  const isLanding = messages.length === 1;
  const isPdfActive = isPdfMode || pdfChunks.length > 0;

  return (
    <div className="flex w-full h-full overflow-hidden relative">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={cn("flex flex-col h-full overflow-hidden relative transition-all duration-300", activeArtifact ? (isArtifactExpanded ? "w-0 hidden lg:hidden" : "w-full lg:w-1/2 border-r border-white/10 hidden lg:flex") : "flex-1")}>
        {/* Messages */}
        {/* Header (Optional styling for PDF mode) */}
        {isPdfActive && (
           <div className="absolute top-0 left-0 right-0 p-3 bg-indigo-900/20 border-b border-indigo-500/20 backdrop-blur-md z-10 flex items-center justify-center gap-2 text-indigo-300">
              <FileText className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Document Analysis Mode (RAG Enabled)</span>
           </div>
        )}
      {/* Background decoration for PDF Mode */}
      {isPdfMode && (
        <div className="fixed inset-0 pointer-events-none z-0 opacity-20">
          <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/20 blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/20 blur-[120px]" />
        </div>
      )}

      {/* Floating Mode Indicator */}
      {isPdfMode && !isLanding && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-3 py-1.5 rounded-full apple-glass flex items-center gap-2 shadow-lg shadow-blue-500/10">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Document Intelligence Active</span>
        </div>
      )}

      <div className={cn("flex-1 overflow-y-auto hide-scrollbar px-4 sm:px-6 pt-6 sm:pt-12 pb-4", isLanding && "flex flex-col justify-center", isPdfActive && "pt-20")}>
        
        {/* Landing */}
        {isLanding && !isPdfMode && (
          <div className="flex flex-col items-center justify-center text-center mt-12 sm:mt-24 mb-8 space-y-6 max-w-2xl mx-auto px-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shadow-sm">
              <InixaLogo size={24} className="text-white" />
            </motion.div>
            <motion.h2 initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="text-2xl sm:text-3xl font-semibold text-white/90">
              How can I help you today?
            </motion.h2>
          </div>
        )}

        {isLanding && isPdfMode && (
          <div className="flex flex-col items-center justify-center text-center mt-6 sm:mt-12 mb-8 space-y-6 max-w-3xl mx-auto px-4">
             <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-500/20">
               <FileText className="w-8 h-8 text-white" />
             </motion.div>
             <motion.h2 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-4xl sm:text-5xl font-serif font-medium tracking-tight text-white/90">
               Inixa Document Intelligence
             </motion.h2>
             <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-lg font-medium text-white/40 max-w-xl">
               Upload large documents (PDF/Word), research papers, or books. Inixa will extract, chunk, and index the contents, allowing you to instantly query your documents using our advanced RAG engine.
             </motion.p>
             <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                onClick={() => fileInputRef.current?.click()}
                className="mt-8 px-8 py-4 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 rounded-2xl flex items-center gap-3 text-indigo-300 hover:text-white font-bold tracking-wide transition-all group shadow-lg shadow-indigo-500/10"
             >
                <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                Upload Document (PDF/Word)
             </motion.button>
          </div>
        )}

        {/* Messages - centered like ChatGPT */}
        <div className="max-w-3xl mx-auto w-full space-y-6">
          {messages.map((m, i) => {
            if (i === 0 && m.role === 'assistant' && isLanding) return null;
            const isUser = m.role === 'user';
            const textContent = getTextContent(m.content);
            if (isUser && textContent.includes('Web Search Results:')) return null;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onContextMenu={(e) => { if (!isUser) showMenu(e, getMessageContextItems(textContent, () => copyToClipboard(textContent, i), () => regenerateMessage(i), () => deleteMessage(i))); }}
                className="w-full"
              >
                {/* User message */}
                {isUser && (
                  <div className="flex justify-end mb-1 w-full">
                    <div className="max-w-[85%] sm:max-w-[75%] flex flex-col items-end">
                      {/* Attached files in user msg */}
                      {Array.isArray(m.content) && m.content.some((c: any) => c.type === 'image_url') && (
                        <div className="flex justify-end mb-3 gap-2 flex-wrap">
                          {m.content.filter((c: any) => c.type === 'image_url').map((c: any, idx: number) => (
                            <img key={idx} src={c.image_url.url} alt="" className="max-h-[160px] w-auto rounded-2xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.2)] object-cover" />
                          ))}
                        </div>
                      )}
                      <div className="bg-white/10 backdrop-blur-md text-white/95 px-5 py-3.5 rounded-3xl rounded-tr-sm shadow-sm border border-white/10 font-medium leading-relaxed">
                        <div className="user-message-markdown">
                          <MessageContent content={textContent.split('\n--- File:')[0].trim()} isCodex={!!isCodex} onOpenArtifact={(type, data, title) => setActiveArtifact({type, data, title})} />
                        </div>
                        {/* Show attached file names */}
                        {textContent.includes('--- File:') && (
                          <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-2">
                            {textContent.match(/--- File: (.+?) ---/g)?.map((match, idx) => (
                              <span key={idx} className="text-[11px] font-semibold bg-black/20 px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-white/5">
                                <FileText className="w-3.5 h-3.5 text-indigo-300" />{match.replace(/--- File: | ---/g, '')}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* AI message - full width, centered like ChatGPT */}
                {!isUser && (
                  <div className="w-full flex flex-col items-start group">
                    {/* Model label */}
                    <div className="flex items-center gap-3 mb-2 ml-1">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md border border-white/5">
                        <InixaLogo size={16} className="text-white drop-shadow-sm" />
                      </div>
                      <span className="text-[13px] font-bold text-white/70 tracking-wide">{currentModel.label}</span>
                    </div>

                    {/* Web Search Sources */}
                    {m.sources && m.sources.length > 0 && (
                      <div className="pl-11 mb-4 pr-4 w-full">
                        <WebSearchPanel isSearching={false} sources={m.sources} query="" />
                      </div>
                    )}

                    {/* Thinking panel */}
                    {m.thinking && <DeepThinkPanel thinkingContent={m.thinking} isThinking={false} modelName={currentModel.label} />}

                    {/* Response body - no bubble, clean like ChatGPT */}
                    <div className="pl-11 text-white/90 font-medium leading-relaxed w-full max-w-full">
                      <MessageContent content={textContent} isCodex={!!isCodex} onOpenArtifact={(type, data, title) => setActiveArtifact({type, data, title})} />
                    </div>

                    {/* Actions */}
                    <div className="pl-9 flex items-center gap-1.5 mt-3 opacity-0 hover:opacity-100 transition-opacity">
                      <button onClick={() => copyToClipboard(textContent, i)} className="p-1.5 rounded-lg hover:bg-white/5 text-white/20 hover:text-white transition-all" title="Copy">
                        {copiedIdx === i ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button onClick={() => regenerateMessage(i)} className="p-1.5 rounded-lg hover:bg-white/5 text-white/20 hover:text-indigo-400 transition-all" title="Regenerate">
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}

          {/* Suggested Follow-ups */}
          {!loading && suggestedFollowups.length > 0 && messages.length > 1 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="flex flex-wrap gap-2 pl-9 mt-2"
            >
              {suggestedFollowups.map((s, idx) => (
                <motion.button
                  key={idx}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setSuggestedFollowups([]); handleSend(s); }}
                  className="px-4 py-2 text-[12px] font-semibold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-full hover:bg-indigo-500/20 hover:text-white transition-all"
                >
                  💡 {s}
                </motion.button>
              ))}
            </motion.div>
          )}

          {/* Web search panel */}
          <AnimatePresence>
            {isSearching && <WebSearchPanel isSearching={isSearching} sources={searchSources} query={searchQuery} />}
          </AnimatePresence>

          {/* Thinking while loading */}
          {loading && isThinking && <DeepThinkPanel thinkingContent={thinkingContent} isThinking={true} modelName={currentModel.label} />}

          {/* Streaming */}
          {loading && isStreaming && streamingText && (
            <div className="w-full">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <InixaLogo size={14} className="text-white" />
                </div>
                <span className="text-[12px] font-semibold text-white/50">{currentModel.label}</span>
              </div>
              {/* Web Search Sources during streaming */}
              {searchSources.length > 0 && (
                <div className="pl-9 mb-4 pr-4">
                  <WebSearchPanel isSearching={false} sources={searchSources} query="" />
                </div>
              )}
              <div className="pl-9">
                <MessageContent content={streamingText} isCodex={!!isCodex} onOpenArtifact={(type, data, title) => setActiveArtifact({type, data, title})} />
                <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.5, repeat: Infinity }} className="inline-block w-[2px] h-4 bg-indigo-400 ml-0.5" />
              </div>
            </div>
          )}

          {/* Loading dots */}
          {loading && !isStreaming && !isThinking && (
            <div className="flex flex-col gap-3 w-full animate-in fade-in zoom-in duration-300">
              <div className="flex items-start gap-3 w-full">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0b0c14] to-[#1a1b21] border border-white/10 flex items-center justify-center shadow-lg relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 animate-pulse-glow" />
                  <div className="w-full h-[2px] bg-indigo-400/50 absolute top-0 animate-search-scan shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                  <InixaLogo size={14} className="text-white/60 animate-pulse relative z-10" />
                </div>
                <div className="flex items-center gap-3 px-4 py-2 bg-[#1a1b21] rounded-2xl w-fit border border-white/5 shadow-inner">
                  <LoadingBreadcrumb text="Processing" />
                </div>
              </div>
              
              {/* Web Search Sources during loading */}
              {searchSources.length > 0 && (
                <div className="pl-11 pr-4 w-full">
                  <WebSearchPanel isSearching={isSearching} sources={searchSources} query="" />
                </div>
              )}
            </div>
          )}
        </div>
        <div ref={endRef} className="h-[280px] sm:h-[320px] w-full shrink-0" />
      </div>

      {/* Input area */}
      <div className={cn(
        "z-[300] pointer-events-none transition-all",
        isLanding ? "relative mt-4 mb-12 sm:mb-20 w-full max-w-3xl mx-auto px-4" : "absolute bottom-0 left-0 right-0 bg-[#212121]"
      )}>
        <div className={cn("max-w-3xl mx-auto px-4 flex flex-col items-center gap-3", !isLanding && "pb-6 sm:pb-8 pt-6 bg-[#212121]")}>
          <div className="w-full pointer-events-auto flex flex-col gap-3">
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,.pdf,.docx,.txt,.csv,.json,.md,.py,.js,.ts,.jsx,.tsx,.html,.css,.xml,.yaml,.yml,.toml,.log,.sql,.sh,.bat,.c,.cpp,.h,.java,.go,.rs,.rb,.php,.swift,.kt" className="hidden" multiple />
            
            {/* File previews */}
            {selectedFiles.length > 0 && (
              <div className="px-4 pt-3 flex flex-wrap gap-2">
                {selectedFiles.map((f, idx) => (
                  <div key={idx} className="relative inline-flex items-center gap-2 bg-white/[0.05] rounded-xl px-2.5 py-2 border border-white/10 group">
                    {f.preview ? (
                      <img src={f.preview} alt="" className="h-14 w-auto rounded-lg border border-white/20" />
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-white/70 truncate max-w-[120px]">{f.file.name}</p>
                          <p className="text-[9px] text-white/30">{(f.file.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                    )}
                    <button onClick={() => removeFile(idx)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black border border-white/20 text-white flex items-center justify-center hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Processing Indicator */}
            {isProcessingPdf && (
              <div className="px-4 py-2 text-[10px] text-white/40 font-bold apple-glass border-b border-white/10 animate-pulse">
                Analyzing Document...
              </div>
            )}

            <BoltStyleChatInput 
              ref={inputRef as any}
              value={input}
              onValueChange={setInput}
              isLoading={loading}
              placeholder="What do you want to build?"
              showSearch={webSearchEnabled}
              onToggleSearch={() => { setWebSearchEnabled(!webSearchEnabled); vibrate(20); }}
              showThink={deepThinkEnabled}
              onToggleThink={() => { setDeepThinkEnabled(!deepThinkEnabled); vibrate(20); }}
              onFileUploadClick={() => fileInputRef.current?.click()}
              onSend={(msg) => handleSend(msg)}
              currentModelName={currentModel.label}
              onModelSelectorClick={() => setShowModelSelector(true)}
            />

            {/* Quick pills on landing - including Student Toolkit items */}
            {isLanding && (
              <div className="flex flex-wrap justify-center gap-2 mt-4 px-4">
                {TOOLKIT_ITEMS.slice(0, 4).map((p, i) => (
                  <motion.button 
                    key={i} 
                    whileHover={{ scale: 1.05 }} 
                    whileTap={{ scale: 0.95 }} 
                    onClick={() => handleSend(p.prompt)} 
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-[11px] font-medium text-white/45 hover:text-white hover:bg-white/[0.06] transition-all"
                  >
                    <p.icon className="w-3 h-3 opacity-50" style={{ color: p.color }} />
                    {p.title.split(' ')[0]}
                  </motion.button>
                ))}
                {[{ label: 'Summarize', icon: FileText }, { label: 'Teach me', icon: BookOpen }, { label: 'Analyze', icon: TrendingUp }].map((p, i) => (
                  <motion.button key={`extra-${i}`} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleSend(p.label)} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-[11px] font-medium text-white/45 hover:text-white hover:bg-white/[0.06] transition-all">
                    <p.icon className="w-3 h-3 opacity-50" />{p.label}
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Context Menu */}
      <AnimatePresence>{contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenu.items} onClose={hideMenu} />}</AnimatePresence>
      </motion.div>

      {/* Artifacts Split Screen */}
      <AnimatePresence>
        {activeArtifact && (
          <motion.div 
            initial={{ opacity: 0, x: 50 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: 50 }} 
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={cn(
              "h-full bg-[#050505] flex flex-col absolute lg:relative z-50 right-0 top-0 bottom-0 shadow-2xl transition-all duration-500",
              isArtifactExpanded ? "w-full lg:w-full" : "w-full lg:w-1/2"
            )}
          >
             <div className="h-full overflow-hidden flex flex-col">
               {activeArtifact.type.toLowerCase() === 'html' || activeArtifact.type.toLowerCase() === 'tsx' || activeArtifact.type.toLowerCase() === 'jsx' || activeArtifact.type.toLowerCase() === 'react' ? (
                 <ArtifactsPreview 
                   code={activeArtifact.data} 
                   language={activeArtifact.type} 
                   title={activeArtifact.title} 
                   onClose={() => { setActiveArtifact(null); setIsArtifactExpanded(false); }} 
                   isExpanded={isArtifactExpanded}
                   onToggleExpand={() => setIsArtifactExpanded(!isArtifactExpanded)}
                 />
               ) : activeArtifact.type.toLowerCase() === 'python' || activeArtifact.type.toLowerCase() === 'javascript' || activeArtifact.type.toLowerCase() === 'js' ? (
                 <CodeSandbox code={activeArtifact.data} language={activeArtifact.type} onClose={() => setActiveArtifact(null)} />
               ) : activeArtifact.type.toLowerCase() === 'json' ? (
                 (() => {
                   try {
                     const parsed = JSON.parse(activeArtifact.data);
                     if (parsed.type && parsed.data) {
                       return <DataChartAgent {...parsed} onClose={() => setActiveArtifact(null)} />;
                     }
                   } catch(e) {}
                   return (
                     <div className="text-white/60 p-8 text-center flex flex-col items-center justify-center h-full">
                       <p className="mb-4 text-sm">Valid Chart JSON structure required (type, title, data, dataKeys).</p>
                       <button onClick={() => setActiveArtifact(null)} className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 text-sm">Close Panel</button>
                     </div>
                   );
                 })()
               ) : (
                 <div className="text-white/60 p-8 text-center flex flex-col items-center justify-center h-full">
                   <p className="mb-4 text-sm">No interactive preview available for .{activeArtifact.type}</p>
                   <button onClick={() => setActiveArtifact(null)} className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 text-sm">Close Panel</button>
                 </div>
               )}
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

