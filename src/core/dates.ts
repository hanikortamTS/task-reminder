/** Date helpers — LLD-008 (SR-001, SR-007). Pure: every function takes `now` explicitly. */
export type ChipId = 'today' | 'tomorrow' | 'nextweek';

export interface Chip {
  id: ChipId;
  label: string;
  at: Date;
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export function atTime(base: Date, h: number, m = 0): Date {
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

export function startOfDay(d: Date): Date {
  return atTime(d, 0, 0);
}

export function endOfDay(d: Date): Date {
  const e = new Date(d);
  e.setHours(23, 59, 59, 999);
  return e;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Rounds up to the next multiple of 5 minutes. */
function roundUp5(d: Date): Date {
  const r = new Date(d);
  r.setSeconds(0, 0);
  const m = r.getMinutes();
  r.setMinutes(m + ((5 - (m % 5)) % 5));
  return r;
}

/**
 * Quick-add chips (SR-001). "Today 17:00" becomes "In 1 hour" once 17:00 has passed
 * so the chip never creates an already-overdue task (implementation decision D-02).
 */
export function quickChips(now: Date): Chip[] {
  const today17 = atTime(now, 17);
  const today: Chip =
    now < today17
      ? { id: 'today', label: 'Today 17:00', at: today17 }
      : { id: 'today', label: 'In 1 hour', at: roundUp5(new Date(now.getTime() + HOUR)) };
  const tomorrow: Chip = { id: 'tomorrow', label: 'Tomorrow 9:00', at: atTime(addDays(now, 1), 9) };
  const daysToMonday = ((8 - now.getDay()) % 7) || 7;
  const nextweek: Chip = { id: 'nextweek', label: 'Next Mon 9:00', at: atTime(addDays(now, daysToMonday), 9) };
  return [today, tomorrow, nextweek];
}

export function formatDuration(ms: number): string {
  const a = Math.abs(ms);
  if (a < HOUR) return `${Math.max(1, Math.round(a / MIN))} min`;
  if (a < DAY) return `${Math.round(a / HOUR)} h`;
  return `${Math.round(a / DAY)} d`;
}

export function formatClock(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "17:00", "tomorrow 09:00", "Fri 28 Nov 09:00" relative to now. */
export function formatWhen(d: Date, now: Date): string {
  const dayDiff = Math.round((startOfDay(d).getTime() - startOfDay(now).getTime()) / DAY);
  if (dayDiff === 0) return formatClock(d);
  if (dayDiff === 1) return `tomorrow ${formatClock(d)}`;
  if (dayDiff === -1) return `yesterday ${formatClock(d)}`;
  return `${WD[d.getDay()]} ${d.getDate()} ${MO[d.getMonth()]} ${formatClock(d)}`;
}

/** Row meta line (SR-007): "Overdue by 2 h · was due 10:00" or "Due 17:00". */
export function deadlineLabel(deadlineIso: string | null, now: Date): { text: string; overdue: boolean } {
  if (!deadlineIso) return { text: 'No deadline', overdue: false };
  const d = new Date(deadlineIso);
  const diff = d.getTime() - now.getTime();
  if (diff < 0) return { text: `Overdue by ${formatDuration(diff)} · was due ${formatWhen(d, now)}`, overdue: true };
  return { text: `Due ${formatWhen(d, now)}`, overdue: false };
}

/** Value for <input type="datetime-local"> in local time. */
export function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function fromLocalInput(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
