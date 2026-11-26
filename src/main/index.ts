/** App shell — HLD-001 / LLD-001 (SR-005, SR-006, SR-010, SR-012, SR-014). */
import { app, BrowserWindow, dialog, globalShortcut, powerMonitor } from 'electron';
import * as path from 'node:path';
import { TaskStore } from '../core/taskStore';
import { SettingsStore } from '../core/settingsStore';
import { dueTasks } from '../core/selectors';
import { snoozeTarget } from '../core/dates';
import { PROTOCOL, findActionUrl, type ToastAction } from '../core/protocol';
import { exportTasks, readImport } from '../core/dataTransfer';
import { createLogger } from '../core/logger';
import { SchedulerService } from './schedulerService';
import { Notifier } from './notifier';
import { AppTray } from './tray';
import { registerIpc } from './ipc';
import { appIcon } from './icons';

const APP_ID = 'com.hani.taskreminder';
const QUICK_SHORTCUT = 'Control+Alt+T';
const E2E = process.env.TASKREMINDER_E2E === '1';

// Data lives in %APPDATA%\TaskReminder (SD-002); tests point it at a temp folder.
app.setName('Task Reminder');
const dataDir = process.env.TASKREMINDER_DATA_DIR || path.join(app.getPath('appData'), 'TaskReminder');
app.setPath('userData', path.join(dataDir, 'electron'));
const logger = createLogger(path.join(dataDir, 'logs'));
process.on('uncaughtException', (e) => logger.log('error', `uncaught: ${e.stack ?? e.message}`));
process.on('unhandledRejection', (e) => logger.log('error', `unhandled rejection: ${String(e)}`));
app.setAppUserModelId(APP_ID); // Windows only shows toasts for apps with an AppUserModelID.

