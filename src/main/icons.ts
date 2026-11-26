import { nativeImage } from 'electron';
import * as path from 'node:path';

export const resourcesDir = () => path.join(__dirname, '..', '..', 'resources');
export const trayIcon = () => nativeImage.createFromPath(path.join(resourcesDir(), 'tray.png'));
export const appIcon = () => nativeImage.createFromPath(path.join(resourcesDir(), 'icon.png'));
