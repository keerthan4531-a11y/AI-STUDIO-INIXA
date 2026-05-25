"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, VolumeX, Send, Loader2, X, Settings2, ChevronDown } from 'lucide-react';
import { aiChat, getSelectedModel, AI_MODELS, AIModel, CF_WORKER_URL } from '../api/aiEngine';

// ═══════════════════════════════════════════════════════════════════
// 🎙️ Voice Assistant — Talk to AI, hear it respond
// ═══════════════════════════════════════════════════════════════════
// Uses Web Speech API for speech recognition (browser built-in)
// Uses TTS API route for natural speech output (via auto-scraped keys)
// Supports Tamil, English, Hindi, and more languages
// ═══════════════════════════════════════════════════════════════════

const VOICES = [
  { id: 'Kore', label: 'Kore', desc: 'Soft female voice (Tamil)' },
  { id: 'Aoede', label: 'Aoede', desc: 'Warm female voice' },
];

const LANGUAGES = [
  { code: 'ta-IN', label: 'தமிழ் (Tamil)' },
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-IN', label: 'English (India)' },
  { code: 'hi-IN', label: 'हिन्दी (Hindi)' },
  { code: 'te-IN', label: 'తెలుగు (Telugu)' },
  { code: 'ml-IN', label: 'മലയാളം (Malayalam)' },
  { code: 'kn-IN', label: 'ಕನ್ನಡ (Kannada)' },
];

interface VoiceMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  audioUrl?: string;
  timestamp: number;
}

