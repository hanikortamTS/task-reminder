// Sprint 2 core logic: US-002, US-006, US-008, US-009, US-011, US-012, US-016
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
vi.mock('electron', () => ({ Notification: class {} }));
import { offsetLabel, snoozeTarget } from '../../src/core/dates';
import { dueTasks, searchTasks } from '../../src/core/selectors';
import { actionUrl, findActionUrl, parseActionUrl } from '../../src/core/protocol';
import { dueReminders, nextReminderAt, remindersOf, snoozeKey } from '../../src/core/scheduler';
import { SchedulerService } from '../../src/main/schedulerService';
import { TaskStore } from '../../src/core/taskStore';
import { exportTasks, readImport } from '../../src/core/dataTransfer';
import { reminderToastXml } from '../../src/main/notifier';
import type { Task } from '../../src/core/types';
import { local, mkTask } from './helpers';

const T = (s: string) => Date.parse(s);

describe('US-011 snooze targets and toast links', () => {
  const now = local(2026, 11, 26, 14, 3);
  it('computes 10 min, 1 hour and tomorrow 09:00', () => {
    expect(snoozeTarget('10m', now)).toEqual(local(2026, 11, 26, 14, 13));
    expect(snoozeTarget('1h', now)).toEqual(local(2026, 11, 26, 15, 3));
    expect(snoozeTarget('tomorrow', now)).toEqual(local(2026, 11, 27, 9, 0));
  });
  it('round-trips toast action links and rejects anything unexpected', () => {
    const id = '3f1c2b9a-1111-4222-8333-944455556666';
    expect(parseActionUrl(actionUrl({ action: 'snooze', id, choice: '1h' }))).toEqual({ action: 'snooze', id, choice: '1h' });
    expect(parseActionUrl(actionUrl({ action: 'done', id }))).toEqual({ action: 'done', id });
    expect(parseActionUrl(actionUrl({ action: 'open', id: null }))).toEqual({ action: 'open', id: null });
    expect(parseActionUrl('taskreminder://snooze?id=x&c=99y')).toBeNull();
    expect(parseActionUrl('taskreminder://delete?id=x')).toBeNull();
    expect(parseActionUrl('taskreminder://done?id=../../etc')).toBeNull();
    expect(parseActionUrl('taskreminder://done')).toBeNull();
    expect(parseActionUrl('https://evil.example/done?id=x')).toBeNull();
    expect(parseActionUrl('not a url')).toBeNull();
    expect(findActionUrl(['app.exe', '--hidden', `taskreminder://done?id=${id}`])).toEqual({ action: 'done', id });
    expect(findActionUrl(['app.exe'])).toBeNull();
  });
  it('builds toast XML with four protocol buttons and escapes the title', () => {
    const xml = reminderToastXml('abc', 'Pay <bills> & "rent"', 'Due in 1 h');
    expect(xml).toContain('Pay &lt;bills&gt; &amp; &quot;rent&quot;');
    expect(xml.match(/<action /g)).toHaveLength(4);
    expect(xml).toContain('arguments="taskreminder://snooze?id=abc&amp;c=10m"');
    expect(xml).toContain('launch="taskreminder://open?id=abc"');
    expect(xml).toContain('scenario="reminder"');
  });
  it('schedules a snoozed reminder once and ignores it for completed tasks', () => {
    const t = mkTask({ deadline: '2026-11-26T15:00:00.000Z', createdAt: '2026-11-26T08:00:00.000Z', reminderOffsets: [], snoozedUntil: '2026-11-26T16:00:00.000Z' });
    expect(remindersOf(t)).toEqual([{ taskId: t.id, key: snoozeKey(t.snoozedUntil!), kind: 'snooze', offset: 0, at: T('2026-11-26T16:00:00Z') }]);
    expect(nextReminderAt([t], T('2026-11-26T15:30:00Z'))).toBe(T('2026-11-26T16:00:00Z'));
    expect(dueReminders([{ ...t, firedReminders: [snoozeKey(t.snoozedUntil!)] }], 0, T('2026-11-27T00:00:00Z'))).toEqual([]);
    expect(remindersOf({ ...t, status: 'done' })).toEqual([]);
  });
});

describe('US-008 reminder labels', () => {
  it('names presets and custom offsets', () => {
    expect(offsetLabel(0)).toBe('At deadline');
    expect(offsetLabel(1440)).toBe('1 day before');
    expect(offsetLabel(2880)).toBe('2 days before');
    expect(offsetLabel(120)).toBe('2 hours before');
    expect(offsetLabel(25)).toBe('25 min before');
  });
});

describe('US-006 search and US-012 due tasks', () => {
  const now = local(2026, 11, 26, 12);
  const ts = [
    mkTask({ title: 'Pay supplier INVOICE' }),
    mkTask({ title: 'Call bank', notes: 'ask about the invoice fee' }),
    mkTask({ title: 'Invoice archive', status: 'done', completedAt: now.toISOString() }),
    mkTask({ title: 'Other' }),
  ];
  it('matches title or notes case-insensitively, including done tasks', () => {
    expect(searchTasks(ts, '  invoice ').map((t) => t.title)).toEqual(['Pay supplier INVOICE', 'Call bank', 'Invoice archive']);
    expect(searchTasks(ts, 'xyz')).toEqual([]);
    expect(searchTasks(ts, '')).toHaveLength(4);
  });
  it('counts overdue and due-within-the-hour open tasks only', () => {
    const d = [
      mkTask({ title: 'over', deadline: local(2026, 11, 25, 9).toISOString() }),
      mkTask({ title: 'soon', deadline: local(2026, 11, 26, 12, 45).toISOString() }),
      mkTask({ title: 'later', deadline: local(2026, 11, 26, 13, 30).toISOString() }),
      mkTask({ title: 'done', deadline: local(2026, 11, 26, 12, 10).toISOString(), status: 'done' }),
      mkTask({ title: 'none' }),
    ];
    expect(dueTasks(d, now).map((t) => t.title)).toEqual(['over', 'soon']);
  });
});

