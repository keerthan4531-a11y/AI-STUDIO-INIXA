"use client";
import React from 'react';

export const OpenAILogo = ({ size = 20, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.998 5.998 0 0 0-3.998 2.9 6.047 6.047 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" fill={color}/>
  </svg>
);

export const GeminiLogo = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C12 2 14.5 7.5 17 10C19.5 12.5 22 12 22 12C22 12 19.5 12.5 17 15C14.5 17.5 12 22 12 22C12 22 9.5 17.5 7 15C4.5 12.5 2 12 2 12C2 12 4.5 12.5 7 10C9.5 7.5 12 2 12 2Z" fill="url(#gemini_grad)" />
    <defs>
      <linearGradient id="gemini_grad" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#4E8AFF" />
        <stop offset="0.5" stopColor="#A87FF3" />
        <stop offset="1" stopColor="#FF8FAD" />
      </linearGradient>
    </defs>
  </svg>
);

export const GrokLogo = ({ size = 20, color = "white" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3.005 3L10.065 12.54L3 21H4.59L10.78 13.56L15.655 21H21.005L13.545 10.9L20.14 3H18.55L12.83 9.88L8.355 3H3.005ZM5.185 4.23H7.77L18.825 19.77H16.24L5.185 4.23Z" fill={color}/>
  </svg>
);

export const ClaudeLogo = ({ size = 20, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
    <path d="M16.1 11.7L13.5 4.3C13.3 3.7 12.7 3.3 12 3.3C11.3 3.3 10.7 3.7 10.5 4.3L4.2 20.7H6.8L8.4 16.3H15.6L17.2 20.7H19.8L16.1 11.7ZM9.2 14L12 6.5L14.8 14H9.2Z"/>
  </svg>
);

export const DeepSeekLogo = ({ size = 20, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12h8M12 8v8" strokeLinecap="round" />
    <circle cx="12" cy="12" r="3" fill={color} fillOpacity="0.3" />
  </svg>
);

export const InixaLogo = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <img 
    src="/icon-512x512.png" 
    alt="Inixa Logo" 
    width={size} 
    height={size} 
    className={`object-contain ${className}`}
  />
);

