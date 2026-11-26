/** taskreminder:// links used by Windows toast buttons (SR-006, US-011). */
import type { SnoozeChoice } from './dates';

export const PROTOCOL = 'taskreminder';

export type ToastAction =
  | { action: 'open'; id: string | null }
  | { action: 'done'; id: string }
  | { action: 'snooze'; id: string; choice: SnoozeChoice };

const ID = /^[A-Za-z0-9-]{1,64}$/;
const CHOICES: SnoozeChoice[] = ['10m', '1h', 'tomorrow'];

export function actionUrl(a: ToastAction): string {
  const q = new URLSearchParams();
  if (a.id) q.set('id', a.id);
  if (a.action === 'snooze') q.set('c', a.choice);
  return `${PROTOCOL}://${a.action}?${q.toString()}`;
}

/** Parses a taskreminder:// URL from the command line. Anything unexpected returns null. */
export function parseActionUrl(raw: string): ToastAction | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== `${PROTOCOL}:`) return null;
  const action = u.hostname;
  const id = u.searchParams.get('id');
  if (id !== null && !ID.test(id)) return null;
  if (action === 'open') return { action, id };
  if (!id) return null;
  if (action === 'done') return { action, id };
  if (action === 'snooze') {
    const c = u.searchParams.get('c') as SnoozeChoice | null;
    return c && CHOICES.includes(c) ? { action, id, choice: c } : null;
  }
  return null;
}

export function findActionUrl(argv: string[]): ToastAction | null {
  for (const a of argv) if (a.startsWith(`${PROTOCOL}://`)) return parseActionUrl(a);
  return null;
}
