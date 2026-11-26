/** Single-timer reminder scheduler — HLD-003 (SR-003, SR-013, US-007). */
import { dueReminders, MAX_TIMER_MS, nextReminderAt, type Reminder } from '../core/scheduler';
import type { Task } from '../core/types';

export interface SchedulerDeps {
  tasks: () => Task[];
  onDue: (reminders: Reminder[]) => void;
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
   * Re-plans after tasks changed (or at start). Nothing in the past is shown here: the timer already
   * handled every reminder up to now, and an edit must not replay reminders that were already behind it.
   */
  rearm(): void {
    this.lastCheck = this.now();
    this.arm();
  }

  /** Timer fired: show everything due since the last check, then plan the next one. */
  private tick(): void {
    const now = this.now();
    const due = dueReminders(this.deps.tasks(), this.lastCheck, now);
    this.lastCheck = now;
    if (due.length) this.deps.onDue(due);
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

  get lastCheckedAt(): number {
    return this.lastCheck;
  }

  stop(): void {
    if (this.handle !== null) this.clearTimer(this.handle);
    this.handle = null;
  }
}