export default function VoiceAssistant() {
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [selectedLang, setSelectedLang] = useState('ta-IN');
  const [sttModel, setSttModel] = useState('browser');
  const [showSettings, setShowSettings] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [customApiKey, setCustomApiKey] = useState('');
  const [pollinationApiKey, setPollinationApiKey] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [pulseIntensity, setPulseIntensity] = useState(0);

  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const transcriptRef = useRef('');
  const isProcessingRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  // Load custom API key on mount
  useEffect(() => {
    const savedGemini = localStorage.getItem('gemini_tts_key');
    if (savedGemini) setCustomApiKey(savedGemini);
    
    const savedPollination = localStorage.getItem('pollination_stt_key');
    if (savedPollination) setPollinationApiKey(savedPollination);
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize Speech Recognition or MediaRecorder
  const startListening = useCallback(async () => {
    if (sttModel === 'browser') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert('Speech Recognition is not supported in your browser. Try Chrome.');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = selectedLang;
      recognition.interimResults = true;
      recognition.continuous = true;

      recognition.onresult = (event: any) => {
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript;
        }
        transcriptRef.current = fullTranscript;
        setTranscript(fullTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      transcriptRef.current = '';
      setTranscript('');
      recognition.start();
      setIsListening(true);
    } else {
      // Use MediaRecorder for Universal/Whisper API proxy
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        audioChunksRef.current = [];
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.start(100);
        mediaRecorderRef.current = mediaRecorder;
        
        transcriptRef.current = '';
        setTranscript('🎤 Recording...');
        setIsListening(true);
      } catch (err) {
        console.error('Error accessing microphone:', err);
        alert('Could not access microphone.');
      }
    }
  }, [selectedLang, sttModel]);

  const stopListening = useCallback(() => {
    setIsListening(false);

    if (sttModel === 'browser') {
      recognitionRef.current?.stop();
      const textToSend = transcriptRef.current.trim();
      if (textToSend && !isProcessingRef.current) {
        handleSendMessage(textToSend);
      }
      transcriptRef.current = '';
      setTranscript('');
    } else {
      // Process MediaRecorder audio for Pollinations
      const mediaRecorder = mediaRecorderRef.current;
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          mediaRecorder.stream.getTracks().forEach(track => track.stop());
          
          setTranscript('⏳ Transcribing...');
          setIsProcessing(true);
          
          try {
            const formData = new FormData();
            formData.append('file', audioBlob, 'audio.webm');
            formData.append('model', 'whisper-large-v3-turbo');
            
            const res = await fetch(`${CF_WORKER_URL}/v1/audio/transcriptions`, {
              method: 'POST',
              body: formData
            });
            
            if (!res.ok) throw new Error('Transcription failed');
            const data = await res.json();
            
            setTranscript('');
            setIsProcessing(false);
            
            const textToSend = data.text?.trim() || '';
            if (textToSend && !isProcessingRef.current) {
              handleSendMessage(textToSend);
            }
          } catch (err) {
            console.error('Pollinations STT error:', err);
            setTranscript('❌ Transcription failed');
            setTimeout(() => setTranscript(''), 2000);
            setIsProcessing(false);
          }
        };
        mediaRecorder.stop();
      }
    }
  }, [sttModel]);

  // Send message to AI
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    setIsProcessing(true);
    
    const userMsg: VoiceMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: text.trim(),
      timestamp: Date.now(),
    };
    
    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      // Build conversation history for context
      const allMsgs = [...messages, userMsg].map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.text,
      }));

      // Add system prompt for voice assistant behavior
      const systemMsg = {
        role: 'system' as const,
        content: `You are a friendly voice assistant, similar to Gemini Live. Keep responses concise (2-3 sentences max) since they will be spoken aloud. ALWAYS speak in natural, conversational Tamil (Tamil script or Tanglish, but Tamil script is preferred) by default, like a native speaker. Be friendly, energetic, and engaging.`
      };

      const result = await aiChat([systemMsg, ...allMsgs]);

      const assistantMsg: VoiceMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: result,
        timestamp: Date.now(),
      };

      // Auto-speak the response (syncs display with audio playback)
      if (autoSpeak && audioEnabled) {
        await speakText(result, assistantMsg);
      } else {
        setMessages(prev => [...prev, assistantMsg]);
      }
    } catch (error) {
      console.error('Voice chat error:', error);
      const errorMsg: VoiceMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: '❌ Sorry, I had trouble processing that. Please try again.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  };

  // Text-to-Speech using Gemini API
  const speakText = async (text: string, msg: VoiceMessage) => {
    setIsSpeaking(true);
    try {
      const GEMINI_KEY = customApiKey || 'AIzaSyB4oppmKaumsbtT607CBT9meUvRAyZlYjk';
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key=${GEMINI_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: selectedVoice
                }
              }
            }
          }
        }),
      });

      if (!res.ok) {
        console.error('TTS failed:', res.status);
        // Fallback to browser TTS
        fallbackSpeak(text);
        return;
      }

      const data = await res.json();
      const base64Audio = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      
      if (!base64Audio) {
        throw new Error('No audio data received');
      }

      // Convert Base64 to raw PCM bytes
      const byteCharacters = atob(base64Audio);
      const byteArray = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArray[i] = byteCharacters.charCodeAt(i);
      }
      
      // Gemini returns raw 16-bit PCM at 24kHz. We must wrap it in a WAV header to play it.
      const wavHeader = new ArrayBuffer(44);
      const view = new DataView(wavHeader);
      
      view.setUint32(0, 0x52494646, false); // "RIFF"
      view.setUint32(4, 36 + byteArray.length, true); // File size
      view.setUint32(8, 0x57415645, false); // "WAVE"
      view.setUint32(12, 0x666D7420, false); // "fmt "
      view.setUint32(16, 16, true); // format chunk size
      view.setUint16(20, 1, true); // PCM format
      view.setUint16(22, 1, true); // 1 channel
      view.setUint32(24, 24000, true); // 24000 sample rate
      view.setUint32(28, 24000 * 2, true); // byte rate
      view.setUint16(32, 2, true); // block align
      view.setUint16(34, 16, true); // 16 bits per sample
      view.setUint32(36, 0x64617461, false); // "data"
      view.setUint32(40, byteArray.length, true); // data size

      const audioBlob = new Blob([wavHeader, byteArray], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Add message to chat only when audio is ready to play (synchronized)
      const msgWithAudio = { ...msg, audioUrl };
      setMessages(prev => {
        if (!prev.find(m => m.id === msg.id)) {
          return [...prev, msgWithAudio];
        }
        return prev.map(m => m.id === msg.id ? msgWithAudio : m);
      });

      // Play audio
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsSpeaking(false);
        setPulseIntensity(0);
      };
      
      audio.onerror = () => {
        setIsSpeaking(false);
        setPulseIntensity(0);
        fallbackSpeak(text);
      };

      // Audio visualization
      try {
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaElementSource(audio);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        analyserRef.current = analyser;

        const visualize = () => {
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setPulseIntensity(avg / 255);
          if (!audio.paused) {
            animFrameRef.current = requestAnimationFrame(visualize);
          }
        };
        audio.onplay = () => visualize();
      } catch (e) {
        // AudioContext may fail in some environments
      }

      await audio.play();
    } catch (e) {
      console.error('TTS error:', e);
      setIsSpeaking(false);
      fallbackSpeak(text);
    }
  };

  // Browser fallback TTS
  const fallbackSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = selectedLang;
      utterance.rate = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsSpeaking(false);
    }
  };

  // Stop speaking
  const stopSpeaking = () => {
    audioRef.current?.pause();
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setPulseIntensity(0);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  };

  // Replay audio for a message
  const replayAudio = async (msg: VoiceMessage) => {
    if (msg.audioUrl) {
      stopSpeaking();
      const audio = new Audio(msg.audioUrl);
      audioRef.current = audio;
      audio.onended = () => setIsSpeaking(false);
      setIsSpeaking(true);
      await audio.play();
    } else {
      await speakText(msg.text, msg);
    }
  };

  const currentModel = getSelectedModel();

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#0a0b12] to-[#0f1018] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div 
              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow-xl shadow-violet-500/20"
              style={{
                transform: `scale(${1 + pulseIntensity * 0.15})`,
                transition: 'transform 0.1s ease'
              }}
            >
              <Mic className="w-6 h-6 text-white" />
            </div>
            {isSpeaking && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-[#0a0b12] animate-pulse" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Voice Assistant</h2>
            <p className="text-[11px] text-white/30 font-medium">
              {currentModel.label} • {VOICES.find(v => v.id === selectedVoice)?.label} voice
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`p-2.5 rounded-xl transition-all ${audioEnabled ? 'text-violet-400 bg-violet-500/10' : 'text-white/30 bg-white/5'}`}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2.5 rounded-xl transition-all ${showSettings ? 'text-violet-400 bg-violet-500/10' : 'text-white/30 bg-white/5 hover:text-white'}`}
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-white/5 overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {/* Voice Selection */}
              <div>
                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">AI Voice</p>
                <div className="grid grid-cols-3 gap-2">
                  {VOICES.map(voice => (
                    <button
                      key={voice.id}
                      onClick={() => setSelectedVoice(voice.id)}
                      className={`p-2.5 rounded-xl text-left transition-all ${
                        selectedVoice === voice.id
                          ? 'bg-violet-500/20 border border-violet-500/30 text-violet-300'
                          : 'bg-white/5 border border-transparent text-white/50 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <p className="text-[12px] font-bold">{voice.label}</p>
                      <p className="text-[9px] opacity-60">{voice.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Language Selection */}
              <div>
                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Speech Language</p>
                <div className="grid grid-cols-2 gap-2">
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => setSelectedLang(lang.code)}
                      className={`p-2 rounded-xl text-[12px] font-medium transition-all ${
                        selectedLang === lang.code
                          ? 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-300'
                          : 'bg-white/5 border border-transparent text-white/50 hover:text-white'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* STT Model Selection */}
              <div>
                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Speech Recognition Engine</p>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'browser', label: 'Browser Built-in (Live Text)' },
                    { id: 'universal-2', label: 'Pollinations Universal-2 (High Accuracy)' },
                    { id: 'whisper', label: 'Pollinations Whisper (Multilingual)' }
                  ].map(stt => (
                    <button
                      key={stt.id}
                      onClick={() => setSttModel(stt.id)}
                      className={`p-2 rounded-xl text-[12px] font-medium text-left transition-all ${
                        sttModel === stt.id
                          ? 'bg-violet-500/20 border border-violet-500/30 text-violet-300'
                          : 'bg-white/5 border border-transparent text-white/50 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {stt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto-speak toggle */}
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-white/50">Auto-speak responses</span>
                <button
                  onClick={() => setAutoSpeak(!autoSpeak)}
                  className={`w-10 h-5 rounded-full transition-all relative ${autoSpeak ? 'bg-violet-600' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${autoSpeak ? 'left-5.5 translate-x-0.5' : 'left-0.5'}`} />
                </button>
              </div>

              {/* Custom API Key */}
              <div>
                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Gemini API Key (For TTS)</p>
                <input
                  type="password"
                  value={customApiKey}
                  onChange={(e) => {
                    setCustomApiKey(e.target.value);
                    localStorage.setItem('gemini_tts_key', e.target.value);
                  }}
                  placeholder="Paste your Gemini API key here..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[12px] text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 transition-all mb-3"
                />

                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Pollinations API Key (For Whisper/U2)</p>
                <input
                  type="password"
                  value={pollinationApiKey}
                  onChange={(e) => {
                    setPollinationApiKey(e.target.value);
                    localStorage.setItem('pollination_stt_key', e.target.value);
                  }}
                  placeholder="Get key from enter.pollinations.ai..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[12px] text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 transition-all"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 hide-scrollbar">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-600/20 to-indigo-700/20 flex items-center justify-center mb-6 border border-violet-500/10">
              <Mic className="w-10 h-10 text-violet-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Hey! I&apos;m your Voice Assistant</h3>
            <p className="text-[13px] text-white/40 max-w-sm leading-relaxed">
              Tap the mic button to talk to me, or type a message below. 
              I can speak Tamil, English, Hindi and more! 🎙️
            </p>
            <div className="flex flex-wrap gap-2 mt-6 justify-center">
              {['Tell me a joke', 'What\'s AI?', 'என் பெயர் என்ன?', 'Hello!'].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => handleSendMessage(suggestion)}
                  className="px-4 py-2 rounded-full bg-white/5 text-white/40 text-[12px] font-medium border border-white/5 hover:bg-white/10 hover:text-white transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-1' : ''}`}>
              <div
                className={`px-4 py-3 rounded-2xl text-[14px] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-violet-600 text-white rounded-br-md'
                    : 'bg-white/5 text-white/80 border border-white/5 rounded-bl-md'
                }`}
              >
                {msg.text}
              </div>
              <div className="flex items-center gap-2 mt-1 px-1">
                <span className="text-[10px] text-white/20">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {msg.role === 'assistant' && audioEnabled && (
                  <button
                    onClick={() => replayAudio(msg)}
                    className="text-[10px] text-violet-400/50 hover:text-violet-400 transition-colors flex items-center gap-1"
                  >
                    <Volume2 className="w-3 h-3" /> Play
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}

        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/5 rounded-bl-md flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
              <span className="text-[13px] text-white/40">Thinking...</span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Controls - Push-to-Talk UI */}
      <div className="flex flex-col items-center justify-center pb-8 pt-4">
        {/* Live Transcript Display */}
        <div className="h-20 flex flex-col items-center justify-end mb-8 px-8 w-full">
          <AnimatePresence mode="popLayout">
            {transcript && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center w-full"
              >
                <p className="text-xl md:text-3xl font-medium text-white tracking-wide drop-shadow-md leading-relaxed">
                  {transcript}
                </p>
                <div className="flex justify-center gap-1.5 mt-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Center Mic Button */}
        <div className="relative flex items-center justify-center mt-4">
          {/* Pulsing background rings when listening */}
          {isListening && (
            <>
              <div className="absolute inset-0 w-28 h-28 rounded-full bg-violet-500/20 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="absolute inset-0 w-28 h-28 rounded-full bg-violet-500/30 animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.2s' }} />
            </>
          )}

          {/* Main Button */}
          <button
            onPointerDown={(e) => {
              // Prevent default to keep button pressed
              e.preventDefault();
              if (!isProcessing && !isListening) startListening();
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              if (isListening) stopListening();
            }}
            onPointerLeave={(e) => {
              e.preventDefault();
              if (isListening) stopListening();
            }}
            onContextMenu={(e) => e.preventDefault()}
            disabled={isProcessing}
            className={`relative z-10 w-24 h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl touch-none ${
              isProcessing 
                ? 'bg-white/10 opacity-50 cursor-not-allowed scale-95'
                : isListening
                  ? 'bg-gradient-to-br from-violet-500 to-fuchsia-600 scale-110 shadow-violet-500/50'
                  : 'bg-gradient-to-br from-violet-600 to-indigo-700 hover:scale-105 hover:shadow-violet-500/40'
            }`}
          >
            {isProcessing ? (
              <Loader2 className="w-10 h-10 text-white/50 animate-spin" />
            ) : isListening ? (
              <Mic className="w-12 h-12 text-white animate-pulse" />
            ) : (
              <Mic className="w-10 h-10 text-white" />
            )}
          </button>
        </div>
        
        <p className={`mt-8 text-sm md:text-base font-medium transition-opacity ${isListening ? 'text-violet-400 drop-shadow-md' : 'text-white/40'}`}>
          {isProcessing ? 'Thinking...' : isListening ? 'Listening... release to send' : 'Hold to speak'}
        </p>

        {/* Stop speaking button */}
        {isSpeaking && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            type="button"
            onClick={stopSpeaking}
            className="absolute bottom-8 right-8 p-4 rounded-full bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-all shadow-lg border border-orange-500/30"
          >
            <X className="w-6 h-6" />
          </motion.button>
        )}
      </div>
    </div>
  );
}
