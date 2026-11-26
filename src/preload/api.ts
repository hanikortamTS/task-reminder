/** Typed, minimal bridge — HLD-006 (SR-014). The renderer never sees ipcRenderer. */
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

const invoke = (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args);
const on = (channel: string, cb: (payload: unknown) => void) => {
  const h = (_e: IpcRendererEvent, p: unknown) => cb(p);
  ipcRenderer.on(channel, h);
  return () => ipcRenderer.removeListener(channel, h);
};

const api = {
  tasks: {
    list: () => invoke('tasks.list'),
    create: (input: unknown) => invoke('tasks.create', input),
    update: (id: string, patch: unknown) => invoke('tasks.update', id, patch),
    delete: (id: string) => invoke('tasks.delete', id),
    restore: (task: unknown) => invoke('tasks.restore', task),
  },
  app: { info: () => invoke('app.info') },
  onTasksChanged: (cb: (tasks: unknown) => void) => on('tasks.changed', cb),
  onFocusTask: (cb: (p: unknown) => void) => on('ui.focusTask', cb),
  onQuickAdd: (cb: (p: unknown) => void) => on('ui.quickAdd', cb),
};

contextBridge.exposeInMainWorld('api', api);
export type Api = typeof api;
