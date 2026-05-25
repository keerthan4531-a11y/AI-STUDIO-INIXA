"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Check, X, ArrowRight, Trophy, RotateCcw } from 'lucide-react';

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface QuizAgentProps {
  title: string;
  questions: Question[];
}

export function QuizAgent({ title, questions }: QuizAgentProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  if (!questions || questions.length === 0) return null;

  const handleOptionClick = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);
    if (idx === questions[currentIdx].correctAnswer) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(currentIdx + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setShowResult(true);
    }
  };

  const resetQuiz = () => {
    setCurrentIdx(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setShowResult(false);
  };

  if (showResult) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="w-full max-w-lg mx-auto my-8 bg-gradient-to-br from-[#1a1b26] to-[#12121a] border border-white/10 rounded-3xl p-8 text-center shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
        <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(234,179,8,0.4)]" />
        <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Quiz Complete!</h2>
        <p className="text-white/40 mb-8 font-medium uppercase tracking-widest text-[11px]">{title}</p>
        
        <div className="flex justify-center items-end gap-2 mb-8">
          <span className="text-6xl font-black text-white">{score}</span>
          <span className="text-2xl text-white/20 font-bold mb-1">/ {questions.length}</span>
        </div>

        <div className="w-full h-3 bg-white/5 rounded-full mb-10 overflow-hidden border border-white/5">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
          />
        </div>

        <button
          onClick={resetQuiz}
          className="flex items-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl mx-auto text-[13px] font-black uppercase tracking-widest text-white transition-all group"
        >
          <RotateCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" /> Retry Quiz
        </button>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];

  return (
    <div className="w-full max-w-lg sm:max-w-2xl mx-auto my-8 bg-[#0a0a0b] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
      {/* Progress */}
      <div className="h-1.5 w-full bg-white/5">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
          className="h-full bg-indigo-500"
        />
      </div>

      <div className="p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-indigo-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Question {currentIdx + 1} of {questions.length}</span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md">{title}</span>
        </div>

        <h3 className="text-lg sm:text-xl font-bold text-white mb-8 leading-relaxed">
          {currentQuestion.question}
        </h3>

        <div className="space-y-3">
          {currentQuestion.options.map((option, idx) => {
            const isCorrect = idx === currentQuestion.correctAnswer;
            const isSelected = idx === selectedOption;
            
            let stateStyle = "bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20 text-white/70";
            if (isAnswered) {
              if (isCorrect) stateStyle = "bg-emerald-500/20 border-emerald-500/40 text-emerald-300";
              else if (isSelected) stateStyle = "bg-red-500/20 border-red-500/40 text-red-300";
              else stateStyle = "bg-white/[0.01] border-white/5 text-white/20 grayscale";
            }

            return (
              <motion.button
                key={idx}
                whileTap={{ scale: isAnswered ? 1 : 0.98 }}
                onClick={() => handleOptionClick(idx)}
                className={`w-full p-4 rounded-2xl border text-left text-[15px] font-medium transition-all flex items-center justify-between ${stateStyle}`}
              >
                <span>{option}</span>
                {isAnswered && isCorrect && <Check className="w-5 h-5 text-emerald-400" />}
                {isAnswered && isSelected && !isCorrect && <X className="w-5 h-5 text-red-400" />}
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence>
          {isAnswered && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-8 pt-8 border-t border-white/5"
            >
              {currentQuestion.explanation && (
                <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-[13px] text-white/60 mb-6 italic leading-relaxed">
                  <span className="font-black text-indigo-400 uppercase tracking-tighter mr-2 not-italic">Explanation:</span>
                  {currentQuestion.explanation}
                </div>
              )}
              
              <button
                onClick={handleNext}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[13px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 group transition-all"
              >
                {currentIdx + 1 === questions.length ? 'Show Results' : 'Next Question'}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