describe('US-009 catch-up of missed reminders', () => {
  function svc(tasks: Task[], nowIso: string) {
    const calls: { keys: string[]; missed: boolean }[] = [];
    const checked: number[] = [];
    const s = new SchedulerService({
      tasks: () => tasks,
      now: () => T(nowIso),
      setTimer: () => 1,
      clearTimer: () => undefined,
      onDue: (due, info) => calls.push({ keys: due.map((r) => r.key), missed: info.missed }),
      onChecked: (at) => checked.push(at),
    });
    return { s, calls, checked };
  }
  const task = mkTask({ deadline: '2026-11-26T15:00:00.000Z', createdAt: '2026-11-26T08:00:00.000Z' });

  it('shows reminders that fell due while the app was closed, flagged as missed', () => {
    const { s, calls, checked } = svc([task], '2026-11-26T18:00:00Z');
    s.start(T('2026-11-26T09:00:00Z'));
    expect(calls).toEqual([{ keys: ['60@2026-11-26T15:00:00.000Z', '0@2026-11-26T15:00:00.000Z'], missed: true }]);
    expect(checked).toEqual([T('2026-11-26T18:00:00Z')]);
  });
  it('replays nothing on first start (no previous check) or when nothing was missed', () => {
    const a = svc([task], '2026-11-26T18:00:00Z');
    a.s.start(null);
    expect(a.calls).toEqual([]);
    const b = svc([task], '2026-11-26T12:00:00Z');
    b.s.start(T('2026-11-26T11:00:00Z'));
    expect(b.calls).toEqual([]);
  });
  it('does not flag on-time reminders as missed', () => {
    const { s, calls } = svc([task], '2026-11-26T14:00:30Z');
    s.start(T('2026-11-26T13:59:00Z'));
    expect(calls).toEqual([{ keys: ['60@2026-11-26T15:00:00.000Z'], missed: false }]);
  });
});

describe('US-002/US-011/US-016 store', () => {
  let dir: string;
  beforeEach(() => (dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tr2-'))));
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('saves notes, priority and reminder offsets (US-002, US-008)', () => {
    const s = new TaskStore(dir);
    s.load();
    const t = s.create({ title: 'x', deadline: '2026-11-27T09:00:00.000Z' });
    const u = s.update(t.id, { notes: 'details', priority: true, reminderOffsets: [1440, 15] });
    expect(u).toMatchObject({ notes: 'details', priority: true, reminderOffsets: [1440, 15] });
    expect(() => s.update(t.id, { reminderOffsets: [1, 2, 3, 4, 5, 6] })).toThrow();
    expect(() => s.update(t.id, { notes: 'x'.repeat(5001) })).toThrow();
    expect(s.update(t.id, { reminderOffsets: [] }).reminderOffsets).toEqual([]);
  });

  it('snoozes, and clears the snooze when the deadline changes or the task is completed', () => {
    const s = new TaskStore(dir);
    s.load();
    const t = s.create({ title: 'x', deadline: '2026-11-27T09:00:00.000Z' });
    expect(s.snooze(t.id, '2026-11-27T10:00:00.000Z').snoozedUntil).toBe('2026-11-27T10:00:00.000Z');
    expect(() => s.snooze(t.id, 'nope')).toThrow('Invalid date');
    expect(() => s.snooze('missing', '2026-11-27T10:00:00.000Z')).toThrow('not found');
    expect(s.update(t.id, { deadline: '2026-11-28T09:00:00.000Z' }).snoozedUntil).toBeNull();
    s.snooze(t.id, '2026-11-27T10:00:00.000Z');
    expect(s.update(t.id, { status: 'done' }).snoozedUntil).toBeNull();
  });

  it('exports and re-imports the same tasks; replaceAll keeps a backup', () => {
    const s = new TaskStore(dir);
    s.load();
    s.create({ title: 'one' });
    s.create({ title: 'two', deadline: '2026-11-27T09:00:00.000Z' });
    const file = path.join(dir, 'export.json');
    expect(exportTasks(file, s.list())).toBe(2);
    const imported = readImport(file);
    expect(imported).toEqual(s.list());
    s.remove(imported[0].id);
    s.replaceAll(imported);
    expect(s.list()).toHaveLength(2);
    expect(JSON.parse(fs.readFileSync(path.join(dir, 'tasks.bak.json'), 'utf8')).tasks).toHaveLength(1);
  });

  it('rejects invalid import files without changing anything (US-016 AC2)', () => {
    const bad = path.join(dir, 'bad.json');
    fs.writeFileSync(bad, 'hello');
    expect(() => readImport(bad)).toThrow('not valid JSON');
    fs.writeFileSync(bad, JSON.stringify({ version: 1, tasks: [{ id: 1 }] }));
    expect(() => readImport(bad)).toThrow('unexpected content');
    const t = mkTask();
    fs.writeFileSync(bad, JSON.stringify({ version: 1, tasks: [t, t] }));
    expect(() => readImport(bad)).toThrow('same task twice');
  });
});
