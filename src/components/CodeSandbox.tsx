"use client";
import React, { useState, useEffect } from 'react';
import { Play, Terminal, X, Loader2 } from 'lucide-react';

interface CodeSandboxProps {
  code: string;
  language: 'python' | 'javascript' | string;
  onClose?: () => void;
}

export function CodeSandbox({ code, language, onClose }: CodeSandboxProps) {
  const [output, setOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    if (language.toLowerCase() === 'python' && !(window as any).pyodide) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
      script.onload = async () => {
        (window as any).pyodide = await (window as any).loadPyodide();
        setIsReady(true);
      };
      document.body.appendChild(script);
    } else {
      setIsReady(true);
    }
  }, [language]);

  const runCode = async () => {
    setIsRunning(true);
    setOutput([]);
    try {
      const lang = language.toLowerCase();
      if (lang === 'python') {
        const pyodide = (window as any).pyodide;
        if (!pyodide) throw new Error("Pyodide not loaded");
        
        // redirect stdout
        pyodide.runPython(`
import sys
import io
sys.stdout = io.StringIO()
        `);
        
        await pyodide.runPythonAsync(code);
        
        const stdout = pyodide.runPython("sys.stdout.getvalue()");
        setOutput(stdout.split('\n'));
      } else if (lang === 'javascript' || lang === 'js') {
        // Safe-ish eval for browser JS execution
        const originalConsoleLog = console.log;
        const logs: string[] = [];
        console.log = (...args) => {
          logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
        };
        
        try {
          // eslint-disable-next-line no-eval
          eval(code);
        } finally {
          console.log = originalConsoleLog;
          setOutput(logs);
        }
      } else {
        setOutput([`Unsupported language: ${language}`]);
      }
    } catch (err: any) {
      setOutput([`Error: ${err.message || String(err)}`]);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col w-full bg-[#0a0a0a] border border-gray-800 rounded-xl overflow-hidden mt-4 shadow-xl">
      <div className="flex items-center justify-between px-4 py-2 bg-[#111] border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-gray-200">Code Execution Environment ({language})</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={runCode}
            disabled={!isReady || isRunning}
            className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs rounded-md transition-colors"
          >
            {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
            {isReady ? 'Run Code' : 'Loading Engine...'}
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded-md text-gray-400">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <div className="p-4 bg-black min-h-[150px] max-h-[400px] font-mono text-sm text-green-400 overflow-y-auto">
        {output.length === 0 && !isRunning && (
          <span className="text-gray-600 italic">Ready. Click "Run Code" to execute {language} code in browser.</span>
        )}
        {output.map((line, i) => (
          <div key={i} className="min-h-[20px] whitespace-pre-wrap">{line}</div>
        ))}
      </div>
    </div>
  );
}

