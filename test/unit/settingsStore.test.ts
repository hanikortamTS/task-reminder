import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { SettingsStore } from '../../src/core/settingsStore';

describe('SettingsStore', () => {
  it('returns defaults, persists changes and ignores invalid files', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trs-'));
    const s = new SettingsStore(dir);
    expect(s.load()).toEqual({ launchAtStartup: true, defaultOffsets: [60, 0], lastCheckedAt: null });
    s.set({ launchAtStartup: false });
    expect(new SettingsStore(dir).load().launchAtStartup).toBe(false);
    fs.writeFileSync(path.join(dir, 'settings.json'), '{"defaultOffsets":"bad"}');
    expect(new SettingsStore(dir).load().defaultOffsets).toEqual([60, 0]);
    fs.rmSync(dir, { recursive: true });
  });
});
