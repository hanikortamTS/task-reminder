/** Reminder scheduling logic — LLD-004 (SR-003). Pure functions; the timer lives in main/schedulerService. */
import type { Task } from './types';

export interface Reminder {
  taskId: string;
  key: string;
  /** Minutes before the deadline (0 = at deadline). */
  offset: number;
  at: number;
}

export const reminderKey = (offset: number, deadline: string) => `${offset}@${deadline}`;

/** All reminders of a task, regardless of whether they were already shown. */
export function remindersOf(task: Task): Reminder[] {
  if (task.status !== 'open' || !task.deadline) return [];
  const dl = Date.parse(task.deadline);
  const created = Date.parse(task.createdAt);
  return [...new Set(task.reminderOffsets)]
    .map((offset) => ({ taskId: task.id, key: reminderKey(offset, task.deadline!), offset, at: dl - offset * 60_000 }))
    // A reminder whose time was already past when the task was created is never shown.
    .filter((r) => r.at > created);
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
