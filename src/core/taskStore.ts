/** Task repository with atomic writes and backup — LLD-003 (SR-011, US-015). */
import * as nodeFs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { NewTaskInput, Task, TaskFile, TaskPatch } from './types';
import { newTaskSchema, parseOrThrow, taskFileSchema, taskPatchSchema, taskSchema, ValidationError } from './validation';

export type Fs = Pick<typeof nodeFs, 'readFileSync' | 'writeFileSync' | 'renameSync' | 'copyFileSync' | 'existsSync' | 'mkdirSync' | 'openSync' | 'fsyncSync' | 'closeSync'>;

export class NotFoundError extends Error {
  readonly code = 'NOT_FOUND';
}

export type LoadResult = 'ok' | 'empty' | 'restored-from-backup' | 'reset-corrupt';

export class TaskStore {
  readonly file: string;
  readonly backup: string;
  private tasks: Task[] = [];
  loadResult: LoadResult = 'empty';

  constructor(
    readonly dir: string,
    private readonly defaultOffsets: () => number[] = () => [60, 0],
    private readonly fs: Fs = nodeFs,
  ) {
    this.file = path.join(dir, 'tasks.json');
    this.backup = path.join(dir, 'tasks.bak.json');
  }

  private read(p: string): Task[] | null {
    if (!this.fs.existsSync(p)) return null;
    try {
      const parsed = taskFileSchema.safeParse(JSON.parse(String(this.fs.readFileSync(p, 'utf8'))));
      return parsed.success ? parsed.data.tasks : null;
    } catch {
      return null;
    }
  }

  load(now = new Date()): LoadResult {
    this.fs.mkdirSync(this.dir, { recursive: true });
    const main = this.read(this.file);
    if (main) {
      this.tasks = main;
      return (this.loadResult = 'ok');
    }
    const mainExists = this.fs.existsSync(this.file);
    const bak = this.read(this.backup);
    if (mainExists) {
      // Keep the unreadable file for manual recovery instead of overwriting it.
      this.fs.renameSync(this.file, path.join(this.dir, `tasks.corrupt-${now.getTime()}.json`));
    }
    if (bak) {
      this.tasks = bak;
      this.write();
      return (this.loadResult = 'restored-from-backup');
    }
    this.tasks = [];
    return (this.loadResult = mainExists ? 'reset-corrupt' : 'empty');
  }

  /** write tmp → fsync → current becomes backup → rename tmp over current. */
  private write(): void {
    const body: TaskFile = { version: 1, tasks: this.tasks };
    const tmp = `${this.file}.tmp`;
    const fd = this.fs.openSync(tmp, 'w');
    try {
      this.fs.writeFileSync(fd, JSON.stringify(body, null, 1), 'utf8');
      this.fs.fsyncSync(fd);
    } finally {
      this.fs.closeSync(fd);
    }
    if (this.fs.existsSync(this.file) && this.read(this.file)) this.fs.copyFileSync(this.file, this.backup);
    this.fs.renameSync(tmp, this.file);
  }

  list(): Task[] {
    return this.tasks.map((t) => ({ ...t, reminderOffsets: [...t.reminderOffsets], firedReminders: [...t.firedReminders] }));
  }

  get(id: string): Task {
    const t = this.tasks.find((x) => x.id === id);
    if (!t) throw new NotFoundError(`Task ${id} not found`);
    return { ...t };
  }

  create(input: NewTaskInput, now = new Date()): Task {
    const v = parseOrThrow(newTaskSchema, input);
    const ts = now.toISOString();
    const task: Task = {
      id: randomUUID(),
      title: v.title,
      deadline: v.deadline ? new Date(v.deadline).toISOString() : null,
      notes: v.notes ?? '',
      priority: v.priority ?? false,
      reminderOffsets: v.reminderOffsets ?? [...this.defaultOffsets()],
      status: 'open',
      snoozedUntil: null,
      firedReminders: [],
      createdAt: ts,
      updatedAt: ts,
      completedAt: null,
    };
    this.tasks.push(task);
    this.write();
    return { ...task };
  }

  update(id: string, patch: TaskPatch, now = new Date()): Task {
    const p = parseOrThrow(taskPatchSchema, patch);
    const i = this.tasks.findIndex((x) => x.id === id);
    if (i < 0) throw new NotFoundError(`Task ${id} not found`);
    const prev = this.tasks[i];
    const next: Task = { ...prev, ...p, updatedAt: now.toISOString() };
    if (p.deadline !== undefined) {
      next.deadline = p.deadline ? new Date(p.deadline).toISOString() : null;
      if (next.deadline !== prev.deadline) next.snoozedUntil = null;
    }
    if (p.status && p.status !== prev.status) {
      next.completedAt = p.status === 'done' ? now.toISOString() : null;
      next.snoozedUntil = null;
    }
    this.tasks[i] = next;
    this.write();
    return { ...next };
  }

  remove(id: string): Task {
    const i = this.tasks.findIndex((x) => x.id === id);
    if (i < 0) throw new NotFoundError(`Task ${id} not found`);
    const [removed] = this.tasks.splice(i, 1);
    this.write();
    return removed;
  }

  /** Undo of a delete: puts the exact task back (US-005). */
  restore(task: Task): Task {
    const v = parseOrThrow(taskSchema, task);
    if (this.tasks.some((x) => x.id === v.id)) return { ...v };
    this.tasks.push(v);
    this.write();
    return { ...v };
  }

  /** Snooze a task's reminder until `untilIso` (US-011). */
  snooze(id: string, untilIso: string, now = new Date()): Task {
    const i = this.tasks.findIndex((x) => x.id === id);
    if (i < 0) throw new NotFoundError(`Task ${id} not found`);
    if (Number.isNaN(Date.parse(untilIso))) throw new ValidationError('Invalid date');
    this.tasks[i] = { ...this.tasks[i], snoozedUntil: new Date(untilIso).toISOString(), updatedAt: now.toISOString() };
    this.write();
    return { ...this.tasks[i] };
  }

  /** Replace every task (Import, US-016). The previous file becomes the backup. */
  replaceAll(tasks: Task[]): void {
    this.tasks = tasks.map((t) => parseOrThrow(taskSchema, t));
    this.write();
  }

  markFired(entries: { taskId: string; key: string }[]): void {
    if (entries.length === 0) return;
    for (const e of entries) {
      const t = this.tasks.find((x) => x.id === e.taskId);
      if (t && !t.firedReminders.includes(e.key)) t.firedReminders.push(e.key);
    }
    this.write();
  }
}
