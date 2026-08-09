'use client';

import { useEffect, useState } from 'react';

const WORKER_URL = 'https://ultimate-ai-worker.haruyhari930.workers.dev';

export function TurnstileHarvester() {
  const [needsActivation, setNeedsActivation] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkStatus() {
      try {
        const res = await fetch(`${WORKER_URL}/minitool/status`);
        const status = await res.json();
        if (isMounted) {
          setNeedsActivation(status.ok && !status.session_valid);
        }
      } catch (err) {
        console.warn('[TurnstileHarvester] Status check warning:', err);
      }
    }

    checkStatus();
    const interval = setInterval(checkStatus, 30000);

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'MINITOOL_ACTIVATED') {
        console.log('[TurnstileHarvester] 🎉 Session activated!', event.data);
        setNeedsActivation(false);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      isMounted = false;
      window.removeEventListener('message', handleMessage);
      clearInterval(interval);
    };
  }, []);

  if (!needsActivation) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex items-center gap-3 rounded-xl border border-amber-500/30 bg-gray-950/90 p-3 text-xs text-amber-200 shadow-2xl backdrop-blur-md">
      <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
      <span>MiniToolAI Sessions Expired</span>
      <button
        onClick={() => {
          window.open(
            `${WORKER_URL}/minitool/init`,
            'minitool_setup',
            'width=480,height=560,top=100,left=100'
          );
        }}
        className="rounded-lg bg-amber-500 px-3 py-1 text-[11px] font-semibold text-black transition-all hover:bg-amber-400 active:scale-95"
      >
        ⚡ Activate (1s)
      </button>
    </div>
  );
}
