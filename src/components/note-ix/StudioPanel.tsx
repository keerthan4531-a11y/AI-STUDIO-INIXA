"use client";
import React, { useState } from 'react';
import { Notebook, StudioArtifact, NoteIXMessage } from './NoteIXTypes';
import { aiChat, type AIModel } from '../../api/aiEngine';
import { Sparkles, Headphones, Video, BookOpen, Layers, LineChart, MessageCircleQuestion, Network, FileDown, Mic, LayoutDashboard, GraduationCap, List, FileText, Book, Loader2, X, Globe } from 'lucide-react';
import { PodcastPlayer } from './PodcastPlayer';
import { SlideDeckViewer } from './SlideDeckViewer';
import { MessageContent } from '../MessageContent';

export function StudioPanel({ notebook, setNotebook, currentModel }: { notebook: Notebook; setNotebook: React.Dispatch<React.SetStateAction<Notebook>>; currentModel: AIModel; }) {
  const [activeTab, setActiveTab] = useState<'guides' | 'audio' | 'video' | 'visuals'>('guides');
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isGeneratingTool, setIsGeneratingTool] = useState<string | null>(null);
  
  const [researchQuery, setResearchQuery] = useState('');
  const [isResearching, setIsResearching] = useState(false);

  const handleDeepResearch = async () => {
    if (!researchQuery.trim()) return;
    setIsResearching(true);
    try {
      // 1. Generate search results based on query
      const searchPrompt = `Generate 3 realistic web search results for the query: "${researchQuery}". 
Format as JSON array with { "title": "...", "url": "https://...", "description": "..." }. Return ONLY JSON.`;
      const searchResponse = await aiChat([{ role: 'user', content: searchPrompt, id: 's', timestamp: 1 }]);
      let results = [];
      try {
        results = JSON.parse(searchResponse.replace(/```json/g, '').replace(/```/g, '').trim());
      } catch (e) {
        throw new Error("Failed to parse search results");
      }

      // 2. Scrape full content for those results
      const scrapePrompt = `You are a web scraper simulator. For each of the following search results, generate a full, highly detailed 500-word article/report that represents the "scraped" content of that website. Ensure the content is rich in facts and statistics.
Search Results:
${results.map((r: any) => `- ${r.title}: ${r.description}`).join('\n')}

Format your response exactly like this:
---
TITLE: [Title 1]
URL: [URL 1]
CONTENT:
[Full 500 word article...]
---
TITLE: [Title 2]
...`;
      const simulatedContent = await aiChat([{ role: 'user', content: scrapePrompt, id: 'scrape', timestamp: 1 }]);

      const newSource = {
        id: Math.random().toString(36).substr(2, 9),
        title: `Deep Research: ${researchQuery}`,
        type: 'url' as const,
        content: simulatedContent,
        addedAt: Date.now()
      };
      
      setNotebook(prev => ({ ...prev, sources: [...prev.sources, newSource] }));
      setResearchQuery('');
    } catch (e) {
      console.error(e);
      alert('Deep Research failed.');
    } finally {
      setIsResearching(false);
    }
  };

  const generateAudioOverview = async () => {
    setIsGeneratingAudio(true);
    try {
      const sourceTexts = notebook.sources.map((s, i) => `[Source ${i+1}: ${s.title}]\n${s.content}`).join('\n\n');
      const prompt = `You are an expert podcast producer. Based on the following sources, write a compelling, conversational 2-person podcast script (Host 1 and Host 2). The hosts should discuss the key themes, ask each other questions, and make it engaging.
      
Format your response as a JSON array of dialogue turns:
[
  { "host": "1", "text": "Welcome to our deep dive..." },
  { "host": "2", "text": "That's right! Today we're looking at..." }
]

Sources:
${sourceTexts}`;

      const response = await aiChat([{ role: 'user', content: prompt }], undefined, currentModel);
      
      const newArtifact = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'audio_overview' as const,
        title: 'Audio Overview (Podcast)',
        content: response,
        createdAt: Date.now()
      };
      
      setNotebook(prev => ({ ...prev, artifacts: [newArtifact, ...prev.artifacts] }));
      setActiveTab('audio');
    } catch (e) {
      console.error(e);
      alert('Failed to generate Audio Overview.');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const generateStudyTool = async (typeId: string, label: string) => {
    setIsGeneratingTool(typeId);
    try {
      const sourceTexts = notebook.sources.map((s, i) => `[Source ${i+1}: ${s.title}]\n${s.content}`).join('\n\n');
      
      let prompt = `Based on the following sources, generate a ${label}.\n\nSources:\n${sourceTexts}`;
      if (typeId === 'summary') prompt = `Write a comprehensive executive briefing document summarizing the key points from the following sources. Use markdown formatting.\n\nSources:\n${sourceTexts}`;
      if (typeId === 'faq') prompt = `Generate a list of Frequently Asked Questions (FAQ) with detailed answers based on the following sources. Use markdown formatting.\n\nSources:\n${sourceTexts}`;
      if (typeId === 'timeline') prompt = `Extract a chronological timeline of events, processes, or historical points from the following sources. Use markdown formatting.\n\nSources:\n${sourceTexts}`;
      if (typeId === 'study') prompt = `Create a comprehensive Study Guide from the following sources. Include key terms, concepts, and a quick summary. Use markdown formatting.\n\nSources:\n${sourceTexts}`;
      if (typeId === 'mind_map') prompt = `Generate a comprehensive mind map representing the core concepts and their relationships from the following sources. Output ONLY valid Mermaid.js 'graph TD' syntax. Do not wrap in markdown code blocks.`;
      if (typeId === 'flashcards') prompt = `Create an interactive flashcard deck from the following sources. Output ONLY a valid JSON array of objects with "q" (question) and "a" (answer). Do not wrap in markdown blocks. Generate at least 10 cards.`;
      if (typeId === 'slide_deck') prompt = `You are an expert Presentation Designer creating a modern, beautiful "Gamma.app" style presentation.
Based on the following sources, create a visually stunning presentation deck. Instead of boring bullet points, use fluid "cards" with rich layouts.

Format your response STRICTLY as a raw JSON object (without markdown blocks) matching this schema:
{
  "theme": "dark_cyberpunk",
  "cards": [
    {
      "layout": "hero", // or "split_left", "split_right", "grid", "quote"
      "title": "Main Title",
      "subtitle": "Optional subtitle",
      "content": "Paragraph text (used for split layouts)",
      "bullets": ["Point 1", "Point 2"], // Optional, used for grid/split
      "image_prompt": "A highly detailed, cinematic wide shot of a futuristic city..." // REQUIRED for hero and split layouts. Write a detailed DALL-E style prompt.
    }
  ]
}

Ensure you generate at least 5-8 highly engaging cards.
Sources:
${sourceTexts}`;

      const response = await aiChat([{ role: 'user', content: prompt }], undefined, currentModel);
      
      const typeMap: any = {
        'summary': 'briefing_doc',
        'faq': 'faq',
        'timeline': 'timeline',
        'study': 'study_guide',
        'slide_deck': 'slide_deck',
        'mind_map': 'mind_map',
        'flashcards': 'flashcards'
      };

      const newArtifact: StudioArtifact = {
        id: Math.random().toString(),
        type: typeMap[typeId],
        title: label,
        content: response,
        createdAt: Date.now()
      };

      setNotebook(prev => {
        const userMsg: NoteIXMessage = {
          id: Math.random().toString(),
          role: 'user',
          content: `Generate a ${label}`,
          timestamp: Date.now()
        };
        const aiMsg: NoteIXMessage = {
          id: Math.random().toString(),
          role: 'assistant',
          content: ['slide_deck', 'mind_map', 'flashcards'].includes(typeId) 
            ? `I have created the ${label}.` 
            : response,
          artifactId: ['slide_deck', 'mind_map', 'flashcards'].includes(typeId) ? newArtifact.id : undefined,
          timestamp: Date.now() + 1
        };

        return {
          ...prev,
          artifacts: [newArtifact, ...prev.artifacts],
          chatHistory: [...prev.chatHistory, userMsg, aiMsg]
        };
      });
      setActiveTab('guides');
    } catch (e) {
      console.error(e);
      alert(`Failed to generate ${label}.`);
    } finally {
      setIsGeneratingTool(null);
    }
  };

  const studioActions = [
    { id: 'audio_overview', label: 'Audio Overview', icon: Headphones, color: 'text-blue-400', tab: 'audio', desc: 'Podcast style discussion' },
    { id: 'video_overview', label: 'Video Overview', icon: Video, color: 'text-rose-400', tab: 'video', desc: 'Narrated visual explainer' },
    { id: 'study_guide', label: 'Study Guide', icon: BookOpen, color: 'text-emerald-400', tab: 'guides', desc: 'Summary & key terms' },
    { id: 'flashcards', label: 'Flashcards', icon: Layers, color: 'text-amber-400', tab: 'guides', desc: 'Interactive deck' },
    { id: 'quiz', label: 'Quiz', icon: MessageCircleQuestion, color: 'text-indigo-400', tab: 'guides', desc: 'Test your knowledge' },
    { id: 'mind_map', label: 'Mind Map', icon: Network, color: 'text-fuchsia-400', tab: 'visuals', desc: 'Concept semantic web' },
    { id: 'slide_deck', label: 'Slide Deck', icon: LineChart, color: 'text-cyan-400', tab: 'visuals', desc: 'Presentation slides' },
  ];

  return (
    <div className="flex-1 w-full flex flex-col h-full bg-transparent relative z-10">
      <div className="px-6 py-5 border-b border-white/[0.08] bg-white/[0.01] flex items-center justify-between backdrop-blur-md">
        <h2 className="text-sm font-black text-white tracking-widest uppercase flex items-center gap-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
          <Sparkles className="w-4 h-4 text-purple-400" />
          Studio
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 hide-scrollbar">
        {/* Audio Overview Section */}
        <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.08] rounded-3xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.3)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
            <Mic className="w-24 h-24 text-fuchsia-400" />
          </div>
          <h3 className="text-sm font-black text-white mb-1 tracking-wide relative z-10 flex items-center gap-2">
            Audio Overview
            <span className="text-[9px] font-black uppercase tracking-widest bg-fuchsia-500/20 text-fuchsia-300 px-2 py-0.5 rounded-full border border-fuchsia-500/30">Beta</span>
          </h3>
          <p className="text-xs text-white/50 mb-5 relative z-10 font-medium">Generate a deep-dive podcast discussion based on your sources.</p>
          
          <button 
            onClick={generateAudioOverview}
            disabled={isGeneratingAudio || notebook.sources.length === 0}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-white/5 disabled:to-white/5 disabled:text-white/20 disabled:shadow-none text-white transition-all flex items-center justify-center gap-3 text-sm font-bold shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:shadow-[0_0_30px_rgba(147,51,234,0.5)] border border-purple-400/30 disabled:border-white/5 relative overflow-hidden group/btn"
          >
            {/* Subtle button glow effect */}
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover/btn:opacity-100 transition-opacity" />

            {isGeneratingAudio ? (
              <span className="animate-pulse flex items-center gap-3 relative z-10">
                <div className="flex gap-1">
                  <div className="w-1 h-3 bg-white rounded-full animate-[bounce_1s_infinite]" />
                  <div className="w-1 h-4 bg-white rounded-full animate-[bounce_1s_infinite_0.1s]" />
                  <div className="w-1 h-2 bg-white rounded-full animate-[bounce_1s_infinite_0.2s]" />
                </div>
                Synthesizing Voices...
              </span>
            ) : (
              <>
                <Headphones className="w-5 h-5 relative z-10 group-hover/btn:scale-110 transition-transform" /> 
                <span className="relative z-10 tracking-wide">Generate Podcast</span>
              </>
            )}
          </button>
        </div>

        {/* Deep Research Section */}
        <div className="bg-gradient-to-br from-blue-900/20 to-cyan-900/10 border border-blue-500/20 rounded-3xl p-5 shadow-lg relative overflow-hidden">
          <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4" /> Live Deep Research
          </h3>
          <p className="text-xs text-white/50 mb-3 font-medium">Instantly scan the web and attach comprehensive research directly to your sources.</p>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={researchQuery}
              onChange={e => setResearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleDeepResearch()}
              disabled={isResearching}
              placeholder="e.g. Latest advancements in solid state batteries" 
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-blue-500/50"
            />
            <button 
              onClick={handleDeepResearch}
              disabled={!researchQuery.trim() || isResearching}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white p-2 rounded-xl transition-all"
            >
              {isResearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Suggested Actions */}
        <div className="space-y-3">
          <h3 className="text-xs font-black text-white/40 uppercase tracking-widest px-1">Study Tools</h3>
          
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'summary', icon: FileText, label: 'Briefing Doc', color: 'text-blue-400' },
              { id: 'faq', icon: List, label: 'FAQ', color: 'text-emerald-400' },
              { id: 'timeline', icon: LayoutDashboard, label: 'Timeline', color: 'text-amber-400' },
              { id: 'study', icon: GraduationCap, label: 'Study Guide', color: 'text-rose-400' },
              { id: 'slide_deck', icon: LineChart, label: 'Slide Deck', color: 'text-cyan-400' },
              { id: 'flashcards', label: 'Flashcards', icon: Layers, color: 'text-amber-400' },
              { id: 'mind_map', label: 'Mind Map', icon: Network, color: 'text-fuchsia-400' }
            ].map(action => (
              <button 
                key={action.id}
                onClick={() => generateStudyTool(action.id, action.label)}
                disabled={isGeneratingTool !== null || notebook.sources.length === 0}
                className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/20 hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all flex flex-col items-center justify-center gap-3 text-center disabled:opacity-30 group relative overflow-hidden"
              >
                {isGeneratingTool === action.id && (
                  <div className="absolute inset-0 bg-white/5 animate-pulse" />
                )}
                <div className="p-2.5 rounded-xl bg-white/5 group-hover:scale-110 transition-transform shadow-inner relative z-10">
                  {isGeneratingTool === action.id ? <Loader2 className={`w-5 h-5 ${action.color} animate-spin`} /> : <action.icon className={`w-5 h-5 ${action.color}`} />}
                </div>
                <span className="text-xs font-bold text-white/80 group-hover:text-white transition-colors relative z-10">{isGeneratingTool === action.id ? 'Generating...' : action.label}</span>
              </button>
            ))}
          </div>
        </div>
        {/* Artifacts List */}
        {notebook.artifacts.length > 0 && (
          <div className="mt-8 space-y-4">
            <h3 className="text-xs font-black text-white/40 uppercase tracking-widest px-1">Generated Artifacts</h3>
            <div className="space-y-4">
              {notebook.artifacts.filter(a => a.type !== 'slide_deck').map(artifact => (
                <div key={artifact.id} className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 hover:bg-white/[0.04] transition-colors relative group">
                  <button 
                    onClick={() => setNotebook(prev => ({ ...prev, artifacts: prev.artifacts.filter(a => a.id !== artifact.id) }))}
                    className="absolute top-4 right-4 text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="mb-4">
                    <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                      {artifact.type === 'audio_overview' ? <Headphones className="w-4 h-4 text-fuchsia-400" /> : <FileText className="w-4 h-4 text-blue-400" />}
                      {artifact.title}
                    </h4>
                    <span className="text-[10px] text-white/40 uppercase tracking-widest">{new Date(artifact.createdAt).toLocaleString()}</span>
                  </div>
                  
                  {artifact.type === 'audio_overview' ? (
                    <div className="h-[300px]">
                      <PodcastPlayer content={artifact.content} currentModel={currentModel} setNotebook={setNotebook} />
                    </div>
                  ) : artifact.type === 'slide_deck' ? (
                    <SlideDeckViewer content={artifact.content} title={artifact.title} />
                  ) : (
                    <div className="max-h-[400px] overflow-y-auto user-message-markdown bg-black/20 p-4 rounded-xl border border-white/5">
                      <MessageContent content={artifact.content} isCodex={false} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
