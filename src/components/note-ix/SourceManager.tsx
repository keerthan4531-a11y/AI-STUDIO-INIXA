"use client";
import React, { useState } from 'react';
import { Notebook, NoteSource } from './NoteIXTypes';
import { Plus, FileText, Globe, Image as ImageIcon, Music, Video, Book } from 'lucide-react';
// Removed CF_WORKER_URL import
import { UploadSourcesModal } from './UploadSourcesModal';

export function SourceManager({ notebook, setNotebook }: { notebook: Notebook; setNotebook: React.Dispatch<React.SetStateAction<Notebook>> }) {
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        try {
          let parsedText = '';

          if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
            
            const pdfData = atob(base64Data);
            const uint8Array = new Uint8Array(pdfData.length);
            for (let i = 0; i < pdfData.length; i++) {
              uint8Array[i] = pdfData.charCodeAt(i);
            }
            
            const loadingTask = pdfjsLib.getDocument({ 
              data: uint8Array,
              cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
              cMapPacked: true,
              standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`
            });
            const pdf = await loadingTask.promise;
            
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              const pageText = textContent.items.map((item: any) => item.str).join(' ');
              parsedText += pageText + '\n\n';
            }
          } else if (file.name.endsWith('.docx') || file.type.includes('wordprocessingml.document')) {
            const mammoth = await import('mammoth');
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            parsedText = result.value;
          } else if (file.name.endsWith('.epub') || file.type === 'application/epub+zip') {
            const ePub = (await import('epubjs')).default;
            const book = ePub(await file.arrayBuffer());
            await book.ready;
            
            let fullText = '';
            // Safely extract text from spine items
            for (let i = 0; i < (book.spine as any).items.length; i++) {
               try {
                 const item = (book.spine as any).items[i];
                 const doc = await book.load(item.href);
                 if (doc && (doc as Document).body) {
                   fullText += (doc as Document).body.textContent + '\n\n';
                 }
               } catch (e) {
                 console.warn("Failed to parse EPUB chapter", e);
               }
            }
            parsedText = fullText;
          } else {
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await fetch(`/api/parse-document`, {
              method: 'POST',
              body: formData,
            });
            const result = await response.json();
            if (!result.ok) throw new Error(result.error || 'Parsing failed');
            parsedText = result.text;
          }

          if (!parsedText || !parsedText.trim()) {
            parsedText = "(The contents of this document could not be read. It may be a scanned image or contain no readable text layer.)";
          }
          const newSource: NoteSource = {
            id: Math.random().toString(36).substr(2, 9),
            title: file.name,
            type: file.name.endsWith('.pdf') ? 'pdf' : file.name.endsWith('.docx') ? 'docx' : file.name.endsWith('.epub') ? 'epub' : file.type.includes('image') ? 'image' : 'text',
            content: parsedText,
            addedAt: Date.now()
          };
          
          setNotebook(prev => ({ ...prev, sources: [...prev.sources, newSource] }));
        } catch (e) {
          console.error('Upload error:', e);
          alert('Failed to extract text from document. Please ensure it is a readable document.');
        } finally {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      
      reader.onerror = () => {
        alert('Failed to read file');
        setIsUploading(false);
      };
      
      reader.readAsDataURL(file);
    } catch (e) {
      console.error('File read error:', e);
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) await processFile(file);
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-4 h-4 text-rose-400" />;
      case 'docx': return <FileText className="w-4 h-4 text-blue-400" />;
      case 'epub': return <Book className="w-4 h-4 text-amber-500" />;
      case 'youtube': return <Video className="w-4 h-4 text-red-500" />;
      case 'url': return <Globe className="w-4 h-4 text-cyan-400" />;
      case 'image': return <ImageIcon className="w-4 h-4 text-emerald-400" />;
      case 'audio': return <Music className="w-4 h-4 text-amber-400" />;
      case 'video': return <Video className="w-4 h-4 text-fuchsia-400" />;
      case 'text': return <FileText className="w-4 h-4 text-slate-300" />;
      default: return <FileText className="w-4 h-4 text-slate-300" />;
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col h-full bg-transparent text-[#e3e3e3] relative z-10">
      <div className="px-6 py-5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.01]">
        <h2 className="text-sm font-black text-white tracking-widest uppercase flex items-center gap-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
          <Book className="w-4 h-4 text-fuchsia-400" />
          Sources
        </h2>
        <span className="text-[10px] font-black bg-white/10 px-2.5 py-0.5 rounded-full text-white/80 border border-white/10 shadow-[0_0_10px_rgba(255,255,255,0.1)]">{notebook.sources.length}</span>
      </div>

      <div className="p-5 border-b border-white/[0.08] bg-white/[0.01]">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          className="hidden" 
          accept=".pdf,.txt,.md,.png,.jpg,.jpeg" 
        />
        <button 
          onClick={() => setIsUploadModalOpen(true)}
          disabled={isUploading}
          className="w-full py-4 rounded-2xl border border-white/20 bg-white/[0.03] hover:bg-white/[0.08] hover:border-fuchsia-400/50 hover:shadow-[0_0_25px_rgba(192,38,211,0.2)] transition-all flex items-center justify-center gap-3 text-sm font-bold text-white/80 hover:text-white disabled:opacity-50 relative overflow-hidden group"
        >
          {/* Subtle button glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-500/0 via-fuchsia-500/10 to-fuchsia-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
          
          {isUploading ? (
            <span className="animate-pulse flex items-center gap-3 z-10">
              <div className="w-5 h-5 border-2 border-fuchsia-400 border-t-transparent rounded-full animate-spin" /> 
              Extracting AI Context...
            </span>
          ) : (
            <>
              <Plus className="w-5 h-5 text-fuchsia-400 group-hover:scale-110 transition-transform" /> 
              <span className="z-10 tracking-wide">Add Source</span>
            </>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-3 hide-scrollbar">
        {notebook.sources.length === 0 ? (
          <div className="text-center text-white/40 text-xs font-semibold py-12 px-4 leading-relaxed flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-2">
              <FileText className="w-5 h-5 text-white/30" />
            </div>
            Upload PDFs, images, or text documents to ground your AI.
          </div>
        ) : (
          notebook.sources.map(src => (
            <div key={src.id} className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:border-fuchsia-500/30 hover:bg-white/[0.08] hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all flex items-center gap-4 group cursor-pointer relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-fuchsia-500/0 group-hover:bg-fuchsia-500 transition-colors" />
              <div className="p-2.5 rounded-xl bg-white/10 border border-white/5 shrink-0 shadow-inner">
                {getSourceIcon(src.type)}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-black text-white/90 truncate group-hover:text-white transition-colors">{src.title}</p>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1 flex items-center gap-1">
                  {src.type} 
                  <span className="w-1 h-1 rounded-full bg-white/20 inline-block mx-1" /> 
                  {new Date(src.addedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <UploadSourcesModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
        notebook={notebook}
        setNotebook={setNotebook}
        handleFileUpload={handleFileUpload as any}
        processFile={processFile}
        fileInputRef={fileInputRef}
        isUploading={isUploading}
      />
    </div>
  );
}
