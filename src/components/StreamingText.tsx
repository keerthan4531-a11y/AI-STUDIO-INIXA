"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface StreamingTextProps {
  text: string;
  speed?: number; // ms per character
  onComplete?: () => void;
  isStreaming: boolean;
}

export function StreamingText({ text, speed = 12, onComplete, isStreaming }: StreamingTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedText(text);
      setCurrentIndex(text.length);
      return;
    }

    if (currentIndex < text.length) {
      // Type in chunks for faster feel (2-4 chars at a time)
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          const chunkSize = Math.floor(Math.random() * 3) + 1;
          const next = Math.min(prev + chunkSize, text.length);
          setDisplayedText(text.slice(0, next));
          if (next >= text.length) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            onComplete?.();
          }
          return next;
        });
      }, speed);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text, isStreaming]);

  // When text updates (new chunk from stream), don't reset
  useEffect(() => {
    if (isStreaming && text.length > currentIndex) {
      // New content arrived, keep typing
      if (!intervalRef.current) {
        intervalRef.current = setInterval(() => {
          setCurrentIndex(prev => {
            const chunkSize = Math.floor(Math.random() * 3) + 2;
            const next = Math.min(prev + chunkSize, text.length);
            setDisplayedText(text.slice(0, next));
            if (next >= text.length) {
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
            }
            return next;
          });
        }, speed);
      }
    }
  }, [text.length]);

  return (
    <span>
      {displayedText}
      {isStreaming && currentIndex < text.length && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="inline-block w-[2px] h-[1em] bg-white/80 ml-0.5 align-text-bottom"
        />
      )}
    </span>
  );
}

// Cursor blink component for loading state
export function TypingCursor() {
  return (
    <div className="flex items-center gap-2 py-2">
      <motion.div
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
        className="w-[3px] h-5 bg-indigo-400 rounded-full"
      />
    </div>
  );
}

