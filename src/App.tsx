"use client";
import React, { useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, ChevronDown, Sparkles, MoreHorizontal } from 'lucide-react';
import { ChatInterface } from './components/ChatInterface';
import { VideoGenerator, ImageGenerator } from './components/Generators';
import { MusicStudio } from './components/MusicStudio';
import { ProfileScreen } from './components/ProfileScreen';
import { AboutScreen } from './components/AboutScreen';
import { AuthScreen, type UserData } from './components/AuthScreen';
import { ModelSelector } from './components/ModelSelector';
import { DesktopSidebar, MobileSidebar, type TabType } from './components/Sidebar';
import { InixaLogo } from './components/Logos';
import { vibrate } from './utils/helpers';
import { getSelectedModel, setSelectedModel, type AIModel } from './api/aiEngine';
import { VibeCodeStudio } from './components/vibe';
import { DeveloperConsole } from './components/DeveloperConsole';
import VoiceAssistant from './components/VoiceAssistant';
import { DeepResearchAgent } from './components/DeepResearchAgent';
import { NoteIXLayout } from './components/note-ix/NoteIXLayout';

export interface ChatSession {
  id: string;
  title: string;
  updatedAt: number;
  type?: 'chat' | 'pdf';
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [currentModel, setCurrentModel] = useState(getSelectedModel());
  const [user, setUser] = useState<UserData | null>(() => {
    try {
      const saved = localStorage.getItem('inixa_user');
      if (saved) { const parsed = JSON.parse(saved); if (parsed?.name) return parsed; }
    } catch {}
    return null;
  });

  const [showSidebar, setShowSidebar] = useState(false);
  const [chatKey, setChatKey] = useState(0);

