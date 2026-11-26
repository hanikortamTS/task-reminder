import type { NewTaskInput, Settings, Task, TaskPatch } from '../core/types';
import type { SnoozeChoice } from '../core/dates';

type R<T> = { ok: true; value: T } | { ok: false; code: string; message: string };

export interface AppInfo {
  loadResult: string;
  version: string;
  dataDir: string;
  shortcut: string | null;
  /** Task ids from the start-up catch-up of missed reminders. */
  missed: string[];
}

interface WindowApi {
  tasks: {
    list(): Promise<R<Task[]>>;
    create(input: NewTaskInput): Promise<R<Task>>;
    update(id: string, patch: TaskPatch): Promise<R<Task>>;
    delete(id: string): Promise<R<{ deleted: Task }>>;
    restore(task: Task): Promise<R<Task>>;
  };
  reminders: { snooze(id: string, choice: SnoozeChoice): Promise<R<Task>> };
  settings: { get(): Promise<R<Settings>>; set(patch: Partial<Pick<Settings, 'launchAtStartup' | 'defaultOffsets'>>): Promise<R<Settings>> };
  data: { export(): Promise<R<{ path: string; count: number } | null>>; import(): Promise<R<{ count: number } | null>> };
  app: { info(): Promise<R<AppInfo>>; log?(level: 'info' | 'warn' | 'error', message: string): Promise<R<void>> };
  quick: { close(): Promise<R<void>> };
  onTasksChanged(cb: (tasks: Task[]) => void): () => void;
  onFocusTask(cb: (p: { id: string; fromReminder?: boolean }) => void): () => void;
  onMissed(cb: (p: { ids: string[] }) => void): () => void;
  onQuickReset(cb: (p: unknown) => void): () => void;
}

declare global {
  interface Window {
    api: WindowApi;
  }
}

export const api = (): WindowApi => window.api;

export async function unwrap<T>(p: Promise<R<T>>): Promise<T> {
  const r = await p;
  if (!r.ok) throw new Error(r.message);
  return r.value;
}
