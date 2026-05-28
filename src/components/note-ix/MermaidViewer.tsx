import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Network, Download, Maximize, ZoomIn, ZoomOut } from 'lucide-react';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'inherit',
  themeVariables: {
    primaryColor: '#1e1b4b',
    primaryBorderColor: '#38bdf8',
    primaryTextColor: '#fff',
    lineColor: '#06b6d4',
    secondaryColor: '#0f172a',
    tertiaryColor: '#1e293b'
  }
});

export function MermaidViewer({ content, title }: { content: string, title?: string }) {
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    const renderChart = async () => {
      try {
        // Clean markdown backticks if AI included them
        const cleanText = content.replace(/```mermaid/gi, '').replace(/```/g, '').trim();
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, cleanText);
        
        if (isMounted) {
          setSvgContent(svg);
          setError(false);
        }
      } catch (err) {
        console.error("Mermaid render error:", err);
        if (isMounted) setError(true);
      }
    };
    renderChart();
    return () => { isMounted = false; };
  }, [content]);

  if (error) {
     return <div className="p-4 bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20 text-sm">⚠️ Failed to generate visual map. The AI may have generated invalid syntax.</div>;
  }

  return (
    <div className="w-full relative bg-[#020617] rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col h-[500px]">
      
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 bg-white/[0.02] border-b border-white/5 backdrop-blur-xl absolute top-0 w-full z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(192,38,211,0.5)]">
            <Network className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-[10px] font-black text-fuchsia-400 tracking-widest uppercase">Semantic Map</span>
            <h3 className="text-sm font-bold text-white leading-tight">{title || "Knowledge Graph"}</h3>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div 
        ref={containerRef}
        className="flex-1 w-full h-full pt-[72px] overflow-auto flex items-center justify-center p-8 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#020617] to-[#020617]"
      >
        {svgContent ? (
          <div 
            className="mermaid-container w-full h-full flex items-center justify-center [&>svg]:max-w-none [&>svg]:w-auto [&>svg]:h-full"
            dangerouslySetInnerHTML={{ __html: svgContent }} 
          />
        ) : (
          <div className="flex flex-col items-center gap-4 animate-pulse">
            <Network className="w-8 h-8 text-fuchsia-500/50" />
            <div className="text-white/50 text-sm font-medium">Generating visualization...</div>
          </div>
        )}
      </div>

    </div>
  );
}
