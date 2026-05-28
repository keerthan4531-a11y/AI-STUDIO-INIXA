import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, MessageSquareText, User, Mic } from 'lucide-react';

interface Turn {
  host: string;
  text: string;
}

import { aiChat, type AIModel } from '../../api/aiEngine';
import { Loader2 } from 'lucide-react';
import { Notebook, NoteIXMessage } from './NoteIXTypes';

interface PodcastPlayerProps {
  content: string; // The raw JSON string returned by DeepSeek
  currentModel: AIModel;
  setNotebook?: React.Dispatch<React.SetStateAction<Notebook>>;
}

export function PodcastPlayer({ content, currentModel, setNotebook }: PodcastPlayerProps) {
  const [script, setScript] = useState<Turn[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(-1);
  const [interactiveMode, setInteractiveMode] = useState(false);
  const [question, setQuestion] = useState('');
  const [isGeneratingTangent, setIsGeneratingTangent] = useState(false);
  
  const synth = window.speechSynthesis;
  
  useEffect(() => {
    try {
      // Find JSON block in the markdown if any
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      const rawJson = jsonMatch ? jsonMatch[1] : content.replace(/```json|```/g, '');
      const parsed = JSON.parse(rawJson);
      setScript(Array.isArray(parsed) ? parsed : []);
    } catch (e) {
      console.error('Failed to parse podcast script:', e);
    }
  }, [content]);

  const speakTurn = (index: number) => {
    if (index >= script.length) {
      setIsPlaying(false);
      setCurrentTurnIndex(-1);
      return;
    }

    setCurrentTurnIndex(index);
    const turn = script[index];
    const utterance = new SpeechSynthesisUtterance(turn.text);
    
    // Choose voice based on host
    const voices = synth.getVoices();
    if (turn.host === "1" || turn.host?.toLowerCase() === "host 1") {
      // Try to find a male voice
      utterance.voice = voices.find(v => v.name.includes('Male') || v.name.includes('Google UK English Male')) || voices[0];
      utterance.pitch = 0.9;
    } else {
      // Try to find a female voice
      utterance.voice = voices.find(v => v.name.includes('Female') || v.name.includes('Google UK English Female')) || voices[0];
      utterance.pitch = 1.1;
    }

    utterance.onend = () => {
      speakTurn(index + 1);
    };

    synth.speak(utterance);
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      synth.pause();
      setIsPlaying(false);
    } else {
      if (synth.paused) {
        synth.resume();
        setIsPlaying(true);
      } else {
        setIsPlaying(true);
        speakTurn(0);
      }
    }
  };

  const handleStop = () => {
    synth.cancel();
    setIsPlaying(false);
    setCurrentTurnIndex(-1);
  };

  const askQuestion = async () => {
    if (!question.trim()) return;
    
    synth.pause();
    setIsPlaying(false);
    setIsGeneratingTangent(true);
    
    try {
      const prompt = `You are two podcast hosts (Host 1 and Host 2) currently discussing a topic. The user has interrupted the podcast to ask a question: "${question}".
      
Please generate a 2-turn tangent addressing the question directly to the user in a conversational, podcast tone, then transition back to the main topic.

Format your response as a JSON array of dialogue turns:
[
  { "host": "1", "text": "Great question from the listener! ..." },
  { "host": "2", "text": "Exactly. And to add to that..." }
]`;

      const response = await aiChat([{ role: 'user', content: prompt }], undefined, currentModel);
      
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      const rawJson = jsonMatch ? jsonMatch[1] : response.replace(/```json|```/g, '');
      const parsedTangent = JSON.parse(rawJson);
      
      if (Array.isArray(parsedTangent)) {
        // Insert tangent right after the current turn
        const newScript = [...script];
        newScript.splice(currentTurnIndex + 1, 0, ...parsedTangent);
        setScript(newScript);
        
        // Add to main chat history if available
        if (setNotebook) {
          const userMsg: NoteIXMessage = { id: Math.random().toString(), role: 'user', content: question, timestamp: Date.now() };
          const aiMsgContent = parsedTangent.map(t => `**Host ${t.host}:** ${t.text}`).join('\n\n');
          const aiMsg: NoteIXMessage = { id: Math.random().toString(), role: 'assistant', content: aiMsgContent, timestamp: Date.now() + 1 };
          
          setNotebook(prev => ({
            ...prev,
            chatHistory: [...prev.chatHistory, userMsg, aiMsg]
          }));
        }

        // Immediately start speaking the tangent
        setInteractiveMode(false);
        setQuestion('');
        setIsPlaying(true);
        speakTurn(currentTurnIndex + 1);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to answer the question.');
    } finally {
      setIsGeneratingTangent(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      synth.cancel();
    };
  }, []);

  if (script.length === 0) {
    return <div className="text-white/50 text-xs p-4 text-center">Failed to parse audio script.</div>;
  }

  return (
    <div className="flex flex-col h-full bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-fuchsia-500/20 flex items-center justify-center">
            <Mic className="w-5 h-5 text-fuchsia-400 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Audio Overview</h4>
            <p className="text-[10px] text-fuchsia-300/80 uppercase tracking-widest">2 Hosts • Generated</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setInteractiveMode(!interactiveMode); if(isPlaying) handlePlayPause(); }} className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${interactiveMode ? 'bg-fuchsia-500 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}>
            Ask Q
          </button>
          <button onClick={handlePlayPause} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all text-white">
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <button onClick={handleStop} className="w-10 h-10 rounded-full bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-all text-red-400">
            <Square className="w-4 h-4" />
          </button>
        </div>
      </div>

      {interactiveMode && (
        <div className="p-4 bg-fuchsia-500/10 border-b border-fuchsia-500/20 flex gap-2 animate-in slide-in-from-top-2">
          <input 
            type="text" 
            placeholder="Interrupt and ask a question..." 
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && askQuestion()}
            disabled={isGeneratingTangent}
            className="flex-1 bg-black/20 border border-fuchsia-500/30 rounded-xl px-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-fuchsia-400"
          />
          <button 
            onClick={askQuestion}
            disabled={isGeneratingTangent || !question.trim()}
            className="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm flex items-center gap-2 transition-colors"
          >
            {isGeneratingTangent ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ask'}
          </button>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 hide-scrollbar">
        {script.map((turn, i) => (
          <div key={i} className={`flex gap-3 ${currentTurnIndex === i ? 'opacity-100 scale-[1.02]' : 'opacity-50'} transition-all duration-300`}>
            <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${turn.host === "1" ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
              <User className="w-4 h-4" />
            </div>
            <div className={`flex-1 p-3 rounded-2xl ${turn.host === "1" ? 'bg-blue-500/5 border border-blue-500/10 rounded-tl-none' : 'bg-purple-500/5 border border-purple-500/10 rounded-tl-none'}`}>
              <span className="text-[9px] uppercase tracking-widest font-bold block mb-1 opacity-60">
                Host {turn.host}
              </span>
              <p className="text-xs text-white/90 leading-relaxed font-medium">
                {turn.text}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
