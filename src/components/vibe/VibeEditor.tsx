"use client";
// ═══════════════════════════════════════════════════════════════
// INIXA VIBE CODE — Code Editor Component
// Syntax-highlighted code editor with line numbers
// ═══════════════════════════════════════════════════════════════

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Code2, GitMerge } from 'lucide-react';
import { diffLines } from 'diff';

interface Props {
  content: string;
  language: string;
  filePath?: string;
  oldContent?: string | null;
  onChange: (content: string) => void;
}

export function VibeEditor({ content, language, filePath, oldContent, onChange }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [lineCount, setLineCount] = useState(1);
  const [viewMode, setViewMode] = useState<'code' | 'diff'>('code');

  const diffs = useMemo(() => {
    if (!oldContent) return [];
    return diffLines(oldContent, content);
  }, [oldContent, content]);

  useEffect(() => {
    setLineCount(Math.max(1, (content || '').split('\n').length));
  }, [content]);

  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab indent
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = textareaRef.current!;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newContent = content.substring(0, start) + '  ' + content.substring(end);
      onChange(newContent);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
    // Auto-close brackets
    const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`' };
    if (pairs[e.key]) {
      e.preventDefault();
      const ta = textareaRef.current!;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = content.substring(start, end);
      const newContent = content.substring(0, start) + e.key + selected + pairs[e.key] + content.substring(end);
      onChange(newContent);
      requestAnimationFrame(() => {
        ta.selectionStart = start + 1;
        ta.selectionEnd = start + 1 + selected.length;
      });
    }
    // Enter with auto-indent
    if (e.key === 'Enter') {
      const ta = textareaRef.current!;
      const start = ta.selectionStart;
      const lineStart = content.lastIndexOf('\n', start - 1) + 1;
      const currentLine = content.substring(lineStart, start);
      const indent = currentLine.match(/^(\s*)/)?.[1] || '';
      const charBefore = content[start - 1];
      const extraIndent = (charBefore === '{' || charBefore === '(' || charBefore === '[') ? '  ' : '';

      if (extraIndent && pairs[charBefore!] && content[start] === pairs[charBefore!]) {
        e.preventDefault();
        const newContent = content.substring(0, start) + '\n' + indent + extraIndent + '\n' + indent + content.substring(start);
        onChange(newContent);
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + 1 + indent.length + extraIndent.length;
        });
      } else if (extraIndent || indent) {
        e.preventDefault();
        const newContent = content.substring(0, start) + '\n' + indent + extraIndent + content.substring(start);
        onChange(newContent);
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + 1 + indent.length + extraIndent.length;
        });
      }
    }
  }, [content, onChange]);

  if (!filePath) {
    return (
      <div className="vibe-editor-empty">
        <Code2 size={48} className="text-white/10" />
        <p>Select a file to edit</p>
        <p className="sub">Or ask the AI to create a project for you</p>
      </div>
    );
  }

  return (
    <div className="vibe-editor">
      <div className="vibe-editor-header flex justify-between items-center w-full">
        <div className="flex items-center gap-3">
          <span className="vibe-editor-lang">{language}</span>
          <span className="vibe-editor-path">{filePath}</span>
          {viewMode === 'code' && <span className="vibe-editor-lines">{lineCount} lines</span>}
        </div>
        
        {oldContent && (
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
            <button
              onClick={() => setViewMode('code')}
              className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                viewMode === 'code' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/80'
              }`}
            >
              Code
            </button>
            <button
              onClick={() => setViewMode('diff')}
              className={`flex items-center gap-1 px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                viewMode === 'diff' ? 'bg-indigo-500/30 text-indigo-300' : 'text-white/40 hover:text-white/80'
              }`}
            >
              <GitMerge size={12} /> Diff
            </button>
          </div>
        )}
      </div>
      <div className="vibe-editor-body">
        {viewMode === 'diff' && oldContent ? (
          <div className="diff-view w-full h-full overflow-auto bg-[#0b0c14] text-[13px] font-mono leading-relaxed select-text p-4">
            {diffs.map((part, i) => (
              <pre
                key={i}
                className={`m-0 px-2 py-0.5 whitespace-pre-wrap break-all ${
                  part.added ? 'bg-green-900/30 text-green-300' :
                  part.removed ? 'bg-red-900/30 text-red-300 line-through opacity-70' :
                  'text-white/60'
                }`}
              >
                {part.value.endsWith('\n') ? part.value.slice(0, -1) : part.value}
              </pre>
            ))}
          </div>
        ) : (
          <>
            <div className="vibe-line-numbers" ref={lineNumbersRef}>
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i} className="vibe-line-num">{i + 1}</div>
              ))}
            </div>
            <textarea
              ref={textareaRef}
              className="vibe-editor-textarea"
              value={content}
              onChange={(e) => onChange(e.target.value)}
              onScroll={handleScroll}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
            />
          </>
        )}
      </div>
    </div>
  );
}
