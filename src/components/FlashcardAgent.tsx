"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronLeft, ChevronRight, RotateCcw, Check, X } from 'lucide-react';

interface Flashcard {
  front: string;
  back: string;
}

interface FlashcardAgentProps {
  title: string;
  cards: Flashcard[];
}

export function FlashcardAgent({ title, cards }: FlashcardAgentProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [direction, setDirection] = useState(0);

  if (!cards || cards.length === 0) return null;

  const handleNext = () => {
    setDirection(1);
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % cards.length);
    }, 50);
  };

  const handlePrev = () => {
    setDirection(-1);
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
    }, 50);
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const currentCard = cards[currentIndex];

  return (
    <div className="w-full max-w-lg sm:max-w-2xl mx-auto my-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <Brain className="w-4 h-4 text-indigo-400" />
          </div>
          <h3 className="text-sm font-black uppercase tracking-widest text-white/60">{title}</h3>
        </div>
        <div className="text-[11px] font-bold text-white/30 tracking-widest uppercase">
          {currentIndex + 1} / {cards.length}
        </div>
      </div>

      <div className="relative h-64 sm:h-80 perspective-1000 group">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ x: direction * 100, opacity: 0, scale: 0.95 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: -direction * 100, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full h-full cursor-pointer"
            onClick={handleFlip}
          >
            <motion.div
              className="w-full h-full relative preserve-3d"
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
            >
              {/* Front */}
              <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-[#1a1b26] to-[#12121a] border border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-2xl">
                <span className="absolute top-6 left-6 text-[10px] font-black uppercase tracking-tighter text-white/20">Question</span>
                <p className="text-lg sm:text-xl font-bold text-white/90 leading-relaxed">
                  {currentCard.front}
                </p>
                <div className="absolute bottom-6 text-[10px] font-bold text-indigo-400/50 uppercase tracking-widest animate-pulse">Click to flip</div>
              </div>

              {/* Back */}
              <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-2xl rotate-y-180">
                <span className="absolute top-6 left-6 text-[10px] font-black uppercase tracking-tighter text-indigo-300/40">Answer</span>
                <p className="text-lg sm:text-xl font-bold text-indigo-100 leading-relaxed">
                  {currentCard.back}
                </p>
                <div className="absolute bottom-6 text-[10px] font-bold text-white/30 uppercase tracking-widest">Click to flip back</div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-4 mt-6">
        <button
          onClick={(e) => { e.stopPropagation(); handlePrev(); }}
          className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all shadow-lg"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <button
          onClick={(e) => { e.stopPropagation(); setCurrentIndex(0); setIsFlipped(false); }}
          className="px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5 inline mr-2" /> Reset
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); handleNext(); }}
          className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all shadow-lg"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

