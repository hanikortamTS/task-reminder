/** Windows notifications — HLD-004 (SR-004, US-007, US-010). */
import { Notification } from 'electron';
import type { Reminder } from '../core/scheduler';
import type { Task } from '../core/types';
import { formatClock, formatDuration } from '../core/dates';

export interface ShownNotification {
  taskId: string | null;
  title: string;
  body: string;
}

export function reminderText(task: Task, r: Reminder, now: number): { title: string; body: string } {
  const dl = new Date(task.deadline!);
  const left = dl.getTime() - now;
  const body =
    left > 60_000 ? `Due in ${formatDuration(left)} (${formatClock(dl)})` : left >= -60_000 ? `Due now (${formatClock(dl)})` : `Overdue since ${formatClock(dl)}`;
  return { title: `${task.priority ? '(!) ' : ''}${task.title}`, body: r.offset === 0 && left > 60_000 ? `Due ${formatClock(dl)}` : body };
}

export class Notifier {
  /** Keeps Notification objects alive so their click handlers are not garbage-collected. */
  private live = new Set<Notification>();
  /** Every notification shown this session; read by the E2E tests through electronApp.evaluate. */
  readonly history: ShownNotification[] = [];

  constructor(private readonly onClick: (taskId: string | null) => void) {}

  show(n: ShownNotification): void {
    this.history.push(n);
    if (!Notification.isSupported()) return;
    const note = new Notification({ title: n.title, body: n.body, silent: false });
    this.live.add(note);
    const done = () => this.live.delete(note);
    note.on('click', () => {
      done();
      this.onClick(n.taskId);
    });
    note.on('close', done);
    note.on('failed', done);
    note.show();
  }

  remind(tasks: Task[], reminders: Reminder[], now = Date.now()): void {
    // Several reminders at once (e.g. after sleep) collapse into one summary to avoid a toast storm.
    if (reminders.length > 3) {
      const titles = reminders.map((r) => tasks.find((t) => t.id === r.taskId)?.title).filter(Boolean);
      this.show({ taskId: null, title: `${reminders.length} tasks need attention`, body: `${titles.slice(0, 2).join(', ')}, +${titles.length - 2} more` });
      return;
    }
    for (const r of reminders) {
      const task = tasks.find((t) => t.id === r.taskId);
      if (task) this.show({ taskId: task.id, ...reminderText(task, r, now) });
    }
  }
}
