/** Settings — start with Windows, default reminders, export/import (US-016, SR-010, SR-011). */
import { useEffect, useState } from 'react';
import type { Settings } from '../../core/types';
import { api, unwrap, type AppInfo } from '../api';
import { ReminderEditor } from './ReminderEditor';

export function SettingsView({ info }: { info: AppInfo | null }) {
  const [s, setS] = useState<Settings | null>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    void unwrap(api().settings.get()).then(setS);
  }, []);

  const set = async (patch: Partial<Pick<Settings, 'launchAtStartup' | 'defaultOffsets'>>) => setS(await unwrap(api().settings.set(patch)));

  const run = async (kind: 'export' | 'import') => {
    try {
      const r = await unwrap(kind === 'export' ? api().data.export() : api().data.import());
      if (!r) return setMsg(null);
      setMsg({ tone: 'ok', text: 'path' in r ? `Exported ${r.count} tasks to ${r.path}` : `Imported ${r.count} tasks.` });
    } catch (e) {
      setMsg({ tone: 'err', text: (e as Error).message });
    }
  };

  if (!s) return null;
  return (
    <div className="settings" data-testid="view-settings">
      <h2>Settings</h2>
      <label className="row-setting">
        <input type="checkbox" data-testid="set-startup" checked={s.launchAtStartup} onChange={(e) => void set({ launchAtStartup: e.target.checked })} />
        Start Task Reminder with Windows (in the tray)
      </label>
      <div className="field">
        <span>Default reminders for new tasks</span>
        <ReminderEditor offsets={s.defaultOffsets} onChange={(o) => void set({ defaultOffsets: o })} />
      </div>
      <div className="field">
        <span>Your data</span>
        <div className="actions">
          <button data-testid="export" onClick={() => void run('export')}>
            Export tasks…
          </button>
          <button data-testid="import" onClick={() => void run('import')}>
            Import tasks…
          </button>
        </div>
        {msg && (
          <div className={msg.tone === 'ok' ? 'notice' : 'hint'} role="status" data-testid="data-msg">
            {msg.text}
          </div>
        )}
      </div>
      {info && (
        <p className="muted small">
          Version {info.version} · Data folder: {info.dataDir}
          <br />
          Quick add from anywhere: {info.shortcut ?? 'Ctrl+Alt+T is used by another app, so it is not available'}
        </p>
      )}
    </div>
  );
}
