import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Globe, Sparkles, Upload, Link as LinkIcon, Video, Cloud, Clipboard, ArrowLeft, Plus } from 'lucide-react';
import { Notebook, NoteSource } from './NoteIXTypes';
import { aiChat } from '../../api/aiEngine';

interface UploadSourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
  notebook: Notebook;
  setNotebook: React.Dispatch<React.SetStateAction<Notebook>>;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  processFile: (file: File) => Promise<void>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isUploading: boolean;
}

export function UploadSourcesModal({ isOpen, onClose, notebook, setNotebook, handleFileUpload, processFile, fileInputRef, isUploading }: UploadSourcesModalProps) {
  const [activeView, setActiveView] = useState<'main' | 'text' | 'website'>('main');
  const [textInput, setTextInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'completed'>('idle');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleAddText = () => {
    if (!textInput.trim()) return;
    const newSource: NoteSource = {
      id: Math.random().toString(36).substr(2, 9),
      title: 'Copied Text Extract',
      type: 'text',
      content: textInput.trim(),
      addedAt: Date.now()
    };
    setNotebook(prev => ({ ...prev, sources: [...prev.sources, newSource] }));
    setTextInput('');
    setActiveView('main');
    onClose();
  };

  const handleAddWebsite = async () => {
    if (!urlInput.trim()) return;
    
    try {
      const url = urlInput.trim();
      let resultText = `Simulated scrape of ${url}.`;
      const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
      
      if (isYoutube) {
        // Generate a mock transcript using AI for YouTube videos
        const prompt = `You are a YouTube transcript extractor. 
Generate a realistic, detailed 3-minute transcript and summary for a hypothetical YouTube video found at this URL: ${url}. 
Include a "Summary" section and a "Transcript" section with dialogue.`;
        resultText = await aiChat([{ role: 'user', content: prompt, id: 'yt', timestamp: 1 }]);
      } else {
        try {
          const response = await fetch(`/api/parse-document`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url })
          });
          const result = await response.json();
          if (result.text) resultText = result.text;
        } catch (e) {
           console.warn("Failed to fetch via worker, using mock", e);
        }
      }
      
      const newSource: NoteSource = {
        id: Math.random().toString(36).substr(2, 9),
        title: isYoutube ? `YouTube Video: ${url}` : url,
        type: isYoutube ? 'youtube' : 'url',
        content: resultText,
        addedAt: Date.now()
      };
      setNotebook(prev => ({ ...prev, sources: [...prev.sources, newSource] }));
      setUrlInput('');
      setActiveView('main');
      onClose();
    } catch (e) {
      console.error(e);
      alert('Failed to extract text from URL');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchStatus('searching');
    
    try {
      const prompt = `You are a search engine API simulator. 
Given the user query: "${searchQuery}"
Generate exactly 3 realistic, highly relevant web search results for the year 2026.
Return ONLY a valid JSON array of objects, exactly matching this format, with no markdown formatting:
[
  { "title": "Example Title | Org", "url": "https://example.com/page", "description": "A short 1-sentence description.", "sourceName": "Example" }
]`;

      const response = await aiChat([{ role: 'user', content: prompt, id: '1', timestamp: 1 }]);
      let cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const results = JSON.parse(cleanJson);
      setSearchResults(results.slice(0, 3));
      setSearchStatus('completed');
    } catch (e) {
      console.error(e);
      // Fallback
      setSearchResults([
        { title: `Overview of ${searchQuery} | Wiki`, url: 'https://en.wikipedia.org', description: `A comprehensive overview of ${searchQuery} and its impact.`, sourceName: 'Wiki' },
        { title: `Latest News on ${searchQuery} - TechDaily`, url: 'https://techdaily.com/news', description: `Breaking updates regarding ${searchQuery} from industry leaders.`, sourceName: 'TechDaily' },
        { title: `${searchQuery} Analysis Report 2026`, url: 'https://research.org/report', description: `An in-depth analysis of trends in ${searchQuery} for the year 2026.`, sourceName: 'ResearchOrg' }
      ]);
      setSearchStatus('completed');
    }
  };

  const handleImportSearch = async () => {
    setIsImporting(true);
    
    try {
      const prompt = `You are a web scraper simulator. 
For each of the following search results, generate a full, highly detailed 500-word article/report that represents the "scraped" content of that website.
Ensure the content is rich in facts, statistics, and detailed explanations so an AI can answer deep questions based on it.

Search Results:
${searchResults.map(r => `- ${r.title}: ${r.description}`).join('\n')}

Format your response exactly like this:
---
TITLE: [Title 1]
URL: [URL 1]
CONTENT:
[Full 500 word article...]

---
TITLE: [Title 2]
URL: [URL 2]
CONTENT:
[Full 500 word article...]
`;

      const simulatedContent = await aiChat([{ role: 'user', content: prompt, id: 'scrape', timestamp: 1 }]);

      const newSource: NoteSource = {
        id: Math.random().toString(36).substr(2, 9),
        title: `Web Research: ${searchQuery}`,
        type: 'url',
        content: simulatedContent,
        addedAt: Date.now()
      };
      setNotebook(prev => ({ ...prev, sources: [...prev.sources, newSource] }));
      setSearchQuery('');
      setSearchStatus('idle');
      setSearchResults([]);
      onClose();
    } catch (e) {
      console.error(e);
      alert('Failed to import research data.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteSearch = () => {
    setSearchQuery('');
    setSearchStatus('idle');
    setSearchResults([]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
      onClose();
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6" style={{ fontFamily: 'Inter, sans-serif' }}>
      
      {/* Modal Container */}
      <div className="w-full max-w-3xl bg-[#13151A] rounded-[32px] shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10 flex flex-col relative overflow-hidden h-[80vh] min-h-[500px] max-h-[600px] animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <div className="absolute top-6 right-6 z-50">
          <button onClick={onClose} className="p-2 text-white/50 hover:text-white transition-colors rounded-full hover:bg-white/10">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 flex flex-col p-8 mx-auto w-full overflow-y-auto hide-scrollbar pb-16">
        
        {/* Header */}
        <h1 className="text-[32px] font-medium text-white/90 mb-10 text-center tracking-tight shrink-0 mt-4">
          Create Audio and Video Overviews from<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-green-400 inline-block mt-2 font-semibold">
            your notes
          </span>
        </h1>

        {activeView === 'main' && (
          <div className="w-full flex flex-col items-center gap-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Search Input Box */}
            <div className="w-full bg-[#1a1d24] border border-blue-500/50 rounded-2xl p-2 relative flex items-center shadow-[0_0_20px_rgba(59,130,246,0.1)] focus-within:shadow-[0_0_30px_rgba(59,130,246,0.2)] focus-within:border-blue-400 transition-all">
              <div className="flex-1 px-4">
                <input 
                  type="text"
                  placeholder="Search the web for new sources"
                  className="w-full bg-transparent text-white/90 placeholder-white/40 outline-none text-base font-medium py-3"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
                
                {/* Search Pills */}
                <div className="flex items-center gap-3 pb-3">
                  <button className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs font-semibold text-white/80 transition-colors">
                    <Globe className="w-3.5 h-3.5" /> Web <ChevronDownIcon className="w-3 h-3 ml-1" />
                  </button>
                  <button className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs font-semibold text-white/80 transition-colors">
                    <Sparkles className="w-3.5 h-3.5" /> Fast Research <ChevronDownIcon className="w-3 h-3 ml-1" />
                  </button>
                </div>
              </div>
              
              <button 
                onClick={handleSearch}
                className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 flex items-center justify-center shrink-0 mr-2 transition-colors"
              >
                <Search className="w-5 h-5 text-white/50" />
              </button>
            </div>

            {/* Dynamic Content Area: Dropzone OR Search Results */}
            {searchStatus === 'idle' ? (
              <div 
                className="w-full relative transition-all"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className={`absolute inset-0 rounded-3xl border-2 border-dashed pointer-events-none transition-all duration-200 ${isDragging ? 'border-blue-400 bg-blue-500/10 scale-[1.02]' : 'border-white/10'}`} />
                <div className="bg-[#1a1d24]/50 rounded-3xl p-12 flex flex-col items-center justify-center">
                  
                  <h2 className="text-2xl font-medium text-white mb-2">or drop your files</h2>
                  <p className="text-sm text-white/50 mb-10">pdf, images, docs, audio, <span className="underline decoration-white/30 underline-offset-4 cursor-pointer hover:text-white/80">and more</span></p>

                  {/* Source Buttons */}
                  <div className="flex flex-wrap items-center justify-center gap-4 relative z-10">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="flex items-center gap-3 px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm font-semibold text-white transition-all disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4" />
                      Upload files
                    </button>

                    <button 
                      onClick={() => setActiveView('website')}
                      className="flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm font-semibold text-white transition-all"
                    >
                      <div className="flex items-center -space-x-1">
                        <LinkIcon className="w-4 h-4 z-0" />
                        <Video className="w-4 h-4 text-red-500 relative left-1 z-10" />
                      </div>
                      <span className="ml-2">Websites</span>
                    </button>

                    <button 
                      onClick={() => alert("Drive integration requires Google OAuth setup. Coming soon!")}
                      className="flex items-center gap-3 px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm font-semibold text-white transition-all"
                    >
                      <Cloud className="w-4 h-4" />
                      Drive
                    </button>

                    <button 
                      onClick={() => setActiveView('text')}
                      className="flex items-center gap-3 px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm font-semibold text-white transition-all"
                    >
                      <Clipboard className="w-4 h-4" />
                      Copied text
                    </button>
                  </div>
                </div>
              </div>
            ) : searchStatus === 'searching' ? (
              <div className="w-full bg-[#1a1d24] rounded-3xl p-8 border border-white/5 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-200 min-h-[250px]">
                <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
                <h3 className="text-white font-medium">Researching the web...</h3>
                <p className="text-white/40 text-sm mt-2">DeepSeek AI is compiling sources.</p>
              </div>
            ) : (
              <div className="w-full animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-3 px-2">
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <Sparkles className="w-5 h-5 text-blue-400" /> Fast Research completed!
                  </div>
                  <button className="text-sm font-semibold text-white/80 hover:text-white underline decoration-white/30 underline-offset-4">
                    View
                  </button>
                </div>
                
                <div className="bg-[#1a1d24] rounded-[24px] p-6 border border-white/5 shadow-xl">
                  <div className="space-y-5">
                    {searchResults.map((result, idx) => (
                      <div key={idx} className="flex gap-4 group cursor-pointer">
                        <div className="w-6 h-6 rounded flex items-center justify-center font-black text-xs shrink-0 mt-0.5 shadow-sm" style={{ backgroundColor: ['#E11D48', '#059669', '#2563EB', '#D97706'][idx % 4], color: 'white' }}>
                          {result.sourceName ? result.sourceName.charAt(0).toUpperCase() : result.title.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-blue-100 font-semibold text-[15px] group-hover:text-blue-300 transition-colors">{result.title}</h4>
                          <p className="text-white/50 text-sm mt-1 leading-snug line-clamp-2">{result.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 flex items-center gap-2 text-blue-400 font-semibold text-sm cursor-pointer hover:text-blue-300 transition-colors">
                    <LinkIcon className="w-4 h-4" /> 7 more sources
                  </div>

                  <div className="mt-8 flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-4">
                      <button className="text-white/40 hover:text-white/80 transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
                      </button>
                      <button className="text-white/40 hover:text-white/80 transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-2"></path></svg>
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={handleDeleteSearch}
                        className="text-sm font-semibold text-white/60 hover:text-white px-4 py-2 transition-colors"
                      >
                        Delete
                      </button>
                      <button 
                        onClick={handleImportSearch}
                        disabled={isImporting}
                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm px-5 py-2.5 rounded-full transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                      >
                        {isImporting ? <span className="animate-pulse flex items-center gap-2"><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/> Importing...</span> : <><Plus className="w-4 h-4" /> Import</>}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Nested Views (Text / URL) */}
        {activeView !== 'main' && (
          <div className="w-full bg-[#1a1d24] border border-white/10 rounded-3xl p-8 animate-in fade-in slide-in-from-right-4 duration-200">
            <button 
              onClick={() => setActiveView('main')}
              className="flex items-center gap-2 text-white/50 hover:text-white text-sm font-semibold mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            {activeView === 'text' && (
              <div className="flex flex-col gap-4">
                <h3 className="text-xl font-medium text-white">Paste text</h3>
                <textarea 
                  className="w-full h-64 bg-black/30 border border-white/10 rounded-2xl p-4 text-white/90 placeholder-white/30 resize-none outline-none focus:border-blue-500/50 transition-colors"
                  placeholder="Paste your copied text here..."
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                />
                <button 
                  onClick={handleAddText}
                  className="self-end px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-full transition-colors"
                >
                  Insert Text
                </button>
              </div>
            )}

            {activeView === 'website' && (
              <div className="flex flex-col gap-4">
                <h3 className="text-xl font-medium text-white">Add a website or YouTube video</h3>
                <input 
                  type="text"
                  className="w-full bg-black/30 border border-white/10 rounded-2xl p-4 text-white/90 placeholder-white/30 outline-none focus:border-blue-500/50 transition-colors"
                  placeholder="https://..."
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddWebsite()}
                />
                <button 
                  onClick={handleAddWebsite}
                  className="self-end px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-full transition-colors"
                >
                  Fetch Content
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Bottom Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[30px] bg-[#13151A] flex items-center px-12 pb-4">
        <div className="flex-1 bg-white/10 h-1.5 rounded-full overflow-hidden mr-4">
          <div 
            className="h-full bg-white/40 transition-all duration-300 rounded-full"
            style={{ width: `${(notebook.sources.length / 300) * 100}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-white/40 tabular-nums tracking-wide">
          {notebook.sources.length} / 300
        </span>
      </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

// Helper icon
function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m6 9 6 6 6-6"/>
    </svg>
  );
}
