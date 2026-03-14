'use client';

import { useRef } from 'react';

// Short alert tone generated via AudioContext — no external file needed
function playAlertTone() {
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
    oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1); // ~C#6

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  } catch {
    // AudioContext not available (SSR, denied permission, etc.)
  }
}

export function useNotificationSound() {
  const lastPlayedRef = useRef(0);
  const MIN_INTERVAL_MS = 3000; // Don't spam sounds closer than 3s apart

  function play() {
    const now = Date.now();
    if (now - lastPlayedRef.current < MIN_INTERVAL_MS) {
      return;
    }
    lastPlayedRef.current = now;
    playAlertTone();
  }

  return { play };
}
