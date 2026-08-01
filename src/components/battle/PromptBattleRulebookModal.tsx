"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Printer, X, Download, ShieldCheck, Award, Swords, Monitor,
  CheckCircle2, Sparkles, Code2, Brain, Zap, ArrowRight, HelpCircle
} from 'lucide-react';
import { BATTLE_CHALLENGES } from './challengesData';
import { vibrate } from '../../utils/helpers';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function PromptBattleRulebookModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  const handlePrintPDF = () => {
    vibrate(30);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to generate the PDF rulebook.');
      return;
    }

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>INIXA Prompt Battle Arena - College Event Rulebook & Guide</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&family=JetBrains+Mono:wght@500;700&display=swap');
    body {
      font-family: 'Inter', sans-serif;
      margin: 0;
      padding: 40px;
      color: #0f172a;
      background: #ffffff;
      line-height: 1.6;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #4f46e5;
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    .badge {
      background: #e0e7ff;
      color: #3730a3;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    h1 {
      font-size: 32px;
      font-weight: 900;
      color: #1e1b4b;
      margin: 12px 0 4px 0;
    }
    .subtitle {
      color: #64748b;
      font-size: 14px;
    }
    .section-title {
      font-size: 20px;
      font-weight: 800;
      color: #312e81;
      border-left: 4px solid #6366f1;
      padding-left: 12px;
      margin-top: 32px;
      margin-bottom: 16px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
    }
    .card-title {
      font-weight: 700;
      font-size: 15px;
      color: #0f172a;
      margin-bottom: 6px;
    }
    .card-desc {
      font-size: 12px;
      color: #475569;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 10px 14px;
      text-align: left;
      font-size: 13px;
    }
    th {
      background: #f1f5f9;
      font-weight: 700;
      color: #1e293b;
    }
    .step-box {
      background: #eef2ff;
      border-left: 3px solid #4f46e5;
      padding: 12px 16px;
      border-radius: 0 8px 8px 0;
      margin-bottom: 12px;
      font-size: 13px;
    }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <span class="badge">Official Tournament Rulebook & Guide</span>
    <h1>INIXA Prompt Engineering Battle</h1>
    <div class="subtitle">College Symposium Edition — Text Research & Coding Challenges Guide</div>
  </div>

  <div class section-title>1. Event Overview & Game Objectives</div>
  <p>The INIXA Prompt Engineering Battle is a real-time competitive event testing participants' mastery in prompt design, constraint adherence, algorithmic reasoning, and structured data extraction using AI Large Language Models.</p>

  <div class="section-title">2. Available Competition Games & Challenges</div>
  <div class="grid">
    ${BATTLE_CHALLENGES.map(ch => `
      <div class="card">
        <div class="card-title">${ch.category === 'text-research' ? '🧠' : '💻'} ${ch.title} (${ch.difficulty})</div>
        <div class="card-desc"><strong>Goal:</strong> ${ch.description}</div>
        <div class="card-desc" style="margin-top: 6px;"><strong>Constraints:</strong> ${ch.constraints.join(', ')}</div>
      </div>
    `).join('')}
  </div>

  <div class="section-title">3. How to Play on INIXA App</div>
  <div class="step-box"><strong>Step 1: Select Game & Model:</strong> Choose your target challenge (Text Research or Coding) and pick your preferred AI model (GPT-5.6, DeepSeek V4 Pro, Qwen 3.7 Max, etc.).</div>
  <div class="step-box"><strong>Step 2: Read Constraints:</strong> Review the required input context and strict target rules (e.g. valid JSON only, zero letter 'e', strict O(N) complexity).</div>
  <div class="step-box"><strong>Step 3: Execute Prompt:</strong> Type your prompt instructions and click "Execute Prompt". Watch the live real-time token stream output.</div>
  <div class="step-box"><strong>Step 4: AI Judge Scoring:</strong> Click "AI Judge Score" to receive an automated score (0-100%) based on Accuracy, Constraint Adherence, and Token Efficiency.</div>

  <div class="section-title">4. Auditorium Stage 1v1 Setup</div>
  <p>During the Final Round, switch to <strong>Stage Projector Mode</strong> in the top header. Mirror the screen to the auditorium projector. Two finalist laptops connect to display Player 1 vs Player 2 live typing and real-time score dials for the audience.</p>

  <div class="section-title">5. Official Judge Scoring Rubric</div>
  <table>
    <thead>
      <tr>
        <th>Evaluation Metric</th>
        <th>Weightage</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Target Accuracy</strong></td>
        <td>40%</td>
        <td>How closely the output matches target JSON/code/table specification.</td>
      </tr>
      <tr>
        <td><strong>Constraint Adherence</strong></td>
        <td>30%</td>
        <td>100% compliance with negative constraints and formatting rules.</td>
      </tr>
      <tr>
        <td><strong>Token & Prompt Efficiency</strong></td>
        <td>20%</td>
        <td>Conciseness and zero conversational filler tokens.</td>
      </tr>
      <tr>
        <td><strong>Technical Elegance</strong></td>
        <td>10%</td>
        <td>Use of delimiters, role assignment, and few-shot techniques.</td>
      </tr>
    </tbody>
  </table>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#0f111a] border border-white/20 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-white"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-indigo-950/40 via-purple-950/40 to-blue-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Prompt Battle Rulebook & Game Guide</h2>
              <p className="text-xs text-white/50">Official College Symposium & In-App Tournament Manual</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintPDF}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:brightness-110 shadow-lg shadow-emerald-600/20 transition-all"
            >
              <Printer className="w-4 h-4" />
              Save / Print PDF
            </button>
            <button
              onClick={() => { vibrate(20); onClose(); }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-white/80 leading-relaxed font-sans">
          {/* Section 1: Overview */}
          <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/10 space-y-2">
            <h3 className="text-sm font-extrabold text-indigo-300 flex items-center gap-2">
              <Swords className="w-4 h-4 text-indigo-400" />
              1. Event Overview
            </h3>
            <p>
              The <strong>INIXA Prompt Engineering Battle</strong> is an elite tournament designed for college symposiums. Participants compete under time pressure to craft instructions (prompts) that force AI Models to solve complex <strong>Text Research</strong> and <strong>Coding Challenges</strong>.
            </p>
          </div>

          {/* Section 2: List of Games */}
          <div className="space-y-3">
            <h3 className="text-sm font-extrabold text-purple-300 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-purple-400" />
              2. Available Competition Games & Challenges
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {BATTLE_CHALLENGES.map((ch) => (
                <div key={ch.id} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">{ch.category === 'text-research' ? '🧠' : '💻'} {ch.title}</span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {ch.difficulty}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/60">{ch.description}</p>
                  <div className="text-[10px] text-amber-300/80 font-mono">
                    Constraints: {ch.constraints.join(' | ')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: How to Play */}
          <div className="space-y-3">
            <h3 className="text-sm font-extrabold text-emerald-300 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              3. How to Play on INIXA Web App
            </h3>

            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 flex items-start gap-3">
                <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0">1</span>
                <div>
                  <strong className="text-white">Choose Category & AI Model:</strong> Switch between Text Research and Coding challenges. Select your AI model (GPT-5.6, DeepSeek V4 Pro, Qwen 3.7 Max, etc.).
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 flex items-start gap-3">
                <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0">2</span>
                <div>
                  <strong className="text-white">Analyze Target Constraints:</strong> Review input data and mandatory constraints (JSON formatting, O(N) complexity, zero letter 'e', etc.).
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 flex items-start gap-3">
                <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0">3</span>
                <div>
                  <strong className="text-white">Execute Live Streaming Prompt:</strong> Type your prompt instructions and click "Execute Prompt". Watch the live real-time token stream output with live typing cursor.
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 flex items-start gap-3">
                <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0">4</span>
                <div>
                  <strong className="text-white">AI Judge Evaluation:</strong> Click "AI Judge Score" to trigger the automated judge evaluation for instant 0-100 rating.
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Stage 1v1 & Scoring */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/30 via-indigo-950/30 to-purple-950/30 border border-indigo-500/30 space-y-3">
            <h3 className="text-sm font-extrabold text-amber-300 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-amber-400" />
              4. Auditorium Stage 1v1 & Scoring Rubric
            </h3>
            <p className="text-white/70">
              For finals, select <strong>Stage Projector (1v1)</strong> at the top right to mirror a live split-screen comparing Player 1 vs Player 2 live typing and match score dials on the auditorium screen.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-2">
              <div className="bg-black/40 p-2.5 rounded-xl border border-white/10">
                <div className="text-[10px] text-white/40 font-bold uppercase">Accuracy</div>
                <div className="text-sm font-black text-blue-400">40%</div>
              </div>
              <div className="bg-black/40 p-2.5 rounded-xl border border-white/10">
                <div className="text-[10px] text-white/40 font-bold uppercase">Constraints</div>
                <div className="text-sm font-black text-emerald-400">30%</div>
              </div>
              <div className="bg-black/40 p-2.5 rounded-xl border border-white/10">
                <div className="text-[10px] text-white/40 font-bold uppercase">Efficiency</div>
                <div className="text-sm font-black text-purple-400">20%</div>
              </div>
              <div className="bg-black/40 p-2.5 rounded-xl border border-white/10">
                <div className="text-[10px] text-white/40 font-bold uppercase">Technique</div>
                <div className="text-sm font-black text-amber-400">10%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/40 flex items-center justify-between text-[11px] text-white/50">
          <span>INIXA AI Studio — College Edition Rulebook</span>
          <button
            onClick={handlePrintPDF}
            className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Save PDF Rulebook
          </button>
        </div>
      </motion.div>
    </div>
  );
}
