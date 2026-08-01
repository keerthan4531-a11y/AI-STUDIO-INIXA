"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Swords, Play, Send, Award, Clock, Code2, BookOpen, CheckCircle2,
  Sparkles, Monitor, Users, RefreshCw, Zap, ShieldAlert, Check, Copy, AlertTriangle, ArrowRight, ChevronDown, Brain
} from 'lucide-react';
import { cn } from '../GlassCard';
import { BATTLE_CHALLENGES, type BattleChallenge } from './challengesData';
import { aiChat, AI_MODELS, getSelectedModel, setSelectedModel, type AIModel } from '../../api/aiEngine';
import { vibrate } from '../../utils/helpers';
import { CyberReasoningStream } from './CyberReasoningStream';
import { PromptBattleRulebookModal } from './PromptBattleRulebookModal';
import { Printer } from 'lucide-react';

export function PromptBattleArena() {
  const [activeCategory, setActiveCategory] = useState<'text-research' | 'coding'>('text-research');
  const [selectedChallenge, setSelectedChallenge] = useState<BattleChallenge>(BATTLE_CHALLENGES[0]);
  const [viewMode, setViewMode] = useState<'contestant' | 'projector'>('contestant');

  // Model selection state
  const [activeModel, setActiveModel] = useState<AIModel>(() => {
    return getSelectedModel();
  });
  const [showModelDropdown, setShowModelDropdown] = useState<boolean>(false);
  const [showRulebookModal, setShowRulebookModal] = useState<boolean>(false);
  
  // Contestant State
  const [userPrompt, setUserPrompt] = useState<string>('');
  const [aiOutput, setAiOutput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evaluationResult, setEvaluationResult] = useState<{
    score: number;
    accuracy: number;
    constraintMatch: number;
    tokenEfficiency: number;
    feedback: string;
  } | null>(null);

  // Timer state
  const [timeLeft, setTimeLeft] = useState<number>(selectedChallenge.timeLimitSeconds);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);

  // Projector 1v1 state
  const [playerAPrompt, setPlayerAPrompt] = useState<string>('Write a prompt using zero-shot delimiters & strict schema rules...');
  const [playerAOutput, setPlayerAOutput] = useState<string>('{\n  "userId": 9842,\n  "customerName": "John Doe",\n  "severity": "HIGH"\n}');
  const [playerAScore, setPlayerAScore] = useState<number>(92);
  const [playerAModel, setPlayerAModel] = useState<string>('GPT-5.6 (UPDF)');

  const [playerBPrompt, setPlayerBPrompt] = useState<string>('Extract JSON keys: name, id, os, rootCause without markdown...');
  const [playerBOutput, setPlayerBOutput] = useState<string>('{\n  "id": 9842,\n  "name": "John Doe",\n  "cause": "Buffer overflow"\n}');
  const [playerBScore, setPlayerBScore] = useState<number>(88);
  const [playerBModel, setPlayerBModel] = useState<string>('DeepSeek V4 Pro');

  const filteredChallenges = BATTLE_CHALLENGES.filter(c => c.category === activeCategory);

  useEffect(() => {
    const defaultCh = filteredChallenges[0] || BATTLE_CHALLENGES[0];
    setSelectedChallenge(defaultCh);
    setTimeLeft(defaultCh.timeLimitSeconds);
    setTimerRunning(false);
    setUserPrompt('');
    setAiOutput('');
    setEvaluationResult(null);
  }, [activeCategory]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timeLeft]);

  const handleSelectChallenge = (ch: BattleChallenge) => {
    vibrate(30);
    setSelectedChallenge(ch);
    setTimeLeft(ch.timeLimitSeconds);
    setTimerRunning(false);
    setUserPrompt('');
    setAiOutput('');
    setEvaluationResult(null);
  };

  const handleSelectModel = (m: AIModel) => {
    vibrate(20);
    setActiveModel(m);
    setSelectedModel(m.id);
    setShowModelDropdown(false);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleRunPrompt = async () => {
    if (!userPrompt.trim() || isGenerating) return;
    vibrate(40);
    setIsGenerating(true);
    setAiOutput('');
    setEvaluationResult(null);

    const fullMessages = [
      {
        role: 'system',
        content: `You are participating in a Prompt Engineering Battle. Execute the contestant's prompt accurately based on the provided sample input context below:\n\nCONTEXT INPUT:\n${selectedChallenge.sampleInput || 'N/A'}`
      },
      {
        role: 'user',
        content: userPrompt
      }
    ];

    try {
      const result = await aiChat(
        fullMessages,
        (chunk: string) => {
          setAiOutput(chunk); // Real-time streaming update token by token!
        },
        activeModel
      );
      setAiOutput(result);
    } catch (e) {
      console.error(e);
      setAiOutput('Error generating response. Please check AI Engine backend connection.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEvaluateScore = async () => {
    if (!aiOutput || isEvaluating) return;
    vibrate(50);
    setIsEvaluating(true);

    const judgeSystemPrompt = `You are a strict, highly demanding AI Competition Judge evaluating a Prompt Engineering contestant submission.
Be EXTREMELY STRICT in your scoring. Apply heavy penalties for non-compliance.

TARGET GOAL:
${selectedChallenge.targetOutputOrGoal}

CONSTRAINTS TO ENFORCE (CRITICAL):
${selectedChallenge.constraints.map(c => `- ${c}`).join('\n')}

EVALUATION CRITERIA:
${selectedChallenge.evaluationCriteria}

CONTESTANT PROMPT:
${userPrompt}

AI GENERATED OUTPUT:
${aiOutput}

SCORING RULES:
1. If ANY constraint is violated (e.g. markdown fences present when forbidden, forbidden characters used, wrong complexity), deduct 40-50 points immediately from constraintMatch & score!
2. If the contestant prompt is short/lazy without delimiters, role setting, or explicit formatting rules, cap tokenEfficiency at 50%.
3. Only award 90%+ scores to prompts that use professional prompt engineering techniques (role assignment, XML/quote delimiters, negative constraints).

Respond ONLY with a JSON object in this exact format (no markdown fences):
{
  "score": <overall 0-100 score>,
  "accuracy": <0-100 score>,
  "constraintMatch": <0-100 score>,
  "tokenEfficiency": <0-100 score>,
  "feedback": "<2-sentence concise breakdown of strengths & improvements>"
}`;

    try {
      const rawJudgeOutput = await aiChat(
        [{ role: 'user', content: judgeSystemPrompt }],
        undefined,
        activeModel
      );

      // 1. Clean LLM Judge output (strip <think> tags & markdown fences)
      let cleanedJudgeText = (rawJudgeOutput || '')
        .replace(/<think>[\s\S]*?<\/think>/g, '')
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      const jsonMatch = cleanedJudgeText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedJudgeText = jsonMatch[0];
      }

      let parsed: any = null;
      try {
        parsed = JSON.parse(cleanedJudgeText);
      } catch (err) {
        console.warn('LLM Judge JSON parse failed, utilizing deterministic rule engine fallback.');
      }

      // 2. Deterministic Dynamic Constraint Rules Engine
      let accuracyScore = 95;
      let constraintScore = 95;
      let tokenEffScore = 90;
      const feedbackIssues: string[] = [];

      const cleanAiOutput = aiOutput.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

      // Check Markdown fences
      if (cleanAiOutput.includes('```')) {
        constraintScore -= 30;
        feedbackIssues.push('Markdown fences (```) were included.');
      }

      // Check JSON validity if JSON is expected
      let parsedAiOutput: any = null;
      if (selectedChallenge.targetOutputOrGoal.trim().startsWith('{')) {
        try {
          parsedAiOutput = JSON.parse(cleanAiOutput.replace(/```json/g, '').replace(/```/g, '').trim());
        } catch {
          accuracyScore -= 40;
          constraintScore -= 30;
          feedbackIssues.push('Output is not valid parseable JSON.');
        }
      }

      // Check Alphabetical Key Order if JSON
      if (parsedAiOutput && typeof parsedAiOutput === 'object' && !Array.isArray(parsedAiOutput)) {
        const keys = Object.keys(parsedAiOutput);
        const sortedKeys = [...keys].sort();
        const isAlphabetical = keys.join(',') === sortedKeys.join(',');
        
        if (!isAlphabetical && selectedChallenge.constraints.some(c => c.toLowerCase().includes('alphabetical'))) {
          constraintScore -= 35;
          accuracyScore -= 20;
          feedbackIssues.push(`Keys not in alphabetical order (Found: ${keys.join(', ')}).`);
        }
      }

      // Check Math Unit Conversion Bytes (52428800)
      if (selectedChallenge.constraints.some(c => c.includes('52428800'))) {
        if (!cleanAiOutput.includes('52428800')) {
          accuracyScore -= 30;
          constraintScore -= 25;
          feedbackIssues.push('Failed 50MB to 52428800 bytes unit conversion.');
        }
      }

      // Check Disregard Filter (#101)
      if (selectedChallenge.sampleInput?.includes('DISREGARD') && cleanAiOutput.includes('101')) {
        constraintScore -= 30;
        feedbackIssues.push('Failed to filter out disregarded report #101.');
      }

      // Check Forbidden Character Ban (e.g. letter 'e')
      if (selectedChallenge.constraints.some(c => c.includes("'e'"))) {
        const eCount = (cleanAiOutput.match(/e/gi) || []).length;
        if (eCount > 0) {
          constraintScore -= Math.min(60, eCount * 10);
          feedbackIssues.push(`Forbidden letter 'e' appeared ${eCount} times.`);
        }
      }

      // Check Contestant Prompt Quality
      if (userPrompt.trim().length < 30 || !userPrompt.includes('<') && !userPrompt.includes('"')) {
        tokenEffScore = Math.min(tokenEffScore, 55);
        feedbackIssues.push('Prompt is simplistic; missing delimiters or explicit role rules.');
      }

      // Combine LLM Judge & Deterministic Rule Engine
      const finalAccuracy = Math.max(10, Math.min(100, parsed?.accuracy ?? accuracyScore));
      const finalConstraint = Math.max(10, Math.min(100, parsed?.constraintMatch ?? constraintScore));
      const finalTokenEff = Math.max(10, Math.min(100, parsed?.tokenEfficiency ?? tokenEffScore));
      
      const overallScore = Math.round((finalAccuracy * 0.4) + (finalConstraint * 0.4) + (finalTokenEff * 0.2));

      let finalFeedback = parsed?.feedback || 'Evaluated prompt against constraints.';
      if (feedbackIssues.length > 0) {
        finalFeedback = `Penalties Applied: ${feedbackIssues.join(' ')}`;
      }

      setEvaluationResult({
        score: overallScore,
        accuracy: finalAccuracy,
        constraintMatch: finalConstraint,
        tokenEfficiency: finalTokenEff,
        feedback: finalFeedback
      });
    } catch (e) {
      console.error('Judge Processing Error', e);
      setEvaluationResult({
        score: 45,
        accuracy: 40,
        constraintMatch: 50,
        tokenEfficiency: 45,
        feedback: 'Failed constraint verification. Output did not satisfy strict schema requirements.'
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  // Top featured AI Models for battle selection
  const battleModels = AI_MODELS.filter(m => [
    'updf-gpt-5-6',
    'g4f-deepseek-v4-pro',
    'qw-qwen3.7-max',
    'qw-qwen3.7-plus',
    'perplexity-copilot',
    'surfsense-gpt5.4-mini',
    'unlimited-pollinations'
  ].includes(m.id));

  return (
    <div className="flex-1 flex flex-col h-full bg-[#090a0f] text-white overflow-y-auto font-sans">
      {/* Top Header Banner */}
      <div className="border-b border-white/10 bg-gradient-to-r from-blue-950/40 via-indigo-950/40 to-purple-950/40 p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 border border-white/20">
            <Swords className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent">
                INIXA Prompt Battle Arena
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/30">
                PROMPT CLASH '26
              </span>
            </div>
            <p className="text-xs text-white/50 mt-0.5">
              College Edition — Text Research & High-Speed Algorithmic Prompting
            </p>
          </div>
        </div>

        {/* View Mode Toggle: Contestant vs Auditorium 1v1 */}
        <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
          <button
            onClick={() => { setShowRulebookModal(true); vibrate(20); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all shadow-md"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-400" />
            Rulebook & PDF Guide
          </button>

          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10 flex-1 sm:flex-none">
            <button
              onClick={() => { setViewMode('contestant'); vibrate(20); }}
              className={cn(
                "flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                viewMode === 'contestant'
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-white/60 hover:text-white"
              )}
            >
              <Zap className="w-3.5 h-3.5" />
              Contestant Mode
            </button>
            <button
              onClick={() => { setViewMode('projector'); vibrate(20); }}
              className={cn(
                "flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                viewMode === 'projector'
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-white/60 hover:text-white"
              )}
            >
              <Monitor className="w-3.5 h-3.5" />
              Stage Projector (1v1)
            </button>
          </div>
        </div>
      </div>

      {/* Main Body */}
      {viewMode === 'contestant' ? (
        <div className="flex-1 p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto w-full">
          {/* Left Column: Category & Challenge Selection */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Category Filter */}
            <div className="grid grid-cols-2 gap-2 bg-white/5 p-1.5 rounded-xl border border-white/10">
              <button
                onClick={() => { setActiveCategory('text-research'); vibrate(20); }}
                className={cn(
                  "flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-extrabold transition-all",
                  activeCategory === 'text-research'
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                    : "text-white/50 hover:text-white"
                )}
              >
                <BookOpen className="w-4 h-4" />
                Text Research
              </button>
              <button
                onClick={() => { setActiveCategory('coding'); vibrate(20); }}
                className={cn(
                  "flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-extrabold transition-all",
                  activeCategory === 'coding'
                    ? "bg-emerald-600 text-white shadow-sm shadow-emerald-500/30"
                    : "text-white/50 hover:text-white"
                )}
              >
                <Code2 className="w-4 h-4" />
                Coding Battle
              </button>
            </div>

            {/* AI Model Picker Bar */}
            <div className="relative">
              <div className="text-[11px] font-bold text-white/50 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Select Battle Model:</span>
                <span className="text-[10px] text-indigo-400 font-mono">9router Engine</span>
              </div>
              <button
                onClick={() => setShowModelDropdown(!showModelDropdown)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/15 hover:bg-white/[0.08] transition-all text-xs text-white"
              >
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-indigo-400" />
                  <span className="font-bold">{activeModel.label}</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {activeModel.badge || 'PRO'}
                  </span>
                </div>
                <ChevronDown className={cn("w-4 h-4 text-white/50 transition-transform", showModelDropdown && "rotate-180")} />
              </button>

              {/* Model Dropdown Menu */}
              <AnimatePresence>
                {showModelDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute z-30 left-0 right-0 mt-2 p-2 rounded-xl bg-[#0f111a] border border-white/20 shadow-2xl space-y-1 max-h-60 overflow-y-auto"
                  >
                    {battleModels.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => handleSelectModel(m)}
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all",
                          m.id === activeModel.id
                            ? "bg-indigo-600/30 text-indigo-200 border border-indigo-500/40"
                            : "hover:bg-white/5 text-white/70 hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span>{m.label}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/60">
                            {m.badge || 'AI'}
                          </span>
                        </div>
                        {m.id === activeModel.id && <Check className="w-4 h-4 text-indigo-400" />}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Challenges List */}
            <div className="flex flex-col gap-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-white/40">
                {activeCategory === 'text-research' ? '🧠 Research Challenges' : '💻 Algorithmic Challenges'}
              </h2>
              {filteredChallenges.map((ch) => {
                const isSelected = ch.id === selectedChallenge.id;
                return (
                  <div
                    key={ch.id}
                    onClick={() => handleSelectChallenge(ch)}
                    className={cn(
                      "p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden group",
                      isSelected
                        ? "bg-indigo-950/40 border-indigo-500/50 ring-1 ring-indigo-500/30"
                        : "bg-white/[0.02] border-white/10 hover:bg-white/[0.05] hover:border-white/20"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className={cn(
                        "text-[10px] font-black px-2 py-0.5 rounded-md uppercase border",
                        ch.difficulty === 'Easy' && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                        ch.difficulty === 'Medium' && "bg-blue-500/10 text-blue-400 border-blue-500/20",
                        ch.difficulty === 'Hard' && "bg-amber-500/10 text-amber-400 border-amber-500/20",
                        ch.difficulty === 'Extreme' && "bg-rose-500/10 text-rose-400 border-rose-500/20",
                        ch.difficulty === 'Insane' && "bg-purple-500/20 text-purple-300 border-purple-500/40 animate-pulse shadow-md shadow-purple-500/20"
                      )}>
                        {ch.difficulty}
                      </span>
                      <span className="text-[11px] text-white/40 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {Math.floor(ch.timeLimitSeconds / 60)}m
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                      {ch.title}
                    </h3>
                    <p className="text-xs text-white/50 line-clamp-2 mt-1">
                      {ch.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Challenge Workspace & Prompt Editor */}
          <div className="lg:col-span-8 flex flex-col gap-5">
            {/* Active Challenge Header Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/10 flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-extrabold text-white">{selectedChallenge.title}</h2>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                      {selectedChallenge.category === 'text-research' ? 'Text Research' : 'Coding'}
                    </span>
                  </div>
                  <p className="text-xs text-white/60 mt-1">{selectedChallenge.description}</p>
                </div>

                {/* Timer Controls */}
                <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10">
                  <Clock className={cn("w-4 h-4", timerRunning ? "text-amber-400 animate-pulse" : "text-white/40")} />
                  <span className="text-sm font-mono font-bold text-amber-300">{formatTime(timeLeft)}</span>
                  <button
                    onClick={() => { setTimerRunning(!timerRunning); vibrate(20); }}
                    className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 hover:bg-white/20 text-white"
                  >
                    {timerRunning ? 'PAUSE' : 'START'}
                  </button>
                </div>
              </div>

              {/* Sample Input / Context data */}
              {selectedChallenge.sampleInput && (
                <div className="bg-black/30 p-3.5 rounded-xl border border-white/5">
                  <div className="text-[11px] font-bold text-white/50 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <BookOpen className="w-3 h-3 text-indigo-400" />
                    Input Data / Context Provided
                  </div>
                  <pre className="text-xs text-indigo-200 font-mono whitespace-pre-wrap overflow-x-auto max-h-28">
                    {selectedChallenge.sampleInput}
                  </pre>
                </div>
              )}

              {/* Target Constraints Checklist */}
              <div className="bg-indigo-950/20 p-3.5 rounded-xl border border-indigo-500/20">
                <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Target Constraints (Must Follow)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedChallenge.constraints.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-white/80">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Prompt Editor Box */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-white/60 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Your Contestant Prompt
                </label>
                <span className="text-[11px] font-mono text-white/40">
                  Length: {userPrompt.length} chars
                </span>
              </div>
              <textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="Craft your prompt engineered instructions here (Use role assignment, clear delimiters, zero-shot/few-shot constraints)..."
                rows={5}
                className="w-full bg-white/[0.03] border border-white/15 focus:border-indigo-500/80 rounded-xl p-4 text-xs font-mono text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all resize-y"
              />
              <div className="flex items-center justify-between gap-3 mt-1">
                <div className="text-xs text-white/50 flex items-center gap-2 font-mono">
                  <Brain className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Model: <strong className="text-indigo-300">{activeModel.label}</strong></span>
                </div>
                <button
                  onClick={handleRunPrompt}
                  disabled={isGenerating || !userPrompt.trim()}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg",
                    isGenerating || !userPrompt.trim()
                      ? "bg-white/10 text-white/30 cursor-not-allowed"
                      : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:brightness-110 shadow-indigo-600/30"
                  )}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Streaming Response...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" />
                      Execute Prompt
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Real-time Streaming AI Output Display & Judge Evaluation */}
            {(aiOutput || isGenerating) && (() => {
              let thinkText = '';
              let cleanResponseText = aiOutput;

              if (aiOutput.includes('<think>')) {
                const match = aiOutput.match(/<think>([\s\S]*?)(?:<\/think>|$)/);
                if (match) {
                  thinkText = match[1].trim();
                }
                cleanResponseText = aiOutput.replace(/<think>[\s\S]*?(?:<\/think>|$)/g, '').trimStart();
              }

              return (
                <div className="p-5 rounded-2xl bg-black/60 border border-white/10 flex flex-col gap-4 shadow-2xl relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", isGenerating ? "bg-emerald-400" : "bg-blue-400")} />
                        <span className={cn("relative inline-flex rounded-full h-2.5 w-2.5", isGenerating ? "bg-emerald-500" : "bg-blue-500")} />
                      </span>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        {isGenerating ? 'AI Model Typing (Live Stream)...' : 'AI Model Generated Response'}
                      </h3>
                    </div>

                    {!isGenerating && aiOutput && (
                      <button
                        onClick={handleEvaluateScore}
                        disabled={isEvaluating}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-all shadow-md"
                      >
                        <Award className="w-4 h-4 text-amber-400" />
                        {isEvaluating ? 'Evaluating...' : 'AI Judge Score'}
                      </button>
                    )}
                  </div>

                  {/* Render Cyber Reasoning Stream for Think Tags */}
                  <CyberReasoningStream thinkingText={thinkText} isStreaming={isGenerating && !cleanResponseText} />

                  {/* Real-Time Live Streaming Container */}
                  {(cleanResponseText || isGenerating) && (
                    <div className="relative">
                      <pre className="text-xs font-mono text-slate-200 bg-white/[0.02] p-4 rounded-xl border border-white/5 overflow-x-auto whitespace-pre-wrap max-h-64 leading-relaxed">
                        {cleanResponseText}
                        {isGenerating && <span className="inline-block w-2 h-4 bg-emerald-400 animate-pulse ml-0.5 align-middle">▌</span>}
                      </pre>
                    </div>
                  )}

                {/* Score Breakdown Result */}
                {evaluationResult && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-indigo-950/40 to-purple-950/40 border border-amber-500/30 flex flex-col gap-3 shadow-xl"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-amber-400" />
                        <span className="text-sm font-extrabold text-white">Automated AI Judge Score</span>
                      </div>
                      <div className="text-2xl font-black text-amber-400 font-mono">
                        {evaluationResult.score}<span className="text-sm text-white/50">/100</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center my-1">
                      <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                        <div className="text-[10px] text-white/40 font-bold uppercase">Accuracy</div>
                        <div className="text-sm font-bold text-blue-400">{evaluationResult.accuracy}%</div>
                        <div className="w-full bg-white/10 h-1 rounded-full mt-1.5 overflow-hidden">
                          <div className="bg-blue-400 h-full rounded-full" style={{ width: `${evaluationResult.accuracy}%` }} />
                        </div>
                      </div>
                      <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                        <div className="text-[10px] text-white/40 font-bold uppercase">Constraints</div>
                        <div className="text-sm font-bold text-emerald-400">{evaluationResult.constraintMatch}%</div>
                        <div className="w-full bg-white/10 h-1 rounded-full mt-1.5 overflow-hidden">
                          <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${evaluationResult.constraintMatch}%` }} />
                        </div>
                      </div>
                      <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                        <div className="text-[10px] text-white/40 font-bold uppercase">Token Eff.</div>
                        <div className="text-sm font-bold text-purple-400">{evaluationResult.tokenEfficiency}%</div>
                        <div className="w-full bg-white/10 h-1 rounded-full mt-1.5 overflow-hidden">
                          <div className="bg-purple-400 h-full rounded-full" style={{ width: `${evaluationResult.tokenEfficiency}%` }} />
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-amber-200/80 italic bg-black/30 p-2.5 rounded-lg border border-amber-500/20">
                      "{evaluationResult.feedback}"
                    </p>
                  </motion.div>
                )}
              </div>
              );
            })()}
          </div>
        </div>
      ) : (
        /* Auditorium Stage Projector Mode (1v1 Split Screen) */
        <div className="flex-1 p-6 flex flex-col gap-6 max-w-7xl mx-auto w-full">
          <div className="text-center flex flex-col items-center">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-widest animate-pulse mb-2">
              🔴 AUDITORIUM LIVE STAGE SHOWDOWN
            </span>
            <h2 className="text-3xl font-black text-white">FINAL ROUND: 1v1 PROMPT BATTLE</h2>
            <p className="text-xs text-white/50 mt-1 max-w-lg">
              Projector Screen View — Comparing Player 1 vs Player 2 live typing on "{selectedChallenge.title}"
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
            {/* Player A Card */}
            <div className="p-5 rounded-2xl bg-blue-950/20 border border-blue-500/30 flex flex-col gap-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-blue-500/20 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center font-black text-blue-400">
                    A
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Player 1: Alex Chen</h3>
                    <span className="text-[10px] text-blue-300 font-mono">Model: {playerAModel}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-white/40 font-bold uppercase">Live Score</div>
                  <div className="text-xl font-black text-blue-400 font-mono">{playerAScore}%</div>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold text-blue-300 uppercase mb-1">Live Prompt Draft</div>
                <div className="bg-black/50 p-3 rounded-xl border border-blue-500/20 text-xs font-mono text-blue-100 min-h-20">
                  {playerAPrompt}
                </div>
              </div>

              <div className="flex-1">
                <div className="text-[10px] font-bold text-blue-300 uppercase mb-1">Generated Output</div>
                <pre className="bg-black/60 p-3 rounded-xl border border-blue-500/20 text-xs font-mono text-slate-200 overflow-x-auto h-36">
                  {playerAOutput}
                </pre>
              </div>
            </div>

            {/* Player B Card */}
            <div className="p-5 rounded-2xl bg-purple-950/20 border border-purple-500/30 flex flex-col gap-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center font-black text-purple-400">
                    B
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Player 2: Priya Sharma</h3>
                    <span className="text-[10px] text-purple-300 font-mono">Model: {playerBModel}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-white/40 font-bold uppercase">Live Score</div>
                  <div className="text-xl font-black text-purple-400 font-mono">{playerBScore}%</div>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold text-purple-300 uppercase mb-1">Live Prompt Draft</div>
                <div className="bg-black/50 p-3 rounded-xl border border-purple-500/20 text-xs font-mono text-purple-100 min-h-20">
                  {playerBPrompt}
                </div>
              </div>

              <div className="flex-1">
                <div className="text-[10px] font-bold text-purple-300 uppercase mb-1">Generated Output</div>
                <pre className="bg-black/60 p-3 rounded-xl border border-purple-500/20 text-xs font-mono text-slate-200 overflow-x-auto h-36">
                  {playerBOutput}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Rulebook & PDF Guide Modal */}
      <PromptBattleRulebookModal isOpen={showRulebookModal} onClose={() => setShowRulebookModal(false)} />
    </div>
  );
}
