import React, { useState, useEffect, useCallback } from 'react';

// Same-origin URL via Next.js rewrite proxy — no CORS issues!
const BOLT_URL = "/vibe-studio/?v=2";

export function VibeCodeStudio() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [retryCount, setRetryCount] = useState(0);

  const checkServer = useCallback(async () => {
    try {
      setStatus('checking');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      
      const resp = await fetch(BOLT_URL, { 
        signal: controller.signal,
        cache: 'no-store'
      });
      clearTimeout(timeoutId);
      
      if (resp.ok || resp.status === 304) {
        setStatus('connected');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    checkServer();
  }, [checkServer, retryCount]);

  // Auto-retry every 3 seconds when in error state
  useEffect(() => {
    if (status === 'error') {
      const timer = setTimeout(() => {
        setRetryCount(c => c + 1);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, retryCount]);

  if (status === 'checking') {
    return (
      <div style={{
        width: '100%', height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a',
        gap: '16px'
      }}>
        <div style={{
          width: 40, height: 40, border: '3px solid rgba(99,102,241,0.2)',
          borderTopColor: '#6366f1', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, fontFamily: 'Outfit, sans-serif' }}>
          Connecting to Vibe Engine...
        </span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={{
        width: '100%', height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a',
        gap: '20px', fontFamily: 'Outfit, sans-serif'
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28
        }}>⚡</div>
        <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: 0 }}>
          Vibe Engine Starting...
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0, textAlign: 'center', maxWidth: 340, lineHeight: 1.6 }}>
          The Vibe Engine is warming up. It will auto-connect when ready.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', 
            background: '#f59e0b',
            animation: 'pulse 1.5s ease-in-out infinite'
          }} />
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
            Auto-retrying... (attempt {retryCount + 1})
          </span>
        </div>
        <button
          onClick={() => setRetryCount(c => c + 1)}
          style={{
            marginTop: 8, padding: '10px 24px', background: '#6366f1',
            color: '#fff', border: 'none', borderRadius: 10, fontSize: 13,
            fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
            transition: 'all 0.2s',
          }}
          onMouseOver={e => (e.currentTarget.style.background = '#4f46e5')}
          onMouseOut={e => (e.currentTarget.style.background = '#6366f1')}
        >
          Retry Now
        </button>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0a0a0a' }}>
      <iframe
        src={BOLT_URL}
        style={{ width: '100%', flex: 1, border: 'none', backgroundColor: '#0a0a0a' }}
        title="Vibe Studio Engine"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
