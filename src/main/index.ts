/** App shell — HLD-001 / LLD-001 (SR-010, SR-014, US-013). */
import { app, BrowserWindow, shell } from 'electron';
import * as path from 'node:path';
import { TaskStore } from '../core/taskStore';
import { SettingsStore } from '../core/settingsStore';
import { SchedulerService } from './schedulerService';
import { Notifier } from './notifier';
import { createTray } from './tray';
import { registerIpc } from './ipc';
import { appIcon } from './icons';

const APP_ID = 'com.hani.taskreminder';
const E2E = process.env.TASKREMINDER_E2E === '1';

// Data lives in %APPDATA%\TaskReminder (SD-002); tests point it at a temp folder.
app.setName('Task Reminder');
const dataDir = process.env.TASKREMINDER_DATA_DIR || path.join(app.getPath('appData'), 'TaskReminder');
app.setPath('userData', path.join(dataDir, 'electron'));
app.setAppUserModelId(APP_ID); // Windows only shows toasts for apps with an AppUserModelID.

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  let win: BrowserWindow | null = null;
  let quitting = false;
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

  const notifier = new Notifier((taskId) => {
    showWindow();
    if (taskId) send('ui.focusTask', { id: taskId });
  });

  const scheduler = new SchedulerService({
    tasks: () => store.list(),
    onDue: (due) => {
      notifier.remind(store.list(), due);
      store.markFired(due);
      settings.set({ lastCheckedAt: new Date().toISOString() });
      send('tasks.changed', store.list());
    },
  });

  const onTasksChanged = () => {
    scheduler.rearm();
    send('tasks.changed', store.list());
  };

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
      backgroundColor: '#ffffff',
      webPreferences: {
        preload: path.join(__dirname, '..', 'preload', 'api.js'),
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
        webSecurity: true,
        spellcheck: true,
      },
    });
    // SR-014: no navigation away from the bundled UI and no new windows.
    win.webContents.on('will-navigate', (e) => e.preventDefault());
    win.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('https://')) void shell.openExternal(url);
      return { action: 'deny' };
    });
    win.on('close', (e) => {
      if (!quitting) {
        e.preventDefault(); // close-to-tray (US-013)
        win?.hide();
      }
    });
    win.once('ready-to-show', () => {
      if (!startHidden) win?.show();
    });
    void win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  };

  app.on('second-instance', showWindow);
  app.on('before-quit', () => {
    quitting = true;
    scheduler.stop();
  });
  app.on('window-all-closed', () => {
    /* keep running in the tray */
  });

  void app.whenReady().then(() => {
    settings.load();
    store.load();
    registerIpc(store, onTasksChanged, () => ({ loadResult: store.loadResult, version: app.getVersion() }));
    createWindow();
    createTray({
      open: showWindow,
      quickAdd: () => {
        showWindow();
        send('ui.quickAdd', {});
      },
      quit: () => {
        quitting = true;
        app.quit();
      },
    });
    // Start with Windows, minimised to the tray (SR-010). Only for the installed Windows app.
    if (app.isPackaged && process.platform === 'win32') {
      app.setLoginItemSettings({ openAtLogin: settings.get().launchAtStartup, args: ['--hidden'] });
    }
    scheduler.rearm();
  });

  if (E2E) {
    // Test seam: lets Playwright read shown notifications and trigger a notification click.
    (globalThis as Record<string, unknown>).__taskReminderTest = {
      notifications: () => notifier.history,
      clickNotification: (taskId: string) => {
        showWindow();
        send('ui.focusTask', { id: taskId });
      },
      hideWindow: () => win?.close(),
      isVisible: () => win?.isVisible() ?? false,
    };
  }
}
