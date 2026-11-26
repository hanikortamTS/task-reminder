// US-007 — default reminders and scheduling (SR-003, SR-013)
import { describe, expect, it, vi } from 'vitest';
import { dueReminders, MAX_TIMER_MS, nextReminderAt, reminderKey, remindersOf } from '../../src/core/scheduler';
import { SchedulerService } from '../../src/main/schedulerService';
import type { Task } from '../../src/core/types';
import { mkTask } from './helpers';

const T = (s: string) => Date.parse(s);

describe('remindersOf / dueReminders', () => {
  const task = mkTask({ deadline: '2026-11-26T15:00:00.000Z', createdAt: '2026-11-26T08:00:00.000Z' });

  it('creates a reminder 60 min before and one at the deadline by default', () => {
    expect(remindersOf(task).map((r) => new Date(r.at).toISOString())).toEqual(['2026-11-26T14:00:00.000Z', '2026-11-26T15:00:00.000Z']);
  });

  it('returns reminders due in (from, to] that were not shown yet', () => {
    expect(dueReminders([task], T('2026-11-26T13:59:00Z'), T('2026-11-26T14:00:00Z'))).toHaveLength(1);
    expect(dueReminders([task], T('2026-11-26T14:00:00Z'), T('2026-11-26T14:30:00Z'))).toHaveLength(0);
    const fired = { ...task, firedReminders: [reminderKey(60, task.deadline!)] };
    expect(dueReminders([fired], T('2026-11-26T13:00:00Z'), T('2026-11-26T14:30:00Z'))).toHaveLength(0);
  });

  it('never reminds for completed tasks, tasks without deadline or with no offsets', () => {
    expect(remindersOf({ ...task, status: 'done' })).toEqual([]);
    expect(remindersOf({ ...task, deadline: null })).toEqual([]);
    expect(remindersOf({ ...task, reminderOffsets: [] })).toEqual([]);
  });

  it('skips reminders whose time had already passed when the task was created', () => {
    const late = { ...task, createdAt: '2026-11-26T14:30:00.000Z' };
    expect(remindersOf(late).map((r) => r.offset)).toEqual([0]);
  });

  it('gives a new key when the deadline changes, so a moved task reminds again', () => {
    const moved = { ...task, deadline: '2026-11-26T18:00:00.000Z', firedReminders: [reminderKey(60, task.deadline!)] };
    expect(nextReminderAt([moved], T('2026-11-26T14:30:00Z'))).toBe(T('2026-11-26T17:00:00Z'));
  });
});

describe('SchedulerService (fake clock)', () => {
  function setup(tasks: Task[], start: string) {
    let now = T(start);
    let timer: { fn: () => void; at: number } | null = null;
    const shown: string[] = [];
    const svc = new SchedulerService({
      tasks: () => tasks,
      now: () => now,
      setTimer: (fn, ms) => (timer = { fn, at: now + ms }),
      clearTimer: () => (timer = null),
      onDue: (due) => {
        for (const r of due) {
          shown.push(`${r.taskId}:${r.offset}`);
          const t = tasks.find((x) => x.id === r.taskId)!;
          t.firedReminders.push(r.key);
        }
      },
    });
    const advanceTo = (s: string) => {
      const target = T(s);
      while (timer && timer.at <= target) {
        now = timer.at;
        const fn = timer.fn;
        timer = null;
        fn();
      }
      now = target;
    };
    return { svc, shown, advanceTo, timer: () => timer };
  }

  it('fires 1 h before and at the deadline, at the right time (TC: US-007 AC1/AC2)', () => {
    const task = mkTask({ id: 'a', deadline: '2026-11-26T15:00:00.000Z', createdAt: '2026-11-26T08:00:00.000Z' });
    const s = setup([task], '2026-11-26T09:00:00Z');
    s.svc.rearm();
    expect(s.timer()!.at).toBe(T('2026-11-26T14:00:00Z'));
    s.advanceTo('2026-11-26T13:59:59Z');
    expect(s.shown).toEqual([]);
    s.advanceTo('2026-11-26T14:00:00Z');
    expect(s.shown).toEqual(['a:60']);
    s.advanceTo('2026-11-26T15:00:00Z');
    expect(s.shown).toEqual(['a:60', 'a:0']);
    expect(s.timer()).toBeNull();
  });

  it('shows nothing when the task is completed before the reminder (US-007 AC3)', () => {
    const task = mkTask({ id: 'b', deadline: '2026-11-26T15:00:00.000Z', createdAt: '2026-11-26T08:00:00.000Z' });
    const s = setup([task], '2026-11-26T09:00:00Z');
    s.svc.rearm();
    task.status = 'done';
    s.svc.rearm();
    s.advanceTo('2026-11-26T16:00:00Z');
    expect(s.shown).toEqual([]);
  });

  it('does not replay old reminders when a task is edited later', () => {
    const task = mkTask({ id: 'c', deadline: '2026-11-27T15:00:00.000Z', createdAt: '2026-11-26T08:00:00.000Z' });
    const s = setup([task], '2026-11-26T08:00:00Z');
    s.svc.rearm();
    s.advanceTo('2026-11-26T13:30:00Z');
    task.deadline = '2026-11-26T14:00:00.000Z'; // 1-h-before reminder (13:00) is already past
    s.svc.rearm();
    expect(s.shown).toEqual([]);
    s.advanceTo('2026-11-26T14:00:00Z');
    expect(s.shown).toEqual(['c:0']);
  });

  it('caps very long waits to the setTimeout limit and re-arms', () => {
    const task = mkTask({ id: 'd', deadline: '2027-06-01T09:00:00.000Z', createdAt: '2026-11-26T08:00:00.000Z' });
    const s = setup([task], '2026-11-26T09:00:00Z');
    s.svc.rearm();
    expect(s.timer()!.at - T('2026-11-26T09:00:00Z')).toBe(MAX_TIMER_MS);
  });

  it('uses the real timer API by default', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-26T13:59:00Z'));
    const task = mkTask({ id: 'e', deadline: '2026-11-26T15:00:00.000Z', createdAt: '2026-11-26T08:00:00.000Z' });
    const shown: string[] = [];
    const svc = new SchedulerService({ tasks: () => [task], onDue: (d) => d.forEach((r) => (shown.push(r.key), task.firedReminders.push(r.key))) });
    svc.rearm();
    vi.advanceTimersByTime(60_000);
    expect(shown).toHaveLength(1);
    svc.stop();
    vi.useRealTimers();
  });
});
