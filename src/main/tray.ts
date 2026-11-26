/** System tray — HLD-001 (SR-010, SR-012; US-012, US-013). */
import { Menu, Tray } from 'electron';
import { trayIcon } from './icons';

export interface TrayActions {
  open: () => void;
  quickAdd: () => void;
  togglePause: () => void;
  isPaused: () => boolean;
  quit: () => void;
}

export class AppTray {
  readonly tray: Tray;
  private count = -1;

  constructor(private readonly actions: TrayActions) {
    this.tray = new Tray(trayIcon());
    this.tray.on('click', actions.open);
    this.setDue(0);
  }

  private menu(): Menu {
    return Menu.buildFromTemplate([
      { label: 'Open Task Reminder', click: this.actions.open },
      { label: 'Add a task    Ctrl+Alt+T', click: this.actions.quickAdd },
      { label: 'Pause reminders for 1 hour', type: 'checkbox', checked: this.actions.isPaused(), click: this.actions.togglePause },
      { type: 'separator' },
      { label: 'Quit', click: this.actions.quit },
    ]);
  }

  /** Updates the badge, tooltip and menu. `due` = overdue + due within the hour. */
  setDue(due: number, force = false): void {
    if (due !== this.count || force) {
      this.tray.setImage(trayIcon(due));
      this.count = due;
    }
    const paused = this.actions.isPaused() ? ' · reminders paused' : '';
    this.tray.setToolTip(due > 0 ? `Task Reminder — ${due} due${paused}` : `Task Reminder${paused}`);
    this.tray.setContextMenu(this.menu());
  }

  get badge(): number {
    return this.count;
  }
}
