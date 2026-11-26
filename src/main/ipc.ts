/** IPC handlers — LLD §3 contracts. Every input is validated (zod in core, or here). */
import { ipcMain } from 'electron';
import { z } from 'zod';
import type { TaskStore } from '../core/taskStore';
import type { SettingsStore } from '../core/settingsStore';
import type { NewTaskInput, Settings, Task, TaskPatch } from '../core/types';
import { snoozeTarget, type SnoozeChoice } from '../core/dates';
import { parseOrThrow } from '../core/validation';

export type IpcResult<T> = { ok: true; value: T } | { ok: false; code: string; message: string };

let onError: (msg: string) => void = () => {};

async function wrap<T>(fn: () => T | Promise<T>): Promise<IpcResult<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (e) {
    const err = e as Error & { code?: string };
    onError(`ipc ${err.code ?? 'ERROR'}: ${err.message}`);
    return { ok: false, code: err.code ?? 'ERROR', message: err.message };
  }
}

const settingsPatch = z
  .object({
    launchAtStartup: z.boolean(),
    defaultOffsets: z.array(z.number().int().min(0).max(43200)).max(5),
  })
  .partial()
  .strict();
const snoozeChoice = z.enum(['10m', '1h', 'tomorrow']);
const logEntry = z.object({ level: z.enum(['info', 'warn', 'error']), message: z.string().max(1000) }).strict();

export interface IpcDeps {
  store: TaskStore;
  settings: SettingsStore;
  changed: () => void;
  settingsChanged: (s: Settings) => void;
  info: () => unknown;
  exportData: () => Promise<{ path: string; count: number } | null>;
  importData: () => Promise<{ count: number } | null>;
  closeQuick: () => void;
  log: (level: 'info' | 'warn' | 'error', message: string) => void;
}

export function registerIpc(d: IpcDeps): void {
  onError = (m) => d.log('warn', m);
  const mutate = async <T>(fn: () => T) => {
    const r = await wrap(fn);
    if (r.ok) d.changed();
    return r;
  };
  ipcMain.handle('tasks.list', () => wrap(() => d.store.list()));
  ipcMain.handle('tasks.create', (_e, input: NewTaskInput) => mutate(() => d.store.create(input)));
  ipcMain.handle('tasks.update', (_e, id: string, patch: TaskPatch) => mutate(() => d.store.update(String(id), patch)));
  ipcMain.handle('tasks.delete', (_e, id: string) => mutate(() => ({ deleted: d.store.remove(String(id)) })));
  ipcMain.handle('tasks.restore', (_e, task: Task) => mutate(() => d.store.restore(task)));
  ipcMain.handle('reminders.snooze', (_e, id: string, choice: SnoozeChoice) =>
    mutate(() => d.store.snooze(String(id), snoozeTarget(parseOrThrow(snoozeChoice, choice), new Date()).toISOString())),
  );
  ipcMain.handle('settings.get', () => wrap(() => d.settings.get()));
  ipcMain.handle('settings.set', (_e, patch: Partial<Settings>) =>
    wrap(() => {
      const s = d.settings.set(parseOrThrow(settingsPatch, patch));
      d.settingsChanged(s);
      return s;
    }),
  );
  ipcMain.handle('data.export', () => wrap(d.exportData));
  ipcMain.handle('data.import', () =>
    wrap(async () => {
      const r = await d.importData();
      if (r) d.changed();
      return r;
    }),
  );
  ipcMain.handle('app.info', () => wrap(d.info));
  ipcMain.handle('quick.close', () => wrap(d.closeQuick));
  ipcMain.handle('app.log', (_e, level: unknown, message: unknown) =>
    wrap(() => {
      const r = parseOrThrow(logEntry, { level, message });
      d.log(r.level, `renderer: ${r.message}`);
    }),
  );
}
