/** IPC handlers — LLD §3 contracts. Every input is validated in core (zod). */
import { ipcMain } from 'electron';
import type { TaskStore } from '../core/taskStore';
import type { NewTaskInput, Task, TaskPatch } from '../core/types';

export type IpcResult<T> = { ok: true; value: T } | { ok: false; code: string; message: string };

function wrap<T>(fn: () => T): IpcResult<T> {
  try {
    return { ok: true, value: fn() };
  } catch (e) {
    const err = e as Error & { code?: string };
    return { ok: false, code: err.code ?? 'ERROR', message: err.message };
  }
}

export function registerIpc(store: TaskStore, changed: () => void, info: () => { loadResult: string; version: string }): void {
  const mutate = <T>(fn: () => T) => {
    const r = wrap(fn);
    if (r.ok) changed();
    return r;
  };
  ipcMain.handle('tasks.list', () => wrap(() => store.list()));
  ipcMain.handle('tasks.create', (_e, input: NewTaskInput) => mutate(() => store.create(input)));
  ipcMain.handle('tasks.update', (_e, id: string, patch: TaskPatch) => mutate(() => store.update(String(id), patch)));
  ipcMain.handle('tasks.delete', (_e, id: string) => mutate(() => ({ deleted: store.remove(String(id)) })));
  ipcMain.handle('tasks.restore', (_e, task: Task) => mutate(() => store.restore(task)));
  ipcMain.handle('app.info', () => wrap(info));
}
