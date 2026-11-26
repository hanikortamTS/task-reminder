/** Export / Import (SR-011, US-016). */
import * as fs from 'node:fs';
import type { Task, TaskFile } from './types';
import { taskFileSchema } from './validation';

export class ImportError extends Error {
  readonly code = 'INVALID_FILE';
}

export function exportTasks(file: string, tasks: Task[]): number {
  const body: TaskFile = { version: 1, tasks };
  fs.writeFileSync(file, JSON.stringify(body, null, 1), 'utf8');
  return tasks.length;
}

/** Reads and fully validates an export file. Throws ImportError and changes nothing if it is not valid. */
export function readImport(file: string): Task[] {
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    throw new ImportError('This file is not a Task Reminder export (it is not valid JSON).');
  }
  const r = taskFileSchema.safeParse(raw);
  if (!r.success) throw new ImportError('This file is not a Task Reminder export (unexpected content).');
  const ids = new Set(r.data.tasks.map((t) => t.id));
  if (ids.size !== r.data.tasks.length) throw new ImportError('This file contains the same task twice.');
  return r.data.tasks;
}
