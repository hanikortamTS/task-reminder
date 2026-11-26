/** Small local log file — %APPDATA%\TaskReminder\logs\main.log (Admin Guide §5, review G-07). Never logs task text. */
import fs from 'node:fs';
import path from 'node:path';

export type LogLevel = 'info' | 'warn' | 'error';
export const LOG_MAX_BYTES = 512 * 1024;

export interface Logger {
  log(level: LogLevel, message: string): void;
  readonly file: string;
}

export function createLogger(dir: string, now: () => Date = () => new Date()): Logger {
  const file = path.join(dir, 'main.log');
  return {
    file,
    log(level, message) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        if (fs.existsSync(file) && fs.statSync(file).size > LOG_MAX_BYTES) {
          fs.renameSync(file, path.join(dir, 'main.1.log'));
        }
        const line = `${now().toISOString()} ${level.toUpperCase()} ${message.replace(/[\r\n]+/g, ' ').slice(0, 1000)}\n`;
        fs.appendFileSync(file, line, 'utf8');
      } catch {
        // Logging must never break the app.
      }
    },
  };
}
