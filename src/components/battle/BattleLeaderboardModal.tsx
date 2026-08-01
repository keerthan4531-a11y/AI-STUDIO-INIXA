"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Award, Crown, X, CheckCircle2, Flame, RefreshCw, Zap, Users, Loader2 } from 'lucide-react';
import { vibrate } from '../../utils/helpers';

export interface LeaderboardEntry {
  rank?: number;
  username: string;
  totalScore: number;
  completedQuestions: number;
  avgAccuracy: number;
  timeSpentMinutes: number;
  isCurrentUser?: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUserEntry?: LeaderboardEntry;
}

export function BattleLeaderboardModal({ isOpen, onClose, currentUserEntry }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchRealLeaderboard = async () => {
    try {
      const res = await fetch('/api/battle/leaderboard');
      const data = await res.json();
      if (data.ok && Array.isArray(data.leaderboard)) {
        let apiEntries: LeaderboardEntry[] = data.leaderboard;

        // If current user is playing, ensure their entry is present/merged
        if (currentUserEntry?.username) {
          const exists = apiEntries.some(e => e.username === currentUserEntry.username);
          if (!exists && currentUserEntry.completedQuestions > 0) {
            apiEntries.push(currentUserEntry);
          }
        }

        // Sort descending by totalScore, then completedQuestions
        apiEntries.sort((a, b) => {
          if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
          return b.completedQuestions - a.completedQuestions;
        });

        // Add rank & current user flag
        const formatted = apiEntries.map((item, idx) => ({
          ...item,
          rank: idx + 1,
          isCurrentUser: currentUserEntry?.username ? item.username === currentUserEntry.username : false
        }));

        setEntries(formatted);
      }
    } catch (e) {
      console.error('Failed to fetch real-time leaderboard:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetchRealLeaderboard();

      // Poll every 3 seconds for real-time live updates during tournament
      const interval = setInterval(fetchRealLeaderboard, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen, currentUserEntry?.username]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#0f111a] border border-white/20 rounded-3xl max-w-3xl w-full flex flex-col shadow-2xl overflow-hidden text-white"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-amber-950/40 via-purple-950/40 to-indigo-950/40">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/30 border border-white/20">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">Real-Time Tournament Leaderboard</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE SYNC
                </span>
              </div>
              <p className="text-xs text-white/50">Live backend rankings of all participating contestants</p>
            </div>
          </div>

          <button
            onClick={() => { vibrate(20); onClose(); }}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center mb-2">
            <div className="bg-amber-950/30 border border-amber-500/30 p-3 rounded-2xl">
              <div className="text-[10px] font-bold text-amber-400 uppercase">1st Place</div>
              <div className="text-sm font-black text-amber-300 flex items-center justify-center gap-1 mt-0.5">
                <Crown className="w-4 h-4 text-amber-400" /> Gold Trophy
              </div>
            </div>
            <div className="bg-slate-900/40 border border-slate-400/30 p-3 rounded-2xl">
              <div className="text-[10px] font-bold text-slate-300 uppercase">Max Score Cap</div>
              <div className="text-sm font-black text-slate-200 mt-0.5">600 Points</div>
            </div>
            <div className="bg-indigo-950/30 border border-indigo-500/30 p-3 rounded-2xl">
              <div className="text-[10px] font-bold text-indigo-400 uppercase">Live Contestants</div>
              <div className="text-sm font-black text-indigo-300 mt-0.5 flex items-center justify-center gap-1">
                <Users className="w-3.5 h-3.5 text-indigo-400" /> {entries.length} Joined
              </div>
            </div>
          </div>

          {/* Leaderboard Table */}
          <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-12 gap-2 p-3 text-[11px] font-bold text-white/40 uppercase tracking-wider border-b border-white/10 bg-white/[0.02]">
              <div className="col-span-1 text-center">Rank</div>
              <div className="col-span-5">Contestant Name</div>
              <div className="col-span-2 text-center">Done</div>
              <div className="col-span-2 text-center">Avg Acc.</div>
              <div className="col-span-2 text-right">Total Score</div>
            </div>

            {isLoading && entries.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-white/40">
                <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                <span className="text-xs">Fetching real-time backend leaderboard...</span>
              </div>
            ) : entries.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-white/40">
                <Users className="w-8 h-8 text-white/20" />
                <span className="text-xs font-semibold text-white/60">No contestants on the leaderboard yet.</span>
                <span className="text-[11px] text-white/40">Log in and complete questions to appear here in real time!</span>
              </div>
            ) : (
              <div className="divide-y divide-white/5 max-h-72 overflow-y-auto">
                {entries.map((entry) => {
                  const is1st = entry.rank === 1;
                  const is2nd = entry.rank === 2;
                  const is3rd = entry.rank === 3;

                  return (
                    <div
                      key={entry.username}
                      className={`grid grid-cols-12 gap-2 p-3 text-xs items-center transition-all ${
                        entry.isCurrentUser
                          ? 'bg-indigo-950/60 border-l-4 border-l-indigo-500 font-bold'
                          : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="col-span-1 flex items-center justify-center">
                        {is1st && <Crown className="w-5 h-5 text-amber-400 fill-amber-400" />}
                        {is2nd && <Award className="w-4 h-4 text-slate-300" />}
                        {is3rd && <Award className="w-4 h-4 text-amber-700" />}
                        {!is1st && !is2nd && !is3rd && (
                          <span className="font-mono text-white/50">#{entry.rank}</span>
                        )}
                      </div>

                      <div className="col-span-5 flex items-center gap-2">
                        <span className={`font-semibold ${entry.isCurrentUser ? 'text-indigo-300 font-black' : 'text-white'}`}>
                          {entry.username}
                        </span>
                        {entry.isCurrentUser && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                            YOU
                          </span>
                        )}
                      </div>

                      <div className="col-span-2 text-center font-mono text-white/70">
                        {entry.completedQuestions}/6
                      </div>

                      <div className="col-span-2 text-center font-mono text-emerald-400">
                        {entry.avgAccuracy}%
                      </div>

                      <div className="col-span-2 text-right font-mono font-black text-amber-400 text-sm">
                        {entry.totalScore}
                        <span className="text-[10px] text-white/40 font-normal">/600</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/40 flex items-center justify-between text-xs text-white/50">
          <span>Real-Time College Tournament Leaderboard</span>
          <button
            onClick={() => { vibrate(20); onClose(); }}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-all"
          >
            Close Leaderboard
          </button>
        </div>
      </motion.div>
    </div>
  );
}
