import { nativeImage } from 'electron';
import * as path from 'node:path';

export const resourcesDir = () => path.join(__dirname, '..', '..', 'resources');
/** Tray icon with a red count badge (SR-012). 0 = plain icon. */
export const trayIcon = (count = 0) =>
  nativeImage.createFromPath(path.join(resourcesDir(), count <= 0 ? 'tray.png' : count > 9 ? 'tray-9plus.png' : `tray-${count}.png`));
export const appIcon = () => nativeImage.createFromPath(path.join(resourcesDir(), 'icon.png'));
