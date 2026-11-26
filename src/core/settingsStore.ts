import * as fs from 'node:fs';
import * as path from 'node:path';
import { z } from 'zod';
import { DEFAULT_SETTINGS, type Settings } from './types';

const schema = z.object({
  launchAtStartup: z.boolean(),
  defaultOffsets: z.array(z.number().int().min(0)).max(5),
  lastCheckedAt: z.string().nullable(),
});

/** settings.json next to tasks.json (SD-002). Falls back to defaults if missing or invalid. */
export class SettingsStore {
  private readonly file: string;
  private value: Settings = { ...DEFAULT_SETTINGS };

  constructor(dir: string) {
    this.file = path.join(dir, 'settings.json');
  }

  load(): Settings {
    try {
      const r = schema.partial().safeParse(JSON.parse(fs.readFileSync(this.file, 'utf8')));
      if (r.success) this.value = { ...DEFAULT_SETTINGS, ...r.data };
    } catch {
      this.value = { ...DEFAULT_SETTINGS };
    }
    return this.get();
  }

  get(): Settings {
    return { ...this.value, defaultOffsets: [...this.value.defaultOffsets] };
  }

  set(patch: Partial<Settings>): Settings {
    this.value = { ...this.value, ...patch };
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.value, null, 1));
    fs.renameSync(tmp, this.file);
    return this.get();
  }
}
