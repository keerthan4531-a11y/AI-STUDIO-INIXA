"use client";
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Play, Copy, Download, Trash2, Loader2, Code, 
  FileCode, Eye, Settings2, ChevronDown, Zap, Cpu, Bot, X,
  AlertCircle, CheckCircle2, RefreshCw, FileJson, Layers
} from 'lucide-react';
import { quickVibe, type QuickVibeResult } from '../../api/vibeEngine';
import { VIBE_CODING_MODELS, getVibeModel, setVibeModel } from '../../api/vibeEngine';
import type { AIModel } from '../../api/aiEngine';
import { aiGenerateImageWithProgress } from '../../api/aiEngine';

interface QuickVibeProps {
  initialPrompt?: string;
}

// Example prompts matching Google AI Studio style
const EXAMPLE_PROMPTS = [
  'Build a modern SaaS landing page with gradient hero and glassmorphism cards',
  'Create a beautiful todo app with drag and drop',
  'Build a real-time stock ticker dashboard with charts',
  'Make a cyberpunk-style calculator',
  'Create an animated particle background',
  'Build a REST API with Express and JWT auth',
];

export function QuickVibeStudio({ initialPrompt }: QuickVibeProps) {
  const [prompt, setPrompt] = useState(initialPrompt || '');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<QuickVibeResult | null>(null);
  const [streamedCode, setStreamedCode] = useState('');
  const [selectedModel, setSelectedModel] = useState<AIModel>(getVibeModel());
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [generationStep, setGenerationStep] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [streamedCode, generationStep]);

  useEffect(() => {
    if (initialPrompt) {
      handleGenerate();
    }
  }, [initialPrompt]);

  const handleGenerate = async () => {
    if (!prompt.trim() || isLoading) return;
    
    setIsLoading(true);
    setError(null);
    setStreamedCode('');
    setResult(null);
    setGenerationStep('Initializing AI model...');

    try {
      const model = selectedModel.id === 'auto' 
        ? VIBE_CODING_MODELS.find(m => m.id.includes('gpt4o') || m.id.includes('claude')) || selectedModel
        : selectedModel;

      setGenerationStep('Generating code with ' + model.label + '...');

      const response = await quickVibe(prompt, model, (chunk) => {
        setStreamedCode(chunk);
      });

      if (response.success) {
        setResult(response);
        setStreamedCode(response.code || '');
        
        // Auto-preview for HTML files
        if (response.fileName?.endsWith('.html')) {
          setPreviewHtml(response.code || '');
        }
      } else {
        setError(response.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate code');
    } finally {
      setIsLoading(false);
      setGenerationStep('');
    }
  };

  const handleCopy = () => {
    if (streamedCode) {
      navigator.clipboard.writeText(streamedCode);
    }
  };

  const handleDownload = () => {
    if (result?.fileName && streamedCode) {
      const blob = new Blob([streamedCode], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleRunPreview = () => {
    if (previewHtml) {
      setShowPreview(true);
    } else if (streamedCode && result?.fileName?.endsWith('.html')) {
      setPreviewHtml(streamedCode);
      setShowPreview(true);
    }
  };

  const handleModelChange = (model: AIModel) => {
    setSelectedModel(model);
    setVibeModel(model.id);
    setShowModelPicker(false);
  };

  return (
    <div className="quick-vibe-studio">
      {/* Header */}
      <div className="quick-vibe-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <Zap size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Quick Vibe</h1>
            <p className="text-xs text-white/40 font-medium">AI Code Generator</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Model Picker */}
          <div className="relative">
            <button 
              onClick={() => setShowModelPicker(!showModelPicker)}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
            >
              <Cpu size={14} className="text-violet-400" />
              <span className="text-sm text-white">{selectedModel.label}</span>
              <ChevronDown size={12} className="text-white/40" />
            </button>
            
            <AnimatePresence>
              {showModelPicker && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 top-full mt-2 w-64 bg-[#0a0a0f] border border-white/10 rounded-xl overflow-hidden shadow-xl z-50"
                >
                  <div className="p-2 max-h-64 overflow-y-auto">
                    {VIBE_CODING_MODELS.filter(m => 
                      m.id.includes('gpt') || m.id.includes('claude') || m.id.includes('gemini')
                    ).map(m => (
                      <button
                        key={m.id}
                        onClick={() => handleModelChange(m)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                          selectedModel.id === m.id 
                            ? 'bg-violet-500/20 text-white' 
                            : 'text-white/60 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{m.label}</span>
                          {m.badge && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold bg-white/10 ${m.badgeColor === 'violet' ? 'text-violet-400' : m.badgeColor === 'pink' ? 'text-pink-400' : m.badgeColor === 'red' ? 'text-red-400' : 'text-blue-400'}`}>
                              {m.badge}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Main Input Area */}
      <div className="quick-vibe-input-area">
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe what you want to build... (e.g., 'Build a modern login page with cyberpunk theme')"
            className="quick-vibe-input"
            disabled={isLoading}
          />
          
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isLoading}
            className="quick-vibe-generate-btn"
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <Sparkles size={18} />
                Generate
              </>
            )}
          </button>
        </div>

        {/* Status */}
        {isLoading && (
          <div className="flex items-center gap-2 mt-3 text-xs text-white/40">
            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            <span>{generationStep || 'Generating...'}</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 mt-3 text-xs text-red-400">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Example Prompts */}
      {!prompt && !isLoading && !result && (
        <div className="quick-vibe-examples">
          <p className="text-xs text-white/30 mb-3">Try these:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((ex, i) => (
              <button
                key={i}
                onClick={() => setPrompt(ex)}
                className="quick-vibe-example-chip"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Result Area */}
      <AnimatePresence>
        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="quick-vibe-result"
          >
            {/* File Info */}
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <FileCode size={18} className="text-violet-400" />
                <div>
                  <div className="text-sm font-semibold text-white">{result.fileName || 'Generated Code'}</div>
                  <div className="text-xs text-white/40">{result.language || 'code'}</div>
                </div>
                {result.success && (
                  <span className="flex items-center gap-1 text-xs text-green-400 ml-2">
                    <CheckCircle2 size={12} /> Generated
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button onClick={handleCopy} className="quick-vibe-action-btn">
                  <Copy size={14} /> Copy
                </button>
                <button onClick={handleDownload} className="quick-vibe-action-btn">
                  <Download size={14} /> Download
                </button>
                {previewHtml && (
                  <button onClick={handleRunPreview} className="quick-vibe-action-btn primary">
                    <Eye size={14} /> Preview
                  </button>
                )}
              </div>
            </div>

            {/* Code Display */}
            <div className="quick-vibe-code-area" ref={codeRef}>
              <pre className="quick-vibe-code">
                <code>{streamedCode || result.code || '// No code generated'}</code>
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="quick-vibe-preview-overlay"
            onClick={() => setShowPreview(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="quick-vibe-preview-modal"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Eye size={16} className="text-violet-400" />
                  <span className="font-semibold">Preview</span>
                </div>
                <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-white/10 rounded-lg">
                  <X size={16} />
                </button>
              </div>
              <iframe 
                srcDoc={previewHtml}
                className="quick-vibe-preview-iframe"
                sandbox="allow-scripts"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
