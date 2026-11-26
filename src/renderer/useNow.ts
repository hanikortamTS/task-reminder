import { useEffect, useState } from 'react';

/** Re-renders every 30 s so "overdue by …" labels stay current. */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const h = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(h);
  }, [intervalMs]);
  return now;
}
