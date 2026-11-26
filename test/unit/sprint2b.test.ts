import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createLogger, LOG_MAX_BYTES } from '../../src/core/logger';
import { parseActionUrl } from '../../src/core/protocol';

describe('logger (G-07)', () => {
  it('appends one line per entry with level and time, on one line', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trlog-'));
    const l = createLogger(dir, () => new Date('2026-11-26T10:00:00Z'));
    l.log('info', 'started');
    l.log('error', 'bad\nthing');
    const lines = fs.readFileSync(l.file, 'utf8').trim().split('\n');
    expect(lines).toEqual(['2026-11-26T10:00:00.000Z INFO started', '2026-11-26T10:00:00.000Z ERROR bad thing']);
  });
  it('rotates to main.1.log when the file grows past the limit', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trlog-'));
    const l = createLogger(dir);
    fs.writeFileSync(l.file, 'x'.repeat(LOG_MAX_BYTES + 1));
    l.log('warn', 'after');
    expect(fs.existsSync(path.join(dir, 'main.1.log'))).toBe(true);
    expect(fs.readFileSync(l.file, 'utf8')).toMatch(/WARN after/);
  });
  it('never throws when the folder cannot be written', () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'trlog-')), 'f');
    fs.writeFileSync(file, '');
    expect(() => createLogger(path.join(file, 'sub')).log('info', 'x')).not.toThrow();
  });
});

describe('strict toast link parser (G-10)', () => {
  it('rejects user info, ports and extra paths', () => {
    expect(parseActionUrl('taskreminder://done?id=abc')).toEqual({ action: 'done', id: 'abc' });
    expect(parseActionUrl('taskreminder://u:p@done?id=abc')).toBeNull();
    expect(parseActionUrl('taskreminder://done:99?id=abc')).toBeNull();
    expect(parseActionUrl('taskreminder://done/x/y?id=abc')).toBeNull();
  });
});
