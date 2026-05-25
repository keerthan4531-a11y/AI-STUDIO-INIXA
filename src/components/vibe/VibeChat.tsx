"use client";
import React, { useRef, useEffect, useState } from 'react';
import { Send, Loader2, Bot, User, Wrench, ChevronDown, Sparkles, Code, Cpu, Brain, Zap, Layout, Plus, FileCode, Settings, Lightbulb, Rocket, Bug, Eye, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { VibeMessage } from '../../api/vibeEngine';
import type { AIModel } from '../../api/aiEngine';

interface Props {
  messages: VibeMessage[];
  isLoading: boolean;
  streamingText: string;
  onSend: (text: string) => void;
  model: AIModel;
  agentStatus?: string | null;
}

// Smart suggestions matching Google AI Studio style
const SUGGESTION_PROMPTS = [
  { icon: <Layout size={14}/>, label: 'Build a modern SaaS landing page', desc: 'React + Tailwind + animations' },
  { icon: <Code size={14}/>, label: 'Create a REST API with Express', desc: 'Node.js + MongoDB + JWT auth' },
  { icon: <Bug size={14}/>, label: 'Debug this React component', desc: 'Find and fix bugs' },
  { icon: <Rocket size={14}/>, label: 'Build a real-time chat app', desc: 'Socket.io + Express + React' },
  { icon: <Eye size={14}/>, label: 'Create a data visualization', desc: 'D3.js or Recharts dashboard' },
  { icon: <Settings size={14}/>, label: 'Write a system architecture', desc: 'Microservices + Docker + K8s' },
];

function renderContent(text: string) {
  if (!text) return null;
  return (
    <div className="prose prose-invert prose-p:leading-relaxed prose-pre:p-0 w-full max-w-none break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({node, inline, className, children, ...props}: any) {
            const match = /language-(\w+)/.exec(className || '');
            const lang = match ? match[1] : '';
            if (!inline && match) {
              return (
                <div className="rounded-2xl overflow-hidden my-6 border border-white/10 shadow-2xl bg-[#0d1117] group/code">
                  <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <FileCode size={14} className="text-blue-400" />
                      <span className="text-[11px] font-mono text-gray-400 lowercase">{lang}</span>
                    </div>
                    <button 
                      onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ''))}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all text-[11px] font-medium"
                    >
                      <Copy size={12}/> Copy
                    </button>
                  </div>
                  <SyntaxHighlighter
                    style={atomDark}
                    language={lang}
                    PreTag="div"
                    customStyle={{ margin: 0, padding: '1.5rem', background: 'transparent', fontSize: '13px', lineHeight: '1.6' }}
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                </div>
              );
            }
            return <code className="vibe-inline-code px-1.5 py-0.5 rounded-md bg-white/10 text-blue-300 font-mono text-[13px]" {...props}>{children}</code>;
          }
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
// Strip XML artifacts from streaming text so they don't render ugly boxes
function cleanStreamingText(text: string) {
  if (!text) return '';
  return text
    .replace(/<vibe_artifact[^>]*>/g, '')
    .replace(/<\/vibe_artifact>/g, '')
    .replace(/<vibe_action[^>]*>[\s\S]*?(?:<\/vibe_action>|$)/g, '')
    .trim();
}

