import type { Task } from '../../src/core/types';

let n = 0;
export function mkTask(p: Partial<Task> = {}): Task {
  n += 1;
  return {
    id: `t${n}`,
    title: `Task ${n}`,
    deadline: null,
    notes: '',
    priority: false,
    reminderOffsets: [60, 0],
    status: 'open',
    snoozedUntil: null,
    firedReminders: [],
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    completedAt: null,
    ...p,
  };
}

/** Local-time date helper so tests behave the same in any timezone. */
export const local = (y: number, mo: number, d: number, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi, 0, 0);
