"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Notebook, NoteIXMessage } from './NoteIXTypes';
import { type AIModel, aiChat } from '../../api/aiEngine';
import { Send, Bot, User, MessageSquare, BookMarked } from 'lucide-react';
import { MessageContent } from '../MessageContent';
import { SlideDeckViewer } from './SlideDeckViewer';
import { FlashcardsViewer } from './FlashcardsViewer';
import { MermaidViewer } from './MermaidViewer';

export function NoteIXChat({ notebook, setNotebook, currentModel }: { notebook: Notebook; setNotebook: React.Dispatch<React.SetStateAction<Notebook>>; currentModel: AIModel; }) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [notebook.chatHistory]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const lowercaseInput = input.toLowerCase();
    const isPptRequest = lowercaseInput.includes('ppt') || 
                         lowercaseInput.includes('presentation') || 
                         lowercaseInput.includes('slide');

    const userMsg: NoteIXMessage = {
      id: Math.random().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    const botId = Math.random().toString();
    const initialBotMsg: NoteIXMessage = {
      id: botId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      citations: []
    };

    setNotebook(prev => ({ ...prev, chatHistory: [...prev.chatHistory, userMsg, initialBotMsg] }));
    setInput('');
    setIsLoading(true);

    try {
      if (isPptRequest) {
        // Trigger Presenton backend generation API route
        const combinedPrompt = `Based on these sources:\n${notebook.sources.map((s, i) => `--- [Source ${i+1}: ${s.title}] ---\n${s.content}`).join('\n\n')}\n\nCreate a presentation about: ${input}`;

        setNotebook(prev => ({
          ...prev,
          chatHistory: prev.chatHistory.map(m => 
            m.id === botId ? { ...m, content: 'Generating presentation via Presenton backend... Please wait.' } : m
          )
        }));

        const response = await fetch('/api/ppt/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: combinedPrompt,
            theme: 'royal_blue',
            n_slides: 8
          })
        });

        const data = await response.json();

        if (data.success) {
          setNotebook(prev => ({
            ...prev,
            chatHistory: prev.chatHistory.map(m => 
              m.id === botId 
                ? { 
                    ...m, 
                    content: `🎉 **Presentation created successfully via Presenton!**\n\nI have analyzed your sources and built a custom PowerPoint slide deck.\n\n👉 **[Download PowerPoint Presentation (PPTX)](${data.downloadUrl})**`,
                  } 
                : m
            )
          }));
        } else {
          setNotebook(prev => ({
            ...prev,
            chatHistory: prev.chatHistory.map(m => 
              m.id === botId 
                ? { 
                    ...m, 
                    content: `⚠️ **Failed to generate presentation via Presenton:**\n\n${data.error || 'Unknown error'}\n\n*Make sure Docker Desktop is started and the Presenton container is running using \`docker compose up -d\`.*`,
                  } 
                : m
            )
          }));
        }
      } else {
        const systemPrompt = `You are NOTE-IX, an elite AI research assistant. You answer the user's questions STRICTLY based on the provided SOURCES below.
      Do not hallucinate. If the answer is not in the sources, say "I cannot find the answer in the provided sources."
      ALWAYS cite your sources inline using brackets, like [Source 1] or [Source 2], whenever you state a fact from that source.
      
      SOURCES:
      ${notebook.sources.map((s, i) => `--- [Source ${i+1}: ${s.title}] ---\n${s.content}\n-------------------`).join('\n\n')}`;

        let currentResponse = '';

        await aiChat(
          [
            { role: 'system', content: systemPrompt },
            ...notebook.chatHistory.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: input }
          ],
          (fullText: string) => {
            currentResponse = fullText;
            setNotebook(prev => ({
              ...prev,
              chatHistory: prev.chatHistory.map(m => 
                m.id === botId ? { ...m, content: currentResponse } : m
              )
            }));
          },
          currentModel
        );

        // Post-process to extract citations if needed
        const citations: { sourceId: string; snippet: string }[] = [];
        notebook.sources.forEach((s, i) => {
          if (currentResponse.includes(`[Source ${i+1}]`)) {
            citations.push({ sourceId: s.id, snippet: s.title });
          }
        });

        setNotebook(prev => ({
          ...prev,
          chatHistory: prev.chatHistory.map(m => 
            m.id === botId ? { ...m, citations } : m
          )
        }));
      }

    } catch (e) {
      console.error(e);
      setNotebook(prev => ({
        ...prev,
        chatHistory: prev.chatHistory.map(m => 
          m.id === botId ? { ...m, content: '⚠️ Error generating response.' } : m
        )
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col h-full bg-transparent relative z-10">
      <div className="px-6 py-5 border-b border-white/[0.08] bg-white/[0.01] flex items-center justify-between backdrop-blur-md">
        <h2 className="text-sm font-black text-white tracking-widest uppercase flex items-center gap-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
          <MessageSquare className="w-4 h-4 text-fuchsia-400" />
          Notebook Chat
        </h2>
        <span className="text-[10px] font-black text-fuchsia-300 uppercase tracking-[0.2em] bg-fuchsia-500/10 px-3 py-1 rounded-full border border-fuchsia-500/20">{currentModel.label}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 hide-scrollbar scroll-smooth">
        {notebook.chatHistory.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-5 px-4 opacity-70">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-fuchsia-500/10 to-blue-500/10 border border-white/5 flex items-center justify-center shadow-[0_0_40px_rgba(192,38,211,0.1)] relative">
              <div className="absolute inset-0 bg-white/5 rounded-full blur-md" />
              <Bot className="w-10 h-10 text-white/40 drop-shadow-md relative z-10" />
            </div>
            <div>
              <p className="text-xl font-black text-white mb-2 tracking-tight">How can I help you learn?</p>
              <p className="text-sm text-white/50 font-medium">Ask me anything about your uploaded sources.</p>
            </div>
          </div>
        ) : (
          notebook.chatHistory.map(msg => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} group`}>
              <div className={`w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 ${msg.role === 'user' ? 'bg-gradient-to-br from-indigo-500/30 to-blue-600/30 text-indigo-200 border border-indigo-400/20' : 'bg-gradient-to-br from-fuchsia-500/30 to-purple-600/30 text-fuchsia-200 border border-fuchsia-400/20'}`}>
                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              <div className={`max-w-[95%] ${msg.artifactId && notebook.artifacts.find(a => a.id === msg.artifactId)?.type === 'slide_deck' ? 'w-full' : ''} ${msg.role === 'user' ? 'bg-gradient-to-br from-indigo-600 to-blue-700 text-white px-5 py-4 rounded-[24px] rounded-tr-[8px] shadow-[0_10px_20px_rgba(79,70,229,0.3)] border border-white/10' : 'user-message-markdown bg-white/[0.03] px-5 py-4 rounded-[24px] rounded-tl-[8px] border border-white/[0.08] shadow-[0_10px_20px_rgba(0,0,0,0.2)]'}`}>
                {msg.role === 'user' ? (
                  <p className="text-sm">{msg.content}</p>
                ) : (
                  <div className="space-y-4">
                    <MessageContent content={msg.content} isCodex={false} />
                    {msg.artifactId && (() => {
                      const artifact = notebook.artifacts.find(a => a.id === msg.artifactId);
                      if (artifact && artifact.type === 'slide_deck') {
                        return (
                          <div className="mt-4 border border-fuchsia-500/20 rounded-3xl overflow-hidden shadow-2xl w-full min-w-[500px]">
                            <SlideDeckViewer content={artifact.content} title={artifact.title} />
                          </div>
                        );
                      } else if (artifact && artifact.type === 'flashcards') {
                        return (
                          <div className="mt-4 w-full">
                            <FlashcardsViewer content={artifact.content} title={artifact.title} />
                          </div>
                        );
                      } else if (artifact && artifact.type === 'mind_map') {
                        return (
                          <div className="mt-4 w-full min-w-[500px]">
                            <MermaidViewer content={artifact.content} title={artifact.title} />
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-white/5">
                    {msg.citations.map((c, i) => (
                      <span key={i} className="text-[10px] font-bold tracking-wider uppercase bg-fuchsia-500/10 text-fuchsia-300 px-3 py-1.5 rounded-lg border border-fuchsia-500/20 cursor-pointer hover:bg-fuchsia-500/30 hover:shadow-[0_0_15px_rgba(192,38,211,0.2)] transition-all flex items-center gap-1.5">
                        <BookMarked className="w-3 h-3" /> Source {i+1}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center bg-fuchsia-500/20 text-fuchsia-400">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="bg-white/5 rounded-2xl px-4 py-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-white/20 rounded-full animate-bounce" />
              <span className="w-2 h-2 bg-white/20 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              <span className="w-2 h-2 bg-white/20 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-5 bg-white/[0.02] border-t border-white/[0.08] backdrop-blur-xl relative z-20">
        <div className="relative flex items-center bg-black/40 border border-white/10 rounded-2xl p-1.5 focus-within:border-fuchsia-500/50 focus-within:ring-2 focus-within:ring-fuchsia-500/20 focus-within:bg-black/60 transition-all shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
          <input 
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything about your sources..."
            className="flex-1 bg-transparent border-none outline-none text-white px-5 py-3.5 text-[15px] placeholder:text-white/30 font-medium"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading || notebook.sources.length === 0}
            className="p-3.5 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 disabled:from-white/5 disabled:to-white/5 disabled:text-white/20 disabled:shadow-none text-white rounded-[14px] transition-all ml-2 shadow-[0_0_15px_rgba(192,38,211,0.4)] hover:shadow-[0_0_25px_rgba(192,38,211,0.6)] border border-fuchsia-400/30 disabled:border-white/5 disabled:cursor-not-allowed group"
          >
            <Send className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>
        {notebook.sources.length === 0 && (
          <p className="text-[11px] font-bold text-rose-400 mt-3 text-center tracking-wide flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            PLEASE ADD SOURCES TO UNLOCK AI CHAT
          </p>
        )}
      </div>
    </div>
  );
}
