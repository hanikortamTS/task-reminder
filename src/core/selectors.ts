/** View selectors — SR-007 (US-003, US-004). */
import type { Task } from './types';
import { addDays, endOfDay } from './dates';

const t = (iso: string) => new Date(iso).getTime();

/** Deadline ascending, then priority first, then oldest first. No-deadline tasks last. */
export function compareTasks(a: Task, b: Task): number {
  const da = a.deadline ? t(a.deadline) : Infinity;
  const db = b.deadline ? t(b.deadline) : Infinity;
  if (da !== db) return da - db;
  if (a.priority !== b.priority) return a.priority ? -1 : 1;
  return t(a.createdAt) - t(b.createdAt);
}

export function isOverdue(task: Task, now: Date): boolean {
  return task.status === 'open' && task.deadline !== null && t(task.deadline) < now.getTime();
}

export interface TodayView {
  overdue: Task[];
  today: Task[];
}

export function todayView(tasks: Task[], now: Date): TodayView {
  const eod = endOfDay(now).getTime();
  const open = tasks.filter((x) => x.status === 'open' && x.deadline !== null).sort(compareTasks);
  return {
    overdue: open.filter((x) => isOverdue(x, now)),
    today: open.filter((x) => !isOverdue(x, now) && t(x.deadline!) <= eod),
  };
}

export interface Group {
  label: string;
  tasks: Task[];
}

/** Upcoming = after today, or no deadline. Grouped Tomorrow / This week (next 7 days) / Later / No deadline. */
export function upcomingView(tasks: Task[], now: Date): Group[] {
  const eod = endOfDay(now).getTime();
  const eoTomorrow = endOfDay(addDays(now, 1)).getTime();
  const eoWeek = endOfDay(addDays(now, 7)).getTime();
  const open = tasks.filter((x) => x.status === 'open').sort(compareTasks);
  const groups: Group[] = [
    { label: 'Tomorrow', tasks: open.filter((x) => x.deadline && t(x.deadline) > eod && t(x.deadline) <= eoTomorrow) },
    { label: 'This week', tasks: open.filter((x) => x.deadline && t(x.deadline) > eoTomorrow && t(x.deadline) <= eoWeek) },
    { label: 'Later', tasks: open.filter((x) => x.deadline && t(x.deadline) > eoWeek) },
    { label: 'No deadline', tasks: open.filter((x) => !x.deadline) },
  ];
  return groups.filter((g) => g.tasks.length > 0);
}

export const DONE_WINDOW_DAYS = 30;

export function doneView(tasks: Task[], now: Date): Task[] {
  const from = now.getTime() - DONE_WINDOW_DAYS * 86_400_000;
  return tasks
    .filter((x) => x.status === 'done' && x.completedAt && t(x.completedAt) >= from)
    .sort((a, b) => t(b.completedAt!) - t(a.completedAt!));
}

export function viewCounts(tasks: Task[], now: Date) {
  const tv = todayView(tasks, now);
  return {
    today: tv.overdue.length + tv.today.length,
    upcoming: upcomingView(tasks, now).reduce((n, g) => n + g.tasks.length, 0),
    done: doneView(tasks, now).length,
  };
}
