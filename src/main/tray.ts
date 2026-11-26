/** System tray — HLD-001 (SR-010, US-013). */
import { Menu, Tray } from 'electron';
import { trayIcon } from './icons';

export function createTray(actions: { open: () => void; quickAdd: () => void; quit: () => void }): Tray {
  const tray = new Tray(trayIcon());
  tray.setToolTip('Task Reminder');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open Task Reminder', click: actions.open },
      { label: 'Add a task', click: actions.quickAdd },
      { type: 'separator' },
      { label: 'Quit', click: actions.quit },
    ]),
  );
  tray.on('click', actions.open);
  return tray;
}
