"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Send, Cpu, ShieldAlert, KeyRound } from 'lucide-react';
import './TerminalChat.css';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export default function TerminalChat() {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    setMessages([
      {
        id: '1',
        role: 'system',
        content: 'INITIALIZING SECURE CONNECTION...\nESTABLISHED ENCRYPTED TUNNEL.\nGEMINI PROXY SYSTEM READY.',
        timestamp: new Date().toLocaleTimeString(),
      }
    ]);
  }, []);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Temporary mocked response for UI building phase
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${API_BASE}/api/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: input }),
      });

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || 'No response received.',
        timestamp: new Date().toLocaleTimeString(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: 'ERROR: CONNECTION LOST OR RATE LIMIT EXCEEDED. \nPLEASE TRY AGAIN LATER.',
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="terminal-container">
      <div className="terminal-header">
        <div className="terminal-title">
          <Terminal size={18} className="terminal-icon" />
          <span>SECURE_TERM // AI_SYSTEM</span>
        </div>
        <div className="terminal-status">
          <ShieldAlert size={16} className="status-icon" />
          <span className="status-text blink">ENCRYPTED</span>
        </div>
      </div>

      <div className="terminal-body">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.role}`}>
            <div className="message-meta">
              <span className="message-role">
                {msg.role === 'user' ? 'USER@LOCAL:~$' : msg.role === 'assistant' ? 'AI_CORE@SYS:~$' : 'SYSTEM>'}
              </span>
              <span className="message-time">[{msg.timestamp}]</span>
            </div>
            <div className="message-content">
              {msg.content.split('\n').map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message system">
            <div className="message-meta">
              <span className="message-role">SYSTEM&gt;</span>
            </div>
            <div className="message-content blink">AWAITING RESPONSE...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="terminal-footer">
        <form onSubmit={handleSubmit} className="terminal-form">
          <span className="prompt-indicator">&gt;&nbsp;</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="terminal-input"
            placeholder="Enter command or query..."
            autoFocus
            disabled={isLoading}
            autoComplete="off"
            spellCheck="false"
          />
          <button type="submit" className="terminal-submit" disabled={isLoading || !input.trim()}>
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
