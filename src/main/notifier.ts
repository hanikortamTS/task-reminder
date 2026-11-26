/** Windows notifications — HLD-004 (SR-004, SR-005, SR-006; US-007, US-009, US-010, US-011). */
import { Notification } from 'electron';
import type { Reminder } from '../core/scheduler';
import type { Task } from '../core/types';
import { formatClock, formatDuration } from '../core/dates';
import { actionUrl } from '../core/protocol';

export interface ShownNotification {
  taskId: string | null;
  title: string;
  body: string;
  kind: 'reminder' | 'missed' | 'group';
  /** Buttons on the Windows toast (empty where the platform has none). */
  actions: string[];
}

export function reminderText(task: Task, r: Reminder, now: number): { title: string; body: string } {
  const title = `${task.priority ? '(!) ' : ''}${task.title}`;
  if (!task.deadline) return { title, body: 'Snoozed reminder' };
  const dl = new Date(task.deadline);
  const left = dl.getTime() - now;
  if (left > 60_000) return { title, body: r.kind === 'snooze' ? `Snoozed · due in ${formatDuration(left)} (${formatClock(dl)})` : `Due in ${formatDuration(left)} (${formatClock(dl)})` };
  if (left >= -60_000) return { title, body: `Due now (${formatClock(dl)})` };
  return { title, body: `Overdue since ${formatClock(dl)}` };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const TOAST_BUTTONS = ['Done', 'Snooze 10 min', 'Snooze 1 hour', 'Tomorrow 9:00'];

/**
 * Windows toast with Done/Snooze buttons. Buttons and the body use protocol activation
 * (taskreminder://…), which Windows delivers to the running app as a second-instance launch.
 */
export function reminderToastXml(taskId: string, title: string, body: string): string {
  const a = (label: string, url: string) => `<action content="${esc(label)}" activationType="protocol" arguments="${esc(url)}"/>`;
  return [
    `<toast activationType="protocol" launch="${esc(actionUrl({ action: 'open', id: taskId }))}" scenario="reminder">`,
    `<visual><binding template="ToastGeneric"><text>${esc(title)}</text><text>${esc(body)}</text></binding></visual>`,
    '<actions>',
    a(TOAST_BUTTONS[0], actionUrl({ action: 'done', id: taskId })),
    a(TOAST_BUTTONS[1], actionUrl({ action: 'snooze', id: taskId, choice: '10m' })),
    a(TOAST_BUTTONS[2], actionUrl({ action: 'snooze', id: taskId, choice: '1h' })),
    a(TOAST_BUTTONS[3], actionUrl({ action: 'snooze', id: taskId, choice: 'tomorrow' })),
    '</actions>',
    '<audio src="ms-winsoundevent:Notification.Reminder"/>',
    '</toast>',
  ].join('');
}

export class Notifier {
  /** Keeps Notification objects alive so their handlers are not garbage-collected. */
  private live = new Set<Notification>();
  /** Every notification shown this session; read by the E2E tests through electronApp.evaluate. */
  readonly history: ShownNotification[] = [];
  /** Set to true while notifications are paused from the tray. */
  paused = false;

  constructor(
    private readonly onClick: (taskId: string | null) => void,
    private readonly windows = process.platform === 'win32',
  ) {}

  private show(n: ShownNotification): void {
    this.history.push(n);
    if (this.paused || !Notification.isSupported()) return;
    const withButtons = this.windows && n.kind === 'reminder' && n.taskId !== null;
    const note = withButtons
      ? new Notification({ toastXml: reminderToastXml(n.taskId!, n.title, n.body) })
      : new Notification({ title: n.title, body: n.body, silent: false });
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
    // Several reminders at the same moment collapse into one notification to avoid a toast storm.
    if (reminders.length > 3) {
      const titles = [...new Set(reminders.map((r) => tasks.find((t) => t.id === r.taskId)?.title).filter(Boolean))];
      this.show({ taskId: null, kind: 'group', actions: [], title: `${reminders.length} reminders due now`, body: summary(titles as string[]) });
      return;
    }
    for (const r of reminders) {
      const task = tasks.find((t) => t.id === r.taskId);
      if (task) this.show({ taskId: task.id, kind: 'reminder', actions: this.windows ? TOAST_BUTTONS : [], ...reminderText(task, r, now) });
    }
  }

  /** Reminders that fell due while the PC was off or asleep (US-009): one summary, or the single reminder. */
  missed(tasks: Task[], reminders: Reminder[], now = Date.now()): void {
    const ids = [...new Set(reminders.map((r) => r.taskId))];
    if (ids.length === 1) return this.remind(tasks, reminders.slice(-1), now);
    const titles = ids.map((id) => tasks.find((t) => t.id === id)?.title).filter(Boolean) as string[];
    this.show({ taskId: null, kind: 'missed', actions: [], title: `You missed ${ids.length} reminders`, body: summary(titles) });
  }
}

function summary(titles: string[]): string {
  return titles.length <= 2 ? titles.join(', ') : `${titles.slice(0, 2).join(', ')}, +${titles.length - 2} more`;
}