// taskreminder:// links from toast buttons (US-011). In development the script path must be passed too.
if (process.platform === 'win32' && !E2E) {
  if (process.defaultApp && process.argv[1]) app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  else app.setAsDefaultProtocolClient(PROTOCOL);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  let win: BrowserWindow | null = null;
  let quick: BrowserWindow | null = null;
  let tray: AppTray | null = null;
  let quitting = false;
  let pausedUntil = 0;
  let shortcutOk = false;
  /** Tasks from the last missed-reminder catch-up; the renderer may not be listening yet at start-up. */
  let lastMissed: string[] = [];
  const startHidden = process.argv.includes('--hidden');

  const settings = new SettingsStore(dataDir);
  const store = new TaskStore(dataDir, () => settings.get().defaultOffsets);

  const send = (channel: string, payload: unknown) => win?.webContents.send(channel, payload);

  const showWindow = () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  };

  const focusTask = (id: string | null) => {
    showWindow();
    if (id) send('ui.focusTask', { id, fromReminder: true });
  };

  const notifier = new Notifier(focusTask);

  const refreshBadge = () => tray?.setDue(dueTasks(store.list(), new Date()).length);

  const broadcast = () => {
    send('tasks.changed', store.list());
    refreshBadge();
  };

  const scheduler = new SchedulerService({
    tasks: () => store.list(),
    onDue: (due, { missed }) => {
      const tasks = store.list();
      if (Date.now() >= pausedUntil) {
        if (missed) {
          notifier.missed(tasks, due);
          lastMissed = [...new Set(due.map((r) => r.taskId))];
          send('ui.missed', { ids: lastMissed });
        } else notifier.remind(tasks, due);
      }
      store.markFired(due);
      broadcast();
    },
    onChecked: (at) => settings.set({ lastCheckedAt: new Date(at).toISOString() }),
  });

  const onTasksChanged = () => {
    scheduler.rearm();
    broadcast();
  };

  /** Toast button / body handler (US-010, US-011). */
  const handleAction = (a: ToastAction) => {
    try {
      if (a.action === 'open') return focusTask(a.id);
      if (a.action === 'done') store.update(a.id, { status: 'done' });
      else store.snooze(a.id, snoozeTarget(a.choice, new Date()).toISOString());
      onTasksChanged();
    } catch {
      focusTask(null); // task was deleted meanwhile: just open the app
    }
  };

  const applyLoginItem = () => {
    // Start with Windows, minimised to the tray (SR-010). Only for the installed/unzipped Windows app.
    if (app.isPackaged && process.platform === 'win32') {
      app.setLoginItemSettings({ openAtLogin: settings.get().launchAtStartup, args: ['--hidden'] });
    }
  };

  const secureWindow = (w: BrowserWindow) => {
    // SR-014: no navigation away from the bundled UI and no new windows.
    w.webContents.on('will-navigate', (e) => e.preventDefault());
    w.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  };

  const webPreferences = () => ({
    preload: path.join(__dirname, '..', 'preload', 'api.js'),
    contextIsolation: true,
    sandbox: true,
    nodeIntegration: false,
    webSecurity: true,
    spellcheck: true,
  });

  const rendererHtml = path.join(__dirname, '..', 'renderer', 'index.html');

  const createWindow = () => {
    win = new BrowserWindow({
      width: 1000,
      height: 680,
      minWidth: 720,
      minHeight: 480,
      show: false,
      title: 'Task Reminder',
      icon: appIcon(),
      autoHideMenuBar: true,
      webPreferences: webPreferences(),
    });
    secureWindow(win);
    win.on('close', (e) => {
      if (!quitting) {
        e.preventDefault(); // close-to-tray (US-013)
        win?.hide();
      }
    });
    win.once('ready-to-show', () => {
      if (!startHidden) win?.show();
    });
    void win.loadFile(rendererHtml);
  };

  /** Small always-on-top quick-add box (US-014). */
  const openQuick = () => {
    if (quick && !quick.isDestroyed()) {
      quick.show();
      quick.focus();
      quick.webContents.send('ui.quickReset', {});
      return;
    }
    quick = new BrowserWindow({
      width: 520,
      height: 150,
      frame: false,
      resizable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      show: false,
      title: 'Add a task',
      icon: appIcon(),
      webPreferences: webPreferences(),
    });
    secureWindow(quick);
    quick.on('blur', () => {
      if (!E2E) quick?.hide();
    });
    quick.once('ready-to-show', () => {
      quick?.show();
      quick?.focus();
    });
    void quick.loadFile(rendererHtml, { hash: 'quick' });
  };

  const pickPath = async (kind: 'save' | 'open'): Promise<string | null> => {
    if (E2E) return (globalThis as unknown as { __nextDialogPath?: string | null }).__nextDialogPath ?? null;
    const filters = [{ name: 'Task Reminder export', extensions: ['json'] }];
    if (kind === 'save') {
      const r = await dialog.showSaveDialog(win!, { defaultPath: `task-reminder-export-${new Date().toISOString().slice(0, 10)}.json`, filters });
      return r.canceled || !r.filePath ? null : r.filePath;
    }
    const r = await dialog.showOpenDialog(win!, { properties: ['openFile'], filters });
    return r.canceled || !r.filePaths[0] ? null : r.filePaths[0];
  };

  const confirmImport = async (current: number, incoming: number) => {
    if (E2E) return true;
    const r = await dialog.showMessageBox(win!, {
      type: 'question',
      buttons: ['Replace my tasks', 'Cancel'],
      defaultId: 1,
      cancelId: 1,
      message: `Replace your ${current} tasks with the ${incoming} tasks in this file?`,
      detail: 'Your current list is kept as tasks.bak.json in case you change your mind.',
    });
    return r.response === 0;
  };

  app.on('second-instance', (_e, argv) => {
    const a = findActionUrl(argv);
    if (a) handleAction(a);
    else showWindow();
  });
  app.on('before-quit', () => {
    quitting = true;
    scheduler.stop();
    settings.set({ lastCheckedAt: new Date().toISOString() });
  });
  app.on('will-quit', () => globalShortcut.unregisterAll());
  app.on('window-all-closed', () => {
    /* keep running in the tray */
  });

  void app.whenReady().then(() => {
    settings.load();
    store.load();
    logger.log('info', `start v${app.getVersion()} tasks=${store.list().length} load=${store.loadResult}`);
    registerIpc({
      store,
      settings,
      changed: onTasksChanged,
      settingsChanged: applyLoginItem,
      info: () => ({ loadResult: store.loadResult, version: app.getVersion(), dataDir, shortcut: shortcutOk ? 'Ctrl+Alt+T' : null, missed: lastMissed }),
      exportData: async () => {
        const p = await pickPath('save');
        return p ? { path: p, count: exportTasks(p, store.list()) } : null;
      },
      importData: async () => {
        const p = await pickPath('open');
        if (!p) return null;
        const tasks = readImport(p); // throws INVALID_FILE and changes nothing
        if (!(await confirmImport(store.list().length, tasks.length))) return null;
        store.replaceAll(tasks);
        return { count: tasks.length };
      },
      log: (level, message) => logger.log(level, message),
      closeQuick: () => quick?.hide(),
    });
    createWindow();
    tray = new AppTray({
      open: showWindow,
      quickAdd: openQuick,
      isPaused: () => Date.now() < pausedUntil,
      togglePause: () => {
        pausedUntil = Date.now() < pausedUntil ? 0 : Date.now() + 60 * 60_000;
        refreshBadge();
      },
      quit: () => {
        quitting = true;
        app.quit();
      },
    });
    shortcutOk = globalShortcut.register(QUICK_SHORTCUT, openQuick);
    applyLoginItem();
    // Catch up on reminders missed while the app was not running (US-009), then keep scheduling.
    const last = settings.get().lastCheckedAt;
    scheduler.start(last ? Date.parse(last) : null);
    // ...and after the PC wakes up from sleep.
    powerMonitor.on('resume', () => scheduler.tick());
    // Badge depends on the clock ("due within the hour"), so refresh it every minute.
    setInterval(refreshBadge, 60_000);
    refreshBadge();
    // Opened by a toast button while the app was not running.
    const a = findActionUrl(process.argv);
    if (a) win!.webContents.once('did-finish-load', () => handleAction(a));
  });

  if (E2E) {
    // Test seam: lets Playwright read notifications, simulate toast activations and dialogs.
    (globalThis as Record<string, unknown>).__taskReminderTest = {
      notifications: () => notifier.history,
      clickNotification: (taskId: string) => focusTask(taskId),
      toastAction: (url: string) => {
        const a = findActionUrl([url]);
        if (a) handleAction(a);
        return a !== null;
      },
      resume: () => scheduler.tick(),
      openQuick,
      quickVisible: () => (quick && !quick.isDestroyed() ? quick.isVisible() : false),
      badge: () => tray?.badge ?? -1,
      setDialogPath: (p: string | null) => ((globalThis as Record<string, unknown>).__nextDialogPath = p),
      hideWindow: () => win?.close(),
      isVisible: () => win?.isVisible() ?? false,
    };
  }
}
