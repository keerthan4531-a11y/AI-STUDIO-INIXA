import React, { useState, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown, Download, MonitorPlay, Sparkles, Image as ImageIcon, Quote, Maximize } from 'lucide-react';
import pptxgen from 'pptxgenjs';

interface GammaCard {
  layout: 'hero' | 'split_left' | 'split_right' | 'grid' | 'quote';
  title: string;
  subtitle?: string;
  content?: string;
  bullets?: string[];
  image_prompt?: string;
}

interface GammaDeck {
  theme?: string;
  cards: GammaCard[];
}

interface SlideDeckViewerProps {
  content: string; // The raw JSON string returned by DeepSeek
  title: string;
}

export function SlideDeckViewer({ content, title }: SlideDeckViewerProps) {
  const [deck, setDeck] = useState<GammaDeck | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      if (!content || content.includes('⚠️') || content.includes('❌')) {
        setDeck(null);
        return;
      }
      
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      const rawJson = jsonMatch ? jsonMatch[1] : content.replace(/```json|```/g, '');
      const parsed = JSON.parse(rawJson);
      
      // Handle fallback if AI just returns an array instead of the wrapper object
      if (Array.isArray(parsed)) {
        setDeck({ theme: 'default', cards: parsed });
      } else if (parsed.cards) {
        setDeck(parsed);
      } else {
        setDeck(null);
      }
    } catch (e) {
      setDeck(null);
    }
  }, [content]);

  // Convert image prompts to Pollinations URLs
  const getImageUrl = (prompt: string) => {
    if (!prompt) return '';
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;
  };

  const fetchImageAsBase64 = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error('Failed to fetch image for PPTX', e);
      return null;
    }
  };

  const handleDownloadPptx = async () => {
    if (!deck || deck.cards.length === 0) return;
    
    setIsExporting(true);
    try {
      const pptx = new pptxgen();
      pptx.author = 'Note-IX Gamma AI';
      pptx.title = title;
      pptx.layout = 'LAYOUT_16x9';
      
      // Simple dark theme
      pptx.defineSlideMaster({
        title: 'MASTER',
        background: { color: '0B1120' } // Very dark blue/slate
      });

      for (let i = 0; i < deck.cards.length; i++) {
        const card = deck.cards[i];
        const slide = pptx.addSlide({ masterName: 'MASTER' });
        
        // Background shape for depth
        slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: '0F172A' } });

        let base64Image: string | null = null;
        if (card.image_prompt) {
           base64Image = await fetchImageAsBase64(getImageUrl(card.image_prompt));
        }
        
        if (card.layout === 'hero') {
          if (base64Image) {
            slide.addImage({ data: base64Image, x: 0, y: 0, w: '100%', h: '100%', sizing: { type: 'cover', w: '100%', h: '100%' } });
            // Dark overlay for text readability
            slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: '000000', transparency: 60 } });
          }
          slide.addText(card.title, { x: '10%', y: '40%', w: '80%', h: 1, fontSize: 54, color: 'FFFFFF', bold: true, align: 'center', shadow: { type: 'outer', color: '000000', blur: 10, offset: 5, angle: 45 } });
          if (card.subtitle) slide.addText(card.subtitle, { x: '10%', y: '55%', w: '80%', h: 0.5, fontSize: 28, color: '38BDF8', align: 'center' });
        
        } else if (card.layout === 'split_left' || card.layout === 'split_right') {
          const isLeftText = card.layout === 'split_left';
          const textX = isLeftText ? '50%' : '5%';
          const imgX = isLeftText ? 0 : '50%';
          
          if (base64Image) {
            slide.addImage({ data: base64Image, x: imgX, y: 0, w: '50%', h: '100%', sizing: { type: 'cover', w: '50%', h: '100%' } });
          } else {
             slide.addShape(pptx.ShapeType.rect, { x: imgX, y: 0, w: '50%', h: '100%', fill: { color: '1E293B' } });
          }

          slide.addText(card.title, { x: textX, y: '20%', w: '45%', h: 1, fontSize: 40, color: 'FFFFFF', bold: true });
          if (card.subtitle) slide.addText(card.subtitle, { x: textX, y: '35%', w: '45%', h: 0.5, fontSize: 22, color: '06B6D4', bold: true });
          if (card.content) slide.addText(card.content, { x: textX, y: '45%', w: '45%', h: 3, fontSize: 18, color: 'CBD5E1' });
          
          if (card.bullets && card.bullets.length > 0) {
            const startY = card.content ? 60 : 45;
            slide.addText(card.bullets.map(b => ({ text: b, options: { bullet: true, color: 'F8FAFC', fontSize: 18 } })), { x: textX, y: `${startY}%`, w: '45%', h: 2, valign: 'top' });
          }
        
        } else if (card.layout === 'quote') {
          slide.addShape(pptx.ShapeType.rect, { x: '10%', y: '10%', w: '80%', h: '80%', fill: { color: '1E1B4B' }, line: { color: '38BDF8', width: 2 } });
          slide.addText('"', { x: '15%', y: '15%', w: '10%', h: 1, fontSize: 80, color: '38BDF8', bold: true });
          slide.addText(card.title, { x: '15%', y: '35%', w: '70%', h: 2, fontSize: 40, color: 'FFFFFF', italic: true, align: 'center' });
          if (card.subtitle) slide.addText(`— ${card.subtitle}`, { x: '15%', y: '65%', w: '70%', h: 0.5, fontSize: 24, color: '94A3B8', align: 'center' });
        
        } else {
          // Grid / Fallback
          slide.addText(card.title, { x: '5%', y: '10%', w: '90%', h: 0.8, fontSize: 44, color: 'FFFFFF', bold: true });
          if (card.subtitle) slide.addText(card.subtitle, { x: '5%', y: '20%', w: '90%', h: 0.5, fontSize: 24, color: '94A3B8' });
          
          if (card.bullets && card.bullets.length > 0) {
            // Layout bullets into a nice grid instead of basic list
            const cols = card.bullets.length > 3 ? 2 : 1;
            const w = cols === 2 ? '42%' : '90%';
            
            card.bullets.forEach((b, idx) => {
              const col = idx % cols;
              const row = Math.floor(idx / cols);
              const xPos = col === 0 ? 5 : 50;
              const yPos = 30 + (row * 20);
              
              slide.addShape(pptx.ShapeType.rect, { x: `${xPos}%`, y: `${yPos}%`, w, h: '15%', fill: { color: '1E293B' } });
              slide.addText(`•  ${b}`, { x: `${xPos + 2}%`, y: `${yPos}%`, w: `${parseInt(w)-4}%`, h: '15%', fontSize: 20, color: 'F1F5F9', valign: 'middle' });
            });
          }
        }
      }

      await pptx.writeFile({ fileName: `${title.replace(/\s+/g, '_')}_Gamma.pptx` });
    } catch (error) {
      console.error(error);
      alert('Failed to export PPTX');
    } finally {
      setIsExporting(false);
    }
  };

  if (!deck || deck.cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center bg-[#020617] border border-red-500/20 rounded-3xl overflow-hidden shadow-2xl h-[400px] p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <span className="text-2xl">⚠️</span>
        </div>
        <h3 className="text-red-400 font-bold mb-2">Failed to generate presentation</h3>
        <p className="text-white/60 text-sm max-w-md">{content}</p>
      </div>
    );
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const scrollPos = el.scrollTop;
    const cardHeight = el.clientHeight;
    const index = Math.round(scrollPos / cardHeight);
    if (index !== currentSlide) setCurrentSlide(index);
  };

  const scrollToSlide = (index: number) => {
    const el = document.getElementById(`gamma-card-${index}`);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div ref={containerRef} className="flex flex-col bg-[#020617] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative h-[600px] w-full">
      
      {/* Top Toolbar */}
      <div className="flex items-center justify-between p-4 bg-white/[0.02] border-b border-white/5 backdrop-blur-xl absolute top-0 w-full z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)]">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-[10px] font-black text-cyan-400 tracking-widest uppercase">Gamma View</span>
            <h3 className="text-sm font-bold text-white leading-tight">{title}</h3>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleFullScreen}
            className="flex items-center justify-center bg-white/5 hover:bg-white/10 w-8 h-8 rounded-xl transition-all"
            title="Full Screen"
          >
            <Maximize className="w-3.5 h-3.5 text-white/70" />
          </button>
          <button 
            onClick={handleDownloadPptx}
            disabled={isExporting}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 px-4 py-2 rounded-xl text-xs font-bold text-white uppercase tracking-wider transition-all"
          >
            <Download className={`w-3 h-3 ${isExporting ? 'animate-bounce' : ''}`} />
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>

      {/* Vertical Infinite Scrolling Canvas */}
      <div 
        className="flex-1 overflow-y-auto overflow-x-hidden snap-y snap-mandatory scroll-smooth pt-[72px]"
        onScroll={handleScroll}
      >
        {deck.cards.map((card, idx) => (
          <div 
            key={idx} 
            id={`gamma-card-${idx}`}
            className="w-full h-[calc(100%-72px)] snap-start snap-always relative flex flex-col items-center justify-center p-8 lg:p-16"
          >
            {/* Card Background / Base Styling */}
            <div className="absolute inset-4 rounded-3xl bg-gradient-to-br from-[#0f172a] to-[#1e1b4b] border border-white/5 overflow-hidden shadow-2xl">
              
              {/* Dynamic Layout Rendering */}
              
              {/* 1. HERO LAYOUT */}
              {card.layout === 'hero' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12">
                  {card.image_prompt && (
                    <div className="absolute inset-0 opacity-40 mix-blend-overlay">
                      <img src={getImageUrl(card.image_prompt)} className="w-full h-full object-cover" alt="" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent" />
                    </div>
                  )}
                  <h1 className="text-5xl lg:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-500 mb-6 drop-shadow-2xl relative z-10 leading-tight">
                    {card.title}
                  </h1>
                  {card.subtitle && <p className="text-xl lg:text-2xl text-cyan-100/70 font-medium relative z-10 max-w-3xl mx-auto">{card.subtitle}</p>}
                </div>
              )}

              {/* 2. SPLIT LAYOUTS (Left or Right) */}
              {(card.layout === 'split_left' || card.layout === 'split_right') && (
                <div className={`absolute inset-0 flex ${card.layout === 'split_right' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className="flex-1 p-12 lg:p-16 flex flex-col justify-center">
                    <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">{card.title}</h2>
                    {card.subtitle && <h3 className="text-xl text-cyan-400 mb-6 font-semibold">{card.subtitle}</h3>}
                    {card.content && <p className="text-lg text-slate-300 leading-relaxed mb-8">{card.content}</p>}
                    
                    {card.bullets && card.bullets.length > 0 && (
                      <div className="space-y-4">
                        {card.bullets.map((b, i) => (
                          <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] transition-colors">
                            <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">{i+1}</div>
                            <p className="text-slate-200">{b}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 relative bg-slate-900 border-l border-white/5">
                    {card.image_prompt ? (
                      <img src={getImageUrl(card.image_prompt)} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-20">
                        <ImageIcon className="w-24 h-24 text-white" />
                      </div>
                    )}
                    {/* Inner shadow for blend */}
                    <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(15,23,42,1)]" />
                  </div>
                </div>
              )}

              {/* 3. GRID LAYOUT */}
              {(card.layout === 'grid' || (!['hero','split_left','split_right','quote'].includes(card.layout))) && (
                <div className="absolute inset-0 p-12 lg:p-16 flex flex-col">
                  <div className="text-center mb-12">
                    <h2 className="text-4xl font-bold text-white mb-4">{card.title}</h2>
                    {card.subtitle && <p className="text-xl text-slate-400">{card.subtitle}</p>}
                  </div>
                  <div className={`grid gap-6 flex-1 ${card.bullets && card.bullets.length > 3 ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
                    {card.bullets?.map((b, i) => (
                      <div key={i} className="bg-white/[0.03] border border-white/[0.05] rounded-3xl p-8 flex flex-col gap-4 relative overflow-hidden group hover:bg-white/[0.06] transition-all">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-[50px] group-hover:bg-cyan-500/20 transition-all" />
                        <h4 className="text-cyan-400 font-bold text-lg tracking-wide uppercase">Point {i+1}</h4>
                        <p className="text-xl text-white font-medium leading-relaxed">{b}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. QUOTE LAYOUT */}
              {card.layout === 'quote' && (
                <div className="absolute inset-0 p-12 flex flex-col items-center justify-center text-center bg-gradient-to-b from-[#1e1b4b] to-[#0f172a]">
                  <Quote className="w-24 h-24 text-cyan-500/30 mb-8" />
                  <h2 className="text-4xl lg:text-6xl font-serif italic text-white leading-tight max-w-4xl mx-auto drop-shadow-lg">"{card.title}"</h2>
                  {(card.subtitle || card.content) && (
                    <div className="mt-8 flex items-center gap-4">
                      <div className="w-12 h-[1px] bg-cyan-500" />
                      <p className="text-xl font-bold text-cyan-400 uppercase tracking-widest">{card.subtitle || card.content}</p>
                      <div className="w-12 h-[1px] bg-cyan-500" />
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        ))}
      </div>

      {/* Fixed Vertical Navigation Dots */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-50 bg-black/40 backdrop-blur-md p-2 rounded-full border border-white/10">
        <button 
          onClick={() => scrollToSlide(Math.max(0, currentSlide - 1))}
          className="p-1 text-white/40 hover:text-white transition-colors"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        {deck.cards.map((_, i) => (
          <button 
            key={i}
            onClick={() => scrollToSlide(i)}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 mx-auto ${currentSlide === i ? 'bg-cyan-400 h-6 shadow-[0_0_10px_rgba(34,211,238,0.8)]' : 'bg-white/20 hover:bg-white/40'}`}
          />
        ))}
        <button 
          onClick={() => scrollToSlide(Math.min(deck.cards.length - 1, currentSlide + 1))}
          className="p-1 text-white/40 hover:text-white transition-colors"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
