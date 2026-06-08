'use client';

import React, { useEffect } from 'react';

export default function AdminOverlay() {
  // Keyboard shortcut listener: Ctrl + Shift + Alt + V
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.altKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        window.open('/admin', '_blank');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return null;
}
