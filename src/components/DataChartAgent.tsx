"use client";
import React, { useRef, useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter, ComposedChart
} from 'recharts';
import { BarChart as ChartIcon, X } from 'lucide-react';

export interface ChartData {
  name: string;
  value?: number;
  [key: string]: any;
}

interface DataChartAgentProps {
  title: string;
  type: 'bar' | 'line' | 'pie' | 'scatter';
  data: ChartData[];
  dataKeys: string[];
  colors?: string[];
  onClose?: () => void;
}

const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

export function DataChartAgent({ title, type, data, dataKeys, colors = DEFAULT_COLORS, onClose }: DataChartAgentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setDimensions({ width, height });
      }
    });

    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
    };
  }, []);
  // Ensure dataKeys is an array
  const safeDataKeys = Array.isArray(dataKeys) ? dataKeys : (typeof dataKeys === 'string' ? [dataKeys] : []);
  
  // Try to find the X-axis key (the one that's not in dataKeys)
  // If data[0] exists, look for a key that isn't in safeDataKeys and isn't 'value' if value is in dataKeys
  let xAxisKey = 'name';
  if (data && data.length > 0) {
    const allKeys = Object.keys(data[0]);
    const potentialXKeys = allKeys.filter(k => !safeDataKeys.includes(k));
    if (potentialXKeys.length > 0) {
      xAxisKey = potentialXKeys[0];
    }
  }

  // Filter out dataKeys that contain non-numeric data to prevent empty charts
  const numericDataKeys = safeDataKeys.filter(key => {
    return data.some(item => typeof item[key] === 'number');
  });

  // If no numeric keys found, fallback to all safeDataKeys but this is a sign of bad data
  const finalDataKeys = numericDataKeys.length > 0 ? numericDataKeys : safeDataKeys;
  
  const renderChart = () => {
    if (!data || data.length === 0) {
      return <div className="text-white/40 text-center py-20">No data available to display</div>;
    }

    switch (type) {
      case 'bar':
        return (
          <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
            <XAxis dataKey={xAxisKey} stroke="#888" tick={{ fill: '#888', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} 
              itemStyle={{ color: '#fff', fontSize: '12px' }} 
            />
            <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '11px' }} />
            {finalDataKeys.map((key, i) => (
              <Bar key={key as string} dataKey={key as string} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        );
      case 'line':
        return (
          <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
            <XAxis dataKey={xAxisKey} stroke="#888" tick={{ fill: '#888', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} 
              itemStyle={{ color: '#fff', fontSize: '12px' }} 
            />
            <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '11px' }} />
            {finalDataKeys.map((key, i) => (
              <Line 
                key={key as string} 
                type="monotone" 
                dataKey={key as string} 
                stroke={colors[i % colors.length]} 
                strokeWidth={3} 
                dot={{ r: 4, fill: colors[i % colors.length], strokeWidth: 0 }} 
                activeDot={{ r: 6, strokeWidth: 0 }} 
              />
            ))}
          </LineChart>
        );
      case 'pie':
        return (
          <PieChart>
            <Tooltip 
              contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} 
              itemStyle={{ color: '#fff', fontSize: '12px' }} 
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={100}
              innerRadius={60}
              paddingAngle={5}
              fill="#8884d8"
              dataKey={(finalDataKeys[0] as string) || 'value'}
              label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
          </PieChart>
        );
      case 'scatter':
        return (
          <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
            <XAxis 
              dataKey={xAxisKey} 
              stroke="#888" 
              tick={{ fill: '#888', fontSize: 11 }} 
              tickLine={false} 
              axisLine={false} 
            />
            <YAxis 
              stroke="#888" 
              tick={{ fill: '#888', fontSize: 11 }} 
              tickLine={false} 
              axisLine={false} 
            />
            <Tooltip 
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} 
              itemStyle={{ color: '#fff', fontSize: '12px' }} 
            />
            <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '11px' }} />
            {finalDataKeys.map((key, i) => (
              <Scatter 
                key={key as string} 
                name={key as string} 
                dataKey={key as string}
                fill={colors[i % colors.length]} 
              />
            ))}
          </ComposedChart>
        );
      default:
        return <div className="text-white text-center py-10 flex items-center justify-center h-full">Unsupported chart type: {type}</div>;
    }
  };

  const hasData = data && data.length > 0;

  return (
    <div className="flex flex-col w-full bg-[#0a0a0b] border border-white/10 rounded-2xl overflow-hidden mt-4 shadow-2xl animate-in fade-in zoom-in duration-500">
      <div className="flex items-center justify-between px-5 py-3 bg-white/[0.02] border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <ChartIcon className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <span className="text-[13px] font-bold text-white/80">{title}</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg text-white/30 hover:text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <div ref={containerRef} className="p-6 h-[380px] w-full relative">
        {hasData && dimensions ? (
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        ) : (
          <div className="text-white/40 text-center py-20 h-full flex items-center justify-center">
            {hasData ? "" : "No data available to display"}
          </div>
        )}
      </div>
    </div>
  );
}

