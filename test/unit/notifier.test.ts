// US-007 — reminder wording (SR-004)
import { describe, expect, it, vi } from 'vitest';
vi.mock('electron', () => ({ Notification: class {} }));
import { reminderText } from '../../src/main/notifier';
import { mkTask } from './helpers';

describe('reminderText', () => {
  const task = mkTask({ title: 'Send invoice', deadline: '2026-11-26T15:00:00.000Z' });
  const at = (s: string) => Date.parse(s);
  it('says how long is left for an early reminder', () => {
    const t = reminderText(task, { taskId: task.id, key: 'k', kind: 'deadline' as const, offset: 60, at: 0 }, at('2026-11-26T14:00:00Z'));
    expect(t.title).toBe('Send invoice');
    expect(t.body).toMatch(/^Due in 1 h \(\d\d:00\)$/);
  });
  it('says "Due now" at the deadline and marks priority tasks', () => {
    const t = reminderText({ ...task, priority: true }, { taskId: task.id, key: 'k', kind: 'deadline' as const, offset: 0, at: 0 }, at('2026-11-26T15:00:10Z'));
    expect(t).toEqual({ title: '(!) Send invoice', body: expect.stringMatching(/^Due now/) });
  });
  it('says overdue when shown late', () => {
    const t = reminderText(task, { taskId: task.id, key: 'k', kind: 'deadline' as const, offset: 0, at: 0 }, at('2026-11-26T15:30:00Z'));
    expect(t.body).toMatch(/^Overdue since/);
  });
});
