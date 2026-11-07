'use client';

import React, { useState } from 'react';
import { 
  Globe, 
  Terminal, 
  FileText, 
  BarChart, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ChevronDown, 
  ChevronRight, 
  BrainCircuit, 
  Sparkles,
  Zap,
  Code
} from 'lucide-react';
import { AgentStep, AgentArtifact } from '@/lib/mcp/types';

interface AgentTimelineProps {
  steps: AgentStep[];
  artifacts?: AgentArtifact[];
  isStreaming?: boolean;
}

export const AgentTimeline: React.FC<AgentTimelineProps> = ({ 
  steps, 
  artifacts = [], 
  isStreaming = false 
}) => {
  const [expandedStepIds, setExpandedStepIds] = useState<Record<string, boolean>>({});

  const toggleStep = (id: string) => {
    setExpandedStepIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getToolIcon = (toolName?: string, type?: string) => {
    if (type === 'thought') return <BrainCircuit className="w-4 h-4 text-purple-400" />;
    if (type === 'answer') return <Sparkles className="w-4 h-4 text-emerald-400" />;
    
    switch (toolName) {
      case 'web_search':
        return <Globe className="w-4 h-4 text-blue-400" />;
      case 'code_interpreter':
        return <Terminal className="w-4 h-4 text-amber-400" />;
      case 'fetch_web_page':
        return <FileText className="w-4 h-4 text-indigo-400" />;
      case 'data_visualizer':
        return <BarChart className="w-4 h-4 text-pink-400" />;
      case 'file_generator':
        return <Download className="w-4 h-4 text-emerald-400" />;
      default:
        return <Zap className="w-4 h-4 text-cyan-400" />;
    }
  };

  if (!steps || steps.length === 0) {
    if (isStreaming) {
      return (
        <div className="flex items-center gap-2.5 py-2 px-3.5 mb-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-mono animate-pulse">
          <BrainCircuit className="w-4 h-4 animate-spin" />
          <span>Agent is planning task execution with MCP tools...</span>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="space-y-2 mb-4 w-full">
      {/* Header Badge */}
      <div className="flex items-center justify-between px-1 text-[11px] font-semibold tracking-wider text-white/50 uppercase">
        <div className="flex items-center gap-1.5">
          <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
          <span>Autonomous Agent Reasoning Chain</span>
        </div>
        <span className="text-[10px] text-white/40">{steps.length} Steps</span>
      </div>

      {/* Steps List */}
      <div className="space-y-1.5 border-l-2 border-purple-500/30 pl-3 ml-2">
        {steps.map((step, idx) => {
          const isExpanded = expandedStepIds[step.id] ?? false;
          const hasDetails = step.content || step.toolArgs || step.toolResult;

          return (
            <div 
              key={step.id || idx} 
              className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-md overflow-hidden transition-all duration-200 hover:border-white/20"
            >
              {/* Step Header */}
              <div 
                onClick={() => hasDetails && toggleStep(step.id)}
                className={`flex items-center justify-between p-2.5 cursor-pointer select-none text-xs ${hasDetails ? 'hover:bg-white/5' : ''}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1 rounded-lg bg-white/5 border border-white/10 flex-shrink-0">
                    {getToolIcon(step.toolName, step.type)}
                  </div>
                  <span className="font-medium text-white/90 truncate">
                    {step.title}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  {step.durationMs !== undefined && (
                    <span className="text-[10px] text-white/40 font-mono">
                      {step.durationMs}ms
                    </span>
                  )}

                  {step.status === 'running' && (
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  )}
                  {step.status === 'completed' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  {step.status === 'failed' && (
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  )}

                  {hasDetails && (
                    isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-white/40" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-white/40" />
                    )
                  )}
                </div>
              </div>

              {/* Step Expanded Content */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-white/5 text-xs font-mono space-y-2 bg-black/60">
                  {step.content && (
                    <div className="text-white/80 leading-relaxed whitespace-pre-wrap font-sans text-xs bg-white/5 p-2 rounded-lg border border-white/5">
                      {step.content}
                    </div>
                  )}

                  {step.toolArgs && Object.keys(step.toolArgs).length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold text-white/40 uppercase mb-1">Tool Input Arguments</div>
                      <pre className="p-2 rounded bg-black/80 border border-white/10 overflow-x-auto text-amber-300 text-[11px]">
                        {JSON.stringify(step.toolArgs, null, 2)}
                      </pre>
                    </div>
                  )}

                  {step.toolResult && (
                    <div>
                      <div className="text-[10px] font-bold text-white/40 uppercase mb-1">Tool Observation Output</div>
                      <pre className="p-2 rounded bg-black/80 border border-white/10 overflow-x-auto text-emerald-300 text-[11px] max-h-48 overflow-y-auto">
                        {JSON.stringify(step.toolResult, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Artifacts Box if any files or charts were generated */}
      {artifacts.length > 0 && (
        <div className="mt-3 p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
          <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" />
            <span>Generated Artifacts ({artifacts.length})</span>
          </div>
          <div className="space-y-1.5">
            {artifacts.map((art) => (
              <div 
                key={art.id}
                className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-emerald-500/20 text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-white/90 font-medium truncate">{art.title}</span>
                </div>
                <button
                  onClick={() => {
                    const blob = new Blob([art.content], { type: 'text/plain;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = art.title || 'artifact.txt';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-medium transition-colors"
                >
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
