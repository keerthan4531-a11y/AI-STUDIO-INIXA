"use client";
import React, { useRef, useEffect, useState } from 'react';

interface Props {
  lines: string[];
  onCommand: (cmd: string) => void;
}

export function VibeTerminal({ lines, onCommand }: Props) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setHistory(prev => [input, ...prev]);
    setHistIdx(-1);
    onCommand(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(histIdx + 1, history.length - 1);
      setHistIdx(next);
      if (history[next]) setInput(history[next]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = histIdx - 1;
      if (next < 0) { setHistIdx(-1); setInput(''); }
      else { setHistIdx(next); setInput(history[next] || ''); }
    }
  };

  return (
    <div className="vibe-terminal" onClick={() => inputRef.current?.focus()}>
      <div className="vibe-terminal-output" ref={scrollRef}>
        {lines.map((line, i) => (
          <div key={i} className={`vibe-terminal-line ${line.startsWith('$') ? 'cmd' : line.startsWith('[AI]') ? 'ai' : line.startsWith('  ✓') ? 'success' : line.startsWith('  ✗') ? 'error' : ''}`}>
            {line}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="vibe-terminal-input-row">
        <span className="vibe-terminal-prompt">$</span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="vibe-terminal-input"
          placeholder="Type a command..."
          spellCheck={false}
          autoComplete="off"
        />
      </form>
    </div>
  );
}

