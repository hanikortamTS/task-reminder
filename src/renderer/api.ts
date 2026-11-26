import type { NewTaskInput, Task, TaskPatch } from '../core/types';

type R<T> = { ok: true; value: T } | { ok: false; code: string; message: string };

interface WindowApi {
  tasks: {
    list(): Promise<R<Task[]>>;
    create(input: NewTaskInput): Promise<R<Task>>;
    update(id: string, patch: TaskPatch): Promise<R<Task>>;
    delete(id: string): Promise<R<{ deleted: Task }>>;
    restore(task: Task): Promise<R<Task>>;
  };
  app: { info(): Promise<R<{ loadResult: string; version: string }>> };
  onTasksChanged(cb: (tasks: Task[]) => void): () => void;
  onFocusTask(cb: (p: { id: string }) => void): () => void;
  onQuickAdd(cb: (p: unknown) => void): () => void;
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
