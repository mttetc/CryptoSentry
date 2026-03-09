import { useEffect, useRef, useState } from 'react';
import type { SocialAlertWithStats } from '@/types/alerts';

/**
 * Returns a Set of alert IDs that just received new matches (tweetCount increased).
 * The IDs are cleared automatically after 1.5 s (duration of the flash animation).
 */
export function useNewMatchAlertIds(alerts: SocialAlertWithStats[]): Set<string> {
  const prevCounts = useRef<Map<string, number>>(new Map());
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const newFlash = new Set<string>();

    for (const alert of alerts) {
      const prev = prevCounts.current.get(alert.id);
      if (prev !== undefined && alert.tweetCount > prev) {
        newFlash.add(alert.id);
      }
      prevCounts.current.set(alert.id, alert.tweetCount);
    }

    if (newFlash.size === 0) {
      return;
    }

    setFlashIds(newFlash);
    const timer = setTimeout(() => setFlashIds(new Set()), 1500);
    return () => clearTimeout(timer);
  }, [alerts]);

  return flashIds;
}
