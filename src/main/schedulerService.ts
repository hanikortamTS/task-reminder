/** Single-timer reminder scheduler — HLD-003 (SR-003, SR-005, SR-013; US-007, US-009). */
import { dueReminders, MAX_TIMER_MS, nextReminderAt, type Reminder } from '../core/scheduler';
import type { Task } from '../core/types';

/** A reminder shown more than this long after its time counts as "missed" (PC off, asleep). */
export const MISSED_AFTER_MS = 2 * 60_000;

export interface SchedulerDeps {
  tasks: () => Task[];
  onDue: (reminders: Reminder[], info: { missed: boolean }) => void;
  /** Called with the time up to which reminders have been handled; persisted as settings.lastCheckedAt. */
  onChecked?: (at: number) => void;
  now?: () => number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (h: unknown) => void;
}

export class SchedulerService {
  private handle: unknown = null;
  private lastCheck: number;
  private readonly now: () => number;
  private readonly setTimer: (fn: () => void, ms: number) => unknown;
  private readonly clearTimer: (h: unknown) => void;

  constructor(private readonly deps: SchedulerDeps) {
    this.now = deps.now ?? Date.now;
    this.setTimer = deps.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
    this.clearTimer = deps.clearTimer ?? ((h) => clearTimeout(h as NodeJS.Timeout));
    this.lastCheck = this.now();
  }

  /**
   * Start-up (US-009): show reminders that fell due since `lastCheckedAt` (while the app was not running),
   * then keep scheduling. With no previous check, nothing is replayed.
   */
  start(lastCheckedAt: number | null): void {
    this.lastCheck = lastCheckedAt !== null && lastCheckedAt < this.now() ? lastCheckedAt : this.now();
    this.tick();
  }

  /**
   * Re-plans after tasks changed. Nothing in the past is shown here: the timer already handled every
   * reminder up to now, and an edit must not replay reminders that were already behind it.
   */
  rearm(): void {
    this.lastCheck = this.now();
    this.deps.onChecked?.(this.lastCheck);
    this.arm();
  }

  /** Shows everything due since the last check, then plans the next one. Also used on resume from sleep. */
  tick(): void {
    const now = this.now();
    const due = dueReminders(this.deps.tasks(), this.lastCheck, now);
    this.lastCheck = now;
    if (due.length) this.deps.onDue(due, { missed: due.some((r) => now - r.at > MISSED_AFTER_MS) });
    this.deps.onChecked?.(now);
    this.arm();
  }

  private arm(): void {
    if (this.handle !== null) this.clearTimer(this.handle);
    this.handle = null;
    const now = this.now();
    const next = nextReminderAt(this.deps.tasks(), now);
    if (next === null) return;
    this.handle = this.setTimer(() => {
      this.handle = null;
      this.tick();
    }, Math.min(Math.max(next - now, 0), MAX_TIMER_MS));
  }

  stop(): void {
    if (this.handle !== null) this.clearTimer(this.handle);
    this.handle = null;
  }
}
