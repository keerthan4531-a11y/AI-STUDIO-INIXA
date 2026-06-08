import React from 'react';

interface TokenHistoryItem {
  timestamp: number;
  tokens: number;
}

interface TokenGraphProps {
  data: TokenHistoryItem[];
}

export default function TokenGraph({ data }: TokenGraphProps) {
  // Ensure we have 60 items for a full hour, padded with empty items if needed
  const paddedData = [...data];
  while (paddedData.length < 60) {
    paddedData.unshift({ timestamp: 0, tokens: 0 });
  }
  // Only keep the last 60
  const chartData = paddedData.slice(-60);

  const maxTokens = Math.max(...chartData.map((d) => d.tokens), 10); // Minimum scale of 10

  return (
    <div className="w-full h-64 bg-gray-900 rounded-lg p-4 border border-gray-800 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          Live Token Usage (Last 60 mins)
        </h3>
        <span className="text-xs text-gray-400">Max: {maxTokens} tokens/min</span>
      </div>
      
      <div className="flex-1 flex items-end justify-between gap-1 overflow-hidden relative border-b border-l border-gray-700 pb-1 pl-1">
        {chartData.map((item, index) => {
          const heightPct = (item.tokens / maxTokens) * 100;
          return (
            <div 
              key={index} 
              className="w-full flex-1 bg-violet-500 hover:bg-violet-400 transition-all rounded-t-sm"
              style={{ height: `${Math.max(heightPct, 1)}%`, opacity: item.timestamp === 0 ? 0 : 1 }}
              title={`Tokens: ${item.tokens}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>-60 min</span>
        <span>Now</span>
      </div>
    </div>
  );
}
