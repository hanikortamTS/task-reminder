/** Reminder scheduling logic — LLD-004 (SR-003). Pure functions; the timer lives in main/schedulerService. */
import type { Task } from './types';

export interface Reminder {
  taskId: string;
  key: string;
  /** 'deadline' = one of the task's offsets; 'snooze' = the time the user snoozed to (US-011). */
  kind: 'deadline' | 'snooze';
  /** Minutes before the deadline (0 = at deadline). 0 for snoozes. */
  offset: number;
  at: number;
}

export const reminderKey = (offset: number, deadline: string) => `${offset}@${deadline}`;
export const snoozeKey = (until: string) => `snooze@${until}`;

/** All reminders of a task, regardless of whether they were already shown. */
export function remindersOf(task: Task): Reminder[] {
  if (task.status !== 'open') return [];
  const out: Reminder[] = [];
  if (task.deadline) {
    const dl = Date.parse(task.deadline);
    const created = Date.parse(task.createdAt);
    for (const offset of new Set(task.reminderOffsets)) {
      const at = dl - offset * 60_000;
      // A reminder whose time was already past when the task was created is never shown.
      if (at > created) out.push({ taskId: task.id, key: reminderKey(offset, task.deadline), kind: 'deadline', offset, at });
    }
  }
  if (task.snoozedUntil) out.push({ taskId: task.id, key: snoozeKey(task.snoozedUntil), kind: 'snooze', offset: 0, at: Date.parse(task.snoozedUntil) });
  return out;
}

/** Reminders that became due in the window (from, to] and were not shown yet, oldest first. */
export function dueReminders(tasks: Task[], from: number, to: number): Reminder[] {
  return tasks
    .flatMap((task) => remindersOf(task).filter((r) => !task.firedReminders.includes(r.key)))
    .filter((r) => r.at > from && r.at <= to)
    .sort((a, b) => a.at - b.at);
}

/** Time of the next reminder strictly after `now`, or null. */
export function nextReminderAt(tasks: Task[], now: number): number | null {
  let next: number | null = null;
  for (const task of tasks)
    for (const r of remindersOf(task))
      if (r.at > now && !task.firedReminders.includes(r.key) && (next === null || r.at < next)) next = r.at;
  return next;
}

/** setTimeout cannot exceed 2^31-1 ms (~24.8 days); longer waits are re-armed. */
export const MAX_TIMER_MS = 2_147_000_000;
