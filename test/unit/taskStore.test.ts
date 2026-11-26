// US-015 (SR-011), US-001/US-005 store behaviour
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { TaskStore } from '../../src/core/taskStore';

let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tr-'));
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

const now = new Date('2026-11-26T09:00:00Z');

describe('TaskStore', () => {
  it('creates tasks with defaults and persists them across restarts (US-015 AC1)', () => {
    const s = new TaskStore(dir);
    expect(s.load()).toBe('empty');
    const t = s.create({ title: '  Send invoice  ', deadline: '2026-11-26T17:00:00.000Z' }, now);
    expect(t).toMatchObject({ title: 'Send invoice', status: 'open', reminderOffsets: [60, 0], priority: false, notes: '' });
    const s2 = new TaskStore(dir);
    expect(s2.load()).toBe('ok');
    expect(s2.list()).toEqual([t]);
  });

  it('rejects an empty title (US-001 AC2) and truncates titles over 200 chars', () => {
    const s = new TaskStore(dir);
    s.load();
    expect(() => s.create({ title: '   ' })).toThrow('Give the task a name');
    expect(s.list()).toHaveLength(0);
    expect(s.create({ title: 'x'.repeat(250) }).title).toHaveLength(200);
  });

  it('saves a task with no deadline (US-001 AC3)', () => {
    const s = new TaskStore(dir);
    s.load();
    expect(s.create({ title: 'Someday' }).deadline).toBeNull();
  });

  it('uses the configured default offsets', () => {
    const s = new TaskStore(dir, () => [15]);
    s.load();
    expect(s.create({ title: 'x' }).reminderOffsets).toEqual([15]);
  });

  it('completes, reopens and sets completedAt (US-005)', () => {
    const s = new TaskStore(dir);
    s.load();
    const t = s.create({ title: 'x' }, now);
    const done = s.update(t.id, { status: 'done' }, new Date('2026-11-26T10:00:00Z'));
    expect(done.completedAt).toBe('2026-11-26T10:00:00.000Z');
    const open = s.update(t.id, { status: 'open' });
    expect(open.completedAt).toBeNull();
  });

  it('rejects unknown patch fields and unknown ids', () => {
    const s = new TaskStore(dir);
    s.load();
    const t = s.create({ title: 'x' });
    expect(() => s.update(t.id, { id: 'hack' } as never)).toThrow();
    expect(() => s.update('nope', { title: 'y' })).toThrow('not found');
    expect(() => s.update(t.id, { deadline: 'not a date' })).toThrow('Invalid date');
  });

  it('deletes and restores the identical task (US-005 undo)', () => {
    const s = new TaskStore(dir);
    s.load();
    const t = s.create({ title: 'x', deadline: '2026-11-27T09:00:00.000Z' });
    const removed = s.remove(t.id);
    expect(s.list()).toHaveLength(0);
    s.restore(removed);
    expect(s.list()).toEqual([t]);
    s.restore(removed); // idempotent
    expect(s.list()).toHaveLength(1);
  });

  it('writes atomically and keeps the previous version as backup', () => {
    const s = new TaskStore(dir);
    s.load();
    s.create({ title: 'one' });
    s.create({ title: 'two' });
    expect(fs.existsSync(path.join(dir, 'tasks.json.tmp'))).toBe(false);
    const bak = JSON.parse(fs.readFileSync(path.join(dir, 'tasks.bak.json'), 'utf8'));
    expect(bak.tasks.map((t: { title: string }) => t.title)).toEqual(['one']);
  });

  it('falls back to the backup when tasks.json is corrupt and keeps the corrupt file (US-015 AC2)', () => {
    const s = new TaskStore(dir);
    s.load();
    s.create({ title: 'one' });
    s.create({ title: 'two' });
    fs.writeFileSync(path.join(dir, 'tasks.json'), '{"version":1,"tasks":[{"bro');
    const s2 = new TaskStore(dir);
    expect(s2.load(now)).toBe('restored-from-backup');
    expect(s2.list().map((t) => t.title)).toEqual(['one']);
    expect(fs.existsSync(path.join(dir, `tasks.corrupt-${now.getTime()}.json`))).toBe(true);
  });

  it('starts empty but keeps the file when both copies are unreadable', () => {
    fs.writeFileSync(path.join(dir, 'tasks.json'), 'garbage');
    const s = new TaskStore(dir);
    expect(s.load(now)).toBe('reset-corrupt');
    expect(s.list()).toEqual([]);
    expect(fs.readdirSync(dir).some((f) => f.startsWith('tasks.corrupt-'))).toBe(true);
  });

  it('marks reminders as fired once', () => {
    const s = new TaskStore(dir);
    s.load();
    const t = s.create({ title: 'x' });
    s.markFired([{ taskId: t.id, key: 'k' }, { taskId: t.id, key: 'k' }]);
    expect(s.get(t.id).firedReminders).toEqual(['k']);
  });
});