// ─── VibeChat Component ───
export function VibeChat({ messages, isLoading, streamingText, onSend, model, agentStatus }: Props) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, streamingText]);

  useEffect(() => {
    if (messages.length > 0) setShowSuggestions(false);
  }, [messages]);

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 300) + 'px';
  };

  return (
    <div className="vibe-chat">
      <div className="vibe-chat-messages" ref={scrollRef}>
        {messages.length === 0 && !isLoading && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="vibe-chat-welcome"
          >
            <div className="vibe-welcome-sparkle">
              <Sparkles size={40} className="text-blue-400" />
            </div>
            <h1>How can I help you build today?</h1>
            <p className="text-gray-400 max-w-lg mx-auto">
              Inixa Vibe Code is your elite coding partner. Create entire projects, debug complex logic, and build stunning UIs — all from natural language.
            </p>
            
            <div className="vibe-suggestions-grid mt-8">
              {SUGGESTION_PROMPTS.map((s, i) => (
                <button key={i} className="vibe-suggestion-card" onClick={() => { setInput(s.label); inputRef.current?.focus(); }}>
                  <div className="vibe-suggestion-icon">{s.icon}</div>
                  <div className="vibe-suggestion-text">
                    <div className="vibe-suggestion-label">{s.label}</div>
                    <div className="vibe-suggestion-desc">{s.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="vibe-quick-tips">
              <span className="vibe-tip-label">Quick tips:</span>
              <span className="vibe-tip">• Describe your project in detail</span>
              <span className="vibe-tip">• Specify your tech stack preference</span>
              <span className="vibe-tip">• Ask for specific UI frameworks</span>
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {messages.filter(m => m.role !== 'tool').map(msg => (
            <motion.div 
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`vibe-chat-msg ${msg.role}`}
            >
              <div className="vibe-chat-avatar">
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className="vibe-chat-bubble">
                <div className="vibe-chat-content">{renderContent(cleanStreamingText(msg.content))}</div>
                
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="vibe-chat-tools">
                    {msg.toolCalls.map((tc, i) => (
                      <div key={i} className="vibe-tool-badge">
                        <Wrench size={11} />
                        <span>{tc.name}</span>
                        {tc.input.path && <span className="vibe-tool-path">{tc.input.path}</span>}
                      </div>
                    ))}
                  </div>
                )}
                
                {msg.toolResults && msg.toolResults.length > 0 && (
                  <div className="vibe-chat-results">
                    {msg.toolResults.map((r, i) => (
                      <div key={i} className={`vibe-result-badge ${r.success ? 'success' : 'error'}`}>
                        {r.success ? <Zap size={10}/> : '✗'} {r.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && streamingText && (
          <div className="vibe-chat-msg assistant">
            <div className="vibe-chat-avatar"><Bot size={16} /></div>
            <div className="vibe-chat-bubble">
              <div className="vibe-chat-content">{renderContent(cleanStreamingText(streamingText))}</div>
              <div className="vibe-streaming-indicator">
                <Loader2 size={12} className="animate-spin" /> 
                <span className="text-xs text-blue-400 font-medium">
                  {agentStatus ? `[${agentStatus}] ` : ''}Generating with {model.label}...
                </span>
              </div>
            </div>
          </div>
        )}

        {isLoading && !streamingText && (
          <div className="vibe-chat-msg assistant">
            <div className="vibe-chat-avatar"><Bot size={16} /></div>
            <div className="vibe-chat-bubble">
              <div className="vibe-thinking">
                <div className="vibe-pulse-dot" />
                <span className="text-sm text-gray-500 italic">
                  {agentStatus ? agentStatus : 'Thinking...'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/5 bg-[#0b0c14] shrink-0">
        <div className="bg-[#161b22] border border-white/10 rounded-2xl overflow-hidden shadow-lg focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-white p-4 text-[13px] leading-relaxed resize-none outline-none max-h-[200px]"
            placeholder={`Ask INIXA to build something...`}
            rows={1}
            disabled={isLoading}
          />
          <div className="flex justify-between items-center p-3 pt-0">
            <div className="flex gap-2">
              <button className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                <Plus size={16}/>
              </button>
              <button className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                <Code size={16}/>
              </button>
            </div>
            <button 
              className={`p-2 rounded-xl flex items-center justify-center transition-all ${!input.trim() || isLoading ? 'bg-white/5 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
              onClick={handleSubmit} 
              disabled={!input.trim() || isLoading}
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
        <div className="text-[10px] text-center mt-3 text-gray-500">
          INIXA Vibe Code creates complete autonomous projects. Verify outputs.
        </div>
      </div>
    </div>
  );
}