  const [chatSessions, setChatSessions] = useState<ChatSession[]>(() => {
    try { return JSON.parse(localStorage.getItem('inixa_chat_sessions') || '[]'); } catch { return []; }
  });
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    () => { try { const s = localStorage.getItem('inixa_chat_sessions'); if (s) { const p = JSON.parse(s); if (p.length > 0) return p[0].id; } } catch {} return null; }
  );

  const [lowPowerMode] = useState(() => {
    const saved = localStorage.getItem('inixa_low_power');
    return saved === null ? true : saved === 'true';
  });

  const toggleSidebar = () => { vibrate(40); setShowSidebar(!showSidebar); };

  const handleNewChat = () => {
    vibrate(60);
    const newId = Date.now().toString();
    const sessionType: 'chat' | 'pdf' = activeTab === 'pdf' ? 'pdf' : 'chat';
    const newSession: ChatSession = { id: newId, title: 'New conversation', updatedAt: Date.now(), type: sessionType };
    const updated = [newSession, ...chatSessions];
    setChatSessions(updated);
    localStorage.setItem('inixa_chat_sessions', JSON.stringify(updated));
    setActiveSessionId(newId);
    setChatKey(prev => prev + 1);
    setShowSidebar(false);
  };

  const handleDeleteSession = (id: string) => {
    vibrate(80);
    const updated = chatSessions.filter(s => s.id !== id);
    setChatSessions(updated);
    localStorage.setItem('inixa_chat_sessions', JSON.stringify(updated));
    localStorage.removeItem(`inixa_chat_${id}`);
    
    if (activeSessionId === id) {
      setActiveSessionId(null);
      setChatKey(prev => prev + 1);
    }
  };

  const handleSelectSession = (id: string) => {
    vibrate(30);
    const session = chatSessions.find(s => s.id === id);
    if (session?.type === 'pdf') {
      setActiveTab('pdf');
    } else {
      setActiveTab('chat');
    }
    setActiveSessionId(id);
    setChatKey(prev => prev + 1);
    setShowSidebar(false);
  };

  const handleLogin = (data: UserData) => { localStorage.setItem('inixa_user', JSON.stringify(data)); setUser(data); vibrate(50); };
  const handleLogout = () => { localStorage.removeItem('inixa_user'); setUser(null); vibrate(100); };
  const handleTabChange = (t: TabType) => { 
    vibrate(30); 
    if (activeTab !== t && (t === 'chat' || t === 'pdf')) {
      setActiveSessionId(null);
      setChatKey(prev => prev + 1);
    }
    setActiveTab(t); 
  };

  const sidebarProps = {
    user: user!,
    activeTab,
    onTabChange: handleTabChange,
    onNewChat: handleNewChat,
    onSelectSession: handleSelectSession,
    onDeleteSession: handleDeleteSession,
    chatSessions,
    activeSessionId,
    onOpenModelSelector: () => setShowModelSelector(true),
    chatKey,
    setChatKey,
  };

  return (
    <div className="h-[100dvh] bg-[#212121] text-white flex relative tracking-tight selection:bg-indigo-500/30 overflow-hidden font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap');
        body { font-family: 'Inter', 'Plus Jakarta Sans', sans-serif; background-color: #212121; }
        .font-serif { font-family: 'Playfair Display', serif; }
      `}</style>

      {/* Desktop Sidebar */}
      {user && <DesktopSidebar {...sidebarProps} />}

      <div className="flex-1 flex flex-col min-w-0 relative h-[100dvh]">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-50 flex items-center justify-between px-5 py-4 bg-[#212121] border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            {user && (
              <motion.button whileTap={{ scale: 0.9 }} onClick={toggleSidebar} className="w-9 h-9 rounded-xl flex items-center justify-center text-white/60 mr-2 hover:bg-white/5 transition-colors">
                {showSidebar ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </motion.button>
            )}
            <div className="w-8 h-8 rounded-lg flex items-center justify-center">
              <InixaLogo size={20} className="text-white" />
            </div>
            <h1 className="text-[15px] font-bold tracking-tight text-white">Inixa</h1>
          </div>
          {user && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowModelSelector(true)} 
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/5 border border-white/10 text-[11px] font-medium text-white/70 hover:text-white transition-all"
              >
                {currentModel.label.split(' ')[0]} <ChevronDown className="w-3 h-3 opacity-50" />
              </button>
            </div>
          )}
        </header>

        {/* Main Content */}
        <main className={`relative z-10 flex-1 flex flex-col h-full hide-scrollbar ${activeTab === 'note-ix' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          {!user ? (
            <AuthScreen onLogin={handleLogin} />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex-1 flex flex-col h-full min-h-full w-full"
              >
                {activeTab === 'chat' && (
                  <ChatInterface
                    key={`chat-${chatKey}`}
                    isCodex={false}
                    sessionId={activeSessionId}
                    onUpdateSessionTitle={(title) => {
                       let updated = [...chatSessions];
                       if (activeSessionId) {
                           if (!updated.find(s => s.id === activeSessionId)) {
                               updated.unshift({ id: activeSessionId, title, updatedAt: Date.now(), type: 'chat' });
                           } else {
                               updated = updated.map(s => s.id === activeSessionId ? { ...s, title, updatedAt: Date.now(), type: 'chat' } : s);
                           }
                       } else {
                           const newId = Date.now().toString();
                           const oldMsgs = localStorage.getItem('inixa_chat_messages');
                           if (oldMsgs) localStorage.setItem(`inixa_chat_${newId}`, oldMsgs);
                           updated.unshift({ id: newId, title, updatedAt: Date.now(), type: 'chat' });
                           setActiveSessionId(newId);
                       }
                       setChatSessions(updated);
                       localStorage.setItem('inixa_chat_sessions', JSON.stringify(updated));
                    }}
                    userName={user?.name}
                    currentModel={currentModel}
                    setShowModelSelector={setShowModelSelector}
                  />
                )}
                {activeTab === 'codex' && (
                  <ChatInterface
                    key={`codex-${chatKey}`}
                    isCodex={true}
                    userName={user?.name}
                    currentModel={currentModel}
                    setShowModelSelector={setShowModelSelector}
                  />
                )}
                {activeTab === 'pdf' && (
                  <ChatInterface
                    key={`pdf-${chatKey}`}
                    isCodex={false}
                    isPdfMode={true}
                    sessionId={activeSessionId}
                    onUpdateSessionTitle={(title) => {
                       let updated = [...chatSessions];
                       if (activeSessionId) {
                           if (!updated.find(s => s.id === activeSessionId)) {
                               updated.unshift({ id: activeSessionId, title, updatedAt: Date.now(), type: 'pdf' });
                           } else {
                               updated = updated.map(s => s.id === activeSessionId ? { ...s, title, updatedAt: Date.now(), type: 'pdf' } : s);
                           }
                       } else {
                           const newId = Date.now().toString();
                           updated.unshift({ id: newId, title, updatedAt: Date.now(), type: 'pdf' });
                           setActiveSessionId(newId);
                       }
                       setChatSessions(updated);
                       localStorage.setItem('inixa_chat_sessions', JSON.stringify(updated));
                    }}
                    userName={user?.name}
                    currentModel={currentModel}
                    setShowModelSelector={setShowModelSelector}
                  />
                )}
                {activeTab === 'note-ix' && (
                  <NoteIXLayout currentModel={currentModel} setShowModelSelector={setShowModelSelector} />
                )}
                {activeTab === 'image' && <ImageGenerator />}
                {activeTab === 'video' && <VideoGenerator />}
                {activeTab === 'music' && <MusicStudio />}
                {activeTab === 'vibe' && (
                  <div className="flex-1 flex flex-col h-full">
                    <div className="lg:hidden flex-1 flex flex-col items-center justify-center p-8 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6 animate-pulse">
                        <Sparkles className="w-8 h-8 text-indigo-400" />
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-2">Desktop Only</h2>
                      <p className="text-white/40 max-w-xs mx-auto">Vibe Studio is an elite workspace for heavy coding. Please open this feature on a laptop or PC for the best experience.</p>
                    </div>
                    <div className="hidden lg:flex flex-1 flex-col h-full">
                      <VibeCodeStudio />
                    </div>
                  </div>
                )}
                {activeTab === 'profile' && <ProfileScreen user={user} onLogout={handleLogout} />}
                {activeTab === 'about' && <AboutScreen />}
                {activeTab === 'api' && <DeveloperConsole />}
                {activeTab === 'voice' && <VoiceAssistant />}
                {activeTab === 'deep-research' && <DeepResearchAgent currentModel={currentModel} setShowModelSelector={setShowModelSelector} />}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>

      {/* Model Selector Modal */}
      <AnimatePresence>
        {showModelSelector && (
          <ModelSelector
            currentModel={currentModel}
            onSelect={(m) => { setSelectedModel(m.id); setCurrentModel(m); setShowModelSelector(false); }}
            onClose={() => setShowModelSelector(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {user && showSidebar && (
          <MobileSidebar {...sidebarProps} onClose={() => setShowSidebar(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

