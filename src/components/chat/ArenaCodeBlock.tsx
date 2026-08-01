"use client";
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, FileCode, FolderOpen, ChevronRight, ChevronDown, Eye, Code2, Columns, Download, Copy, Check, Sparkles, Play, RotateCcw } from 'lucide-react';
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview
} from "@codesandbox/sandpack-react";

// ─── Types ────────────────────────────────────────────────────────
interface ParsedFile {
  path: string;
  code: string;
  language: string;
}

interface TaskItem {
  label: string;
  done: boolean;
}

// ─── File parser: extracts files from markdown code blocks ────────
export function parseFilesFromMarkdown(content: string): ParsedFile[] {
  const files: ParsedFile[] = [];
  // Match: ```lang ... ``` with optional file hints before or in the fence
  const blockRegex = /(?:#{1,4}\s*`([^`]+)`\s*\n+)?```(\w+)(?:\s+(?:title=["']([^"']+)["']|\/\/\s*(.+?\.\w+)|.*?filename:\s*["']([^"']+)["']))?.*?\n([\s\S]*?)```/g;
  let match;
  const usedNames = new Set<string>();

  while ((match = blockRegex.exec(content)) !== null) {
    const headingFile = match[1]?.trim();
    const lang = match[2];
    const titleFile = match[3]?.trim();
    const commentFile = match[4]?.trim();
    const filenameFile = match[5]?.trim();
    const code = match[6].trim();

    let path = headingFile || titleFile || commentFile || filenameFile || '';

    // If no path, generate one based on language
    if (!path) {
      const extMap: Record<string, string> = {
        tsx: 'App.tsx', jsx: 'App.jsx', css: 'styles.css', html: 'index.html',
        js: 'script.js', ts: 'index.ts', json: 'data.json', py: 'main.py'
      };
      let base = extMap[lang] || `file.${lang}`;
      // Avoid duplicates
      let counter = 1;
      while (usedNames.has(base)) {
        const parts = base.split('.');
        const ext = parts.pop();
        base = `${parts.join('.')}${counter}.${ext}`;
        counter++;
      }
      path = base;
    }

    usedNames.add(path);
    files.push({ path, code, language: lang });
  }
  return files;
}

// Check if message has multi-file code (2+ code blocks)
export function hasMultiFileCode(content: string): boolean {
  const blocks = content.match(/```\w+/g);
  return (blocks?.length || 0) >= 2;
}

// ─── Build Sandpack-compatible files ──────────────────────────────
function buildSandpackFiles(files: ParsedFile[]): { sandpackFiles: Record<string, string>; template: 'react-ts' | 'static' | 'vanilla'; entryFile: string } {
  const hasReact = files.some(f => ['tsx', 'jsx'].includes(f.language));
  const hasHtml = files.some(f => f.language === 'html');
  const hasCss = files.some(f => f.language === 'css');

  const sp: Record<string, string> = {};

  if (hasReact) {
    // React mode: map files into Sandpack's react-ts template
    let appCode = '';
    let cssCode = '';
    const otherFiles: ParsedFile[] = [];

    files.forEach(f => {
      if (['tsx', 'jsx'].includes(f.language) && !appCode) {
        appCode = f.code;
      } else if (f.language === 'css' && !cssCode) {
        cssCode = f.code;
      } else {
        otherFiles.push(f);
      }
    });

    if (appCode) {
      // If code doesn't import React, add it
      if (!appCode.includes("from 'react'") && !appCode.includes('from "react"')) {
        appCode = `import React from 'react';\n${appCode}`;
      }
      // If code doesn't have default export, wrap it
      if (!appCode.includes('export default')) {
        appCode += '\nexport default App;';
      }
      sp['/App.tsx'] = appCode;
    }
    if (cssCode) {
      sp['/styles.css'] = cssCode;
      // Ensure App imports the CSS
      if (sp['/App.tsx'] && !sp['/App.tsx'].includes("import './styles.css'") && !sp['/App.tsx'].includes('import "./styles.css"')) {
        sp['/App.tsx'] = `import './styles.css';\n${sp['/App.tsx']}`;
      }
    }
    // Add remaining files
    otherFiles.forEach(f => {
      let key = f.path;
      if (!key.startsWith('/')) key = '/' + key;
      sp[key] = f.code;
    });

    return { sandpackFiles: sp, template: 'react-ts', entryFile: '/App.tsx' };
  }

  if (hasHtml) {
    // Static HTML mode
    let htmlCode = '';
    let cssCode = '';
    let jsCode = '';

    files.forEach(f => {
      if (f.language === 'html' && !htmlCode) {
        htmlCode = f.code;
      } else if (f.language === 'css' && !cssCode) {
        cssCode = f.code;
      } else if (['js', 'javascript'].includes(f.language) && !jsCode) {
        jsCode = f.code;
      }
    });

    // If HTML doesn't include style/script, inject them
    if (htmlCode) {
      if (cssCode && !htmlCode.includes('<link') && !htmlCode.includes('<style')) {
        htmlCode = htmlCode.replace('</head>', `<style>\n${cssCode}\n</style>\n</head>`);
        if (!htmlCode.includes('</head>')) {
          htmlCode = `<style>\n${cssCode}\n</style>\n${htmlCode}`;
        }
      }
      if (jsCode && !htmlCode.includes('<script')) {
        htmlCode = htmlCode.replace('</body>', `<script>\n${jsCode}\n</script>\n</body>`);
        if (!htmlCode.includes('</body>')) {
          htmlCode += `\n<script>\n${jsCode}\n</script>`;
        }
      }
      sp['/index.html'] = htmlCode;
    }

    return { sandpackFiles: sp, template: 'static', entryFile: '/index.html' };
  }

  // Vanilla JS fallback
  files.forEach(f => {
    let key = f.path;
    if (!key.startsWith('/')) key = '/' + key;
    sp[key] = f.code;
  });

  return { sandpackFiles: sp, template: 'vanilla', entryFile: '/index.js' };
}

// ─── File Icon Color ──────────────────────────────────────────────
const getFileColor = (lang: string) => {
  const colors: Record<string, string> = {
    tsx: '#61dafb', jsx: '#61dafb', ts: '#3178c6', js: '#f7df1e',
    css: '#264de4', html: '#e34c26', json: '#aba919', md: '#ffffff',
    py: '#3776ab', go: '#00add8', rs: '#dea584'
  };
  return colors[lang] || '#9ca3af';
};

// ─── File Tree Component ──────────────────────────────────────────
function FileTree({ files, activeFile, onSelect }: { files: ParsedFile[]; activeFile: string; onSelect: (p: string) => void }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ 'src': true, '/': true });

  const tree = useMemo(() => {
    const folders: Record<string, ParsedFile[]> = {};
    files.forEach(f => {
      const parts = f.path.split('/');
      const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : '/';
      if (!folders[folder]) folders[folder] = [];
      folders[folder].push(f);
    });
    return folders;
  }, [files]);

  return (
    <div className="text-[11px] font-mono select-none py-1">
      {Object.entries(tree).map(([folder, folderFiles]) => (
        <div key={folder}>
          {folder !== '/' && (
            <button
              onClick={() => setExpanded(p => ({ ...p, [folder]: !p[folder] }))}
              className="flex items-center gap-1.5 w-full px-3 py-1.5 text-white/40 hover:text-white/70 hover:bg-white/[0.03] transition-colors"
            >
              {expanded[folder] ? <ChevronDown className="w-3 h-3 opacity-50" /> : <ChevronRight className="w-3 h-3 opacity-50" />}
              <FolderOpen className="w-3.5 h-3.5 text-amber-400/50" />
              <span className="font-medium">{folder}</span>
            </button>
          )}
          <AnimatePresence>
            {(folder === '/' || expanded[folder] !== false) && folderFiles.map(f => (
              <motion.button
                key={f.path}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onClick={() => onSelect(f.path)}
                className={`flex items-center gap-1.5 w-full py-1.5 transition-all ${
                  f.path === activeFile
                    ? 'bg-indigo-500/10 text-indigo-300 border-r-2 border-indigo-400 px-3'
                    : 'text-white/35 hover:text-white/60 hover:bg-white/[0.02] px-3'
                } ${folder !== '/' ? 'pl-7' : ''}`}
              >
                <FileCode className="w-3.5 h-3.5 shrink-0" style={{ color: getFileColor(f.language) }} />
                <span className="truncate font-medium">{f.path.split('/').pop()}</span>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

// ─── Task Progress ────────────────────────────────────────────────
function TaskProgress({ tasks }: { tasks: TaskItem[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {tasks.map((t, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08 }}
          className="flex items-center gap-1.5 text-[10px] font-medium"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.08 + 0.15, type: 'spring', stiffness: 500 }}
          >
            <CheckCircle2 className={`w-3.5 h-3.5 ${t.done ? 'text-emerald-400' : 'text-white/15 animate-pulse'}`} />
          </motion.div>
          <span className={t.done ? 'text-white/50' : 'text-white/20'}>{t.label}</span>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Main Arena Code Block ────────────────────────────────────────
export function ArenaCodeBlock({ files }: { files: ParsedFile[] }) {
  const [viewMode, setViewMode] = useState<'preview' | 'code' | 'split'>('preview');
  const [activeFile, setActiveFile] = useState(files[0]?.path || '');
  const [copied, setCopied] = useState(false);
  const [sandpackKey, setSandpackKey] = useState(0);

  // Generate task items
  const tasks: TaskItem[] = useMemo(() => {
    const items: TaskItem[] = [];
    const hasReact = files.some(f => ['tsx', 'jsx'].includes(f.language));
    if (hasReact) items.push({ label: 'React setup', done: true });
    files.forEach(f => items.push({ label: f.path.split('/').pop() || f.path, done: true }));
    items.push({ label: 'Preview ready', done: true });
    return items;
  }, [files]);

  // Build Sandpack files
  const { sandpackFiles, template, entryFile } = useMemo(() => buildSandpackFiles(files), [files]);

  const handleCopy = () => {
    const allCode = files.map(f => `// ── ${f.path} ──\n${f.code}`).join('\n\n');
    navigator.clipboard.writeText(allCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const allCode = files.map(f => `// ── ${f.path} ──\n${f.code}`).join('\n\n');
    const blob = new Blob([allCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full rounded-2xl overflow-hidden my-5 ring-1 ring-white/[0.06] shadow-[0_8px_40px_rgba(0,0,0,0.5)]"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-[#0d0e14] to-[#111218] border-b border-white/[0.04]">
        <div className="flex items-center gap-2.5">
          {/* Traffic lights */}
          <div className="flex items-center gap-1.5 mr-2">
            <div className="w-[10px] h-[10px] rounded-full bg-[#ff5f57] ring-1 ring-[#e0443e]/30" />
            <div className="w-[10px] h-[10px] rounded-full bg-[#febc2e] ring-1 ring-[#dea123]/30" />
            <div className="w-[10px] h-[10px] rounded-full bg-[#28c840] ring-1 ring-[#1aab29]/30" />
          </div>
          <div className="h-4 w-[1px] bg-white/[0.06]" />
          <Sparkles className="w-3.5 h-3.5 text-indigo-400/70" />
          <span className="text-[11px] font-semibold text-white/60 tracking-tight">Generated Project</span>
          <span className="text-[9px] font-bold text-white/20 bg-white/[0.04] px-1.5 py-0.5 rounded">{files.length} files</span>
        </div>
        <div className="flex items-center gap-0.5">
          {[
            { mode: 'preview' as const, icon: Eye, tip: 'Preview' },
            { mode: 'code' as const, icon: Code2, tip: 'Code' },
            { mode: 'split' as const, icon: Columns, tip: 'Split' },
          ].map(v => (
            <button
              key={v.mode}
              onClick={() => setViewMode(v.mode)}
              title={v.tip}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === v.mode
                  ? 'bg-indigo-500/15 text-indigo-300'
                  : 'text-white/20 hover:text-white/50 hover:bg-white/[0.04]'
              }`}
            >
              <v.icon className="w-3.5 h-3.5" />
            </button>
          ))}
          <div className="w-[1px] h-4 bg-white/[0.06] mx-1" />
          <button onClick={() => setSandpackKey(k => k + 1)} title="Restart preview" className="p-1.5 rounded-md text-white/20 hover:text-white/50 hover:bg-white/[0.04] transition-all">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleCopy} title="Copy all code" className="p-1.5 rounded-md text-white/20 hover:text-white/50 hover:bg-white/[0.04] transition-all">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button onClick={handleDownload} title="Download" className="p-1.5 rounded-md text-white/20 hover:text-white/50 hover:bg-white/[0.04] transition-all">
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tasks Bar */}
      <div className="px-4 py-2.5 bg-[#0a0b10] border-b border-white/[0.03]">
        <TaskProgress tasks={tasks} />
      </div>

      {/* Body */}
      <div className="flex" style={{ height: 'clamp(350px, 50vh, 550px)' }}>
        {/* File Tree Sidebar */}
        {(viewMode === 'code' || viewMode === 'split') && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 170, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-r border-white/[0.04] bg-[#08090d] overflow-y-auto shrink-0 hidden sm:block hide-scrollbar"
          >
            <div className="px-3 py-2.5">
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/15">Explorer</span>
            </div>
            <FileTree files={files} activeFile={activeFile} onSelect={setActiveFile} />
          </motion.div>
        )}

        {/* Sandpack */}
        <div className="flex-1 min-w-0 overflow-hidden bg-[#0a0b10]">
          <SandpackProvider
            key={sandpackKey}
            template={template}
            files={sandpackFiles}
            theme="dark"
            customSetup={{
              dependencies: {
                "react-router-dom": "^6.22.3",
                "lucide-react": "^0.344.0",
                "framer-motion": "^11.0.8",
                "canvas-confetti": "^1.9.2"
              }
            }}
            options={{
              externalResources: ["https://cdn.tailwindcss.com"],
              activeFile: entryFile,
            }}
          >
            <SandpackLayout style={{ height: '100%', border: 'none', borderRadius: 0, background: 'transparent' }}>
              {(viewMode === 'code' || viewMode === 'split') && (
                <SandpackCodeEditor
                  style={{ height: '100%', flex: viewMode === 'split' ? '1' : undefined }}
                  showTabs
                  showLineNumbers
                  showInlineErrors
                  wrapContent
                />
              )}
              {(viewMode === 'preview' || viewMode === 'split') && (
                <SandpackPreview
                  style={{ height: '100%', flex: viewMode === 'split' ? '1.2' : undefined }}
                  showNavigator={false}
                  showRefreshButton
                  showOpenInCodeSandbox={false}
                />
              )}
            </SandpackLayout>
          </SandpackProvider>
        </div>
      </div>
    </motion.div>
  );
}
