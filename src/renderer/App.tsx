import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NewTaskInput, Task, TaskPatch } from '../core/types';
import type { SnoozeChoice } from '../core/dates';
import { compareTasks, doneView, dueTasks, searchTasks, todayView, upcomingView, viewCounts } from '../core/selectors';
import { api, unwrap, type AppInfo } from './api';
import { useNow } from './useNow';
import { QuickAdd } from './components/QuickAdd';
import { TaskRow } from './components/TaskRow';
import { DetailsPanel } from './components/DetailsPanel';
import { SettingsView } from './components/SettingsView';

type View = 'today' | 'upcoming' | 'done' | 'settings';
interface Section {
  label: string;
  tone?: 'danger';
  tasks: Task[];
}

const EMPTY: Record<Exclude<View, 'settings'>, string> = {
  today: 'Nothing due today. Add your first task above.',
  upcoming: 'No upcoming tasks.',
  done: 'Nothing completed yet. Tick a task to see it here.',
};

const viewOf = (t: Task, now: Date): View => {
  if (t.status === 'done') return 'done';
  const tv = todayView([t], now);
  return tv.overdue.length || tv.today.length ? 'today' : 'upcoming';
};

export function App() {
  const now = useNow();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<View>('today');
  const [selected, setSelected] = useState<string | null>(null);
  const [fromReminder, setFromReminder] = useState<string | null>(null);
  const [undo, setUndo] = useState<Task | null>(null);
  const [banner, setBanner] = useState('');
  const [missed, setMissed] = useState<string[]>([]);
  const [dueDismissed, setDueDismissed] = useState(false);
  const [query, setQuery] = useState('');
  const [info, setInfo] = useState<AppInfo | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quickRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void unwrap(api().tasks.list()).then(setTasks);
    void unwrap(api().app.info()).then((i) => {
      setInfo(i);
      if (i.missed.length) setMissed(i.missed);
      if (i.loadResult === 'restored-from-backup') setBanner('Your task file was damaged, so it was restored from the automatic backup.');
      if (i.loadResult === 'reset-corrupt') setBanner('Your task file could not be read. It was kept as tasks.corrupt-*.json and a new list was started.');
    });
    const offs = [
      api().onTasksChanged(setTasks),
      api().onFocusTask(({ id, fromReminder: fr }) => {
        setQuery('');
        setSelected(id);
        if (fr) setFromReminder(id);
        setTasks((ts) => {
          const t = ts.find((x) => x.id === id);
          if (t) setView(viewOf(t, new Date()));
          return ts;
        });
      }),
      api().onMissed(({ ids }) => {
        setMissed(ids);
        setView('today');
      }),
    ];
    // Any failed call to the app (save, delete, snooze, settings) shows a banner instead of failing silently (review G-04).
    const onFail = (e: PromiseRejectionEvent) => {
      e.preventDefault();
      const msg = e.reason instanceof Error ? e.reason.message : String(e.reason);
      setBanner(`That did not work: ${msg}. Please try again.`);
      void api().app.log?.('error', msg);
    };
    window.addEventListener('unhandledrejection', onFail);
    return () => {
      offs.forEach((off) => off());
      window.removeEventListener('unhandledrejection', onFail);
    };
  }, []);

  const sections: Section[] = useMemo(() => {
    if (query.trim()) {
      const found = searchTasks(tasks, query);
      return [
        { label: 'Open', tasks: found.filter((t) => t.status === 'open').sort(compareTasks) },
        { label: 'Done', tasks: found.filter((t) => t.status === 'done') },
      ].filter((s) => s.tasks.length);
    }
    if (view === 'today') {
      const v = todayView(tasks, now);
      return [
        { label: 'Overdue', tone: 'danger' as const, tasks: v.overdue },
        { label: 'Today', tasks: v.today },
      ].filter((s) => s.tasks.length);
    }
    if (view === 'upcoming') return upcomingView(tasks, now);
    if (view === 'done') {
      const d = doneView(tasks, now);
      return d.length ? [{ label: 'Completed in the last 30 days', tasks: d }] : [];
    }
    return [];
  }, [tasks, view, now, query]);

  const visible = sections.flatMap((s) => s.tasks);
  const counts = viewCounts(tasks, now);
  const due = dueTasks(tasks, now);
  const dueIds = new Set(due.map((t) => t.id));
  const selectedTask = tasks.find((t) => t.id === selected) ?? null;
  const missedTasks = missed.map((id) => tasks.find((t) => t.id === id)).filter((t): t is Task => !!t && t.status === 'open');

  const add = async (input: NewTaskInput) => {
    const t = await unwrap(api().tasks.create(input));
    setQuery('');
    setView(viewOf(t, new Date()));
  };
  const patch = useCallback(async (id: string, p: TaskPatch) => {
    await unwrap(api().tasks.update(id, p));
  }, []);
  const snooze = useCallback(async (id: string, c: SnoozeChoice) => {
    await unwrap(api().reminders.snooze(id, c));
    setFromReminder(null);
  }, []);
  const toggle = (t: Task) => void patch(t.id, { status: t.status === 'done' ? 'open' : 'done' });
  const remove = useCallback(async (id: string) => {
    const { deleted } = await unwrap(api().tasks.delete(id));
    setSelected(null);
    setUndo(deleted);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), 5000);
  }, []);
  const doUndo = async () => {
    if (!undo) return;
    await unwrap(api().tasks.restore(undo));
    setSelected(undo.id);
    setUndo(null);
  };
  const pick = (id: string) => {
    setSelected(id);
    if (id !== fromReminder) setFromReminder(null);
  };

  // Keyboard (SR-015): N new, / search, Space done, Del delete, Esc close, arrows move.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement).closest('input, textarea, select');
      if (typing) {
        if (e.key === 'Escape' && e.target === searchRef.current) {
          setQuery('');
          searchRef.current?.blur();
        }
        return;
      }
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        quickRef.current?.focus();
      } else if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === 'Escape') setSelected(null);
      else if ((e.key === ' ' || e.key === 'Delete') && selectedTask) {
        e.preventDefault();
        if (e.key === ' ') toggle(selectedTask);
        else void remove(selectedTask.id);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const i = visible.findIndex((t) => t.id === selected);
        const j = e.key === 'ArrowDown' ? Math.min(i + 1, visible.length - 1) : Math.max(i - 1, 0);
        if (visible[j]) pick(visible[j].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const listView = view !== 'settings' || query.trim() !== '';

  return (
    <div className="app">
      <nav className="sidebar" aria-label="Views">
        <div className="brand">✓ Task Reminder</div>
        {(['today', 'upcoming', 'done'] as const).map((v) => (
          <button
            key={v}
            data-testid={`nav-${v}`}
            className={`nav${view === v && !query ? ' active' : ''}`}
            aria-current={view === v}
            onClick={() => {
              setQuery('');
              setView(v);
            }}
          >
            <span>{v[0].toUpperCase() + v.slice(1)}</span>
            <span className="count" data-testid={`count-${v}`}>
              {counts[v]}
            </span>
          </button>
        ))}
        <button
          data-testid="nav-settings"
          className={`nav settings-nav${view === 'settings' && !query ? ' active' : ''}`}
          onClick={() => {
            setQuery('');
            setView('settings');
            setSelected(null);
          }}
        >
          Settings
        </button>
        <div className="keys muted small">N new · / search · Space done · Del delete · ↑↓ move · Esc close</div>
      </nav>
      <main className="main">
        {banner && (
          <div className="banner" role="status" data-testid="banner">
            {banner}
            <button aria-label="Dismiss" onClick={() => setBanner('')}>
              ×
            </button>
          </div>
        )}
        {missedTasks.length > 0 && (
          <div className="banner due" role="status" data-testid="missed-banner">
            <span>
              You missed {missedTasks.length} reminder{missedTasks.length > 1 ? 's' : ''} while Task Reminder was not running:{' '}
              {missedTasks.map((t, i) => (
                <span key={t.id}>
                  {i > 0 && ', '}
                  <a href="#" onClick={(e) => (e.preventDefault(), pick(t.id), setFromReminder(t.id))}>
                    {t.title}
                  </a>
                </span>
              ))}
            </span>
            <button aria-label="Dismiss" onClick={() => setMissed([])}>
              ×
            </button>
          </div>
        )}
        {missedTasks.length === 0 && due.length > 0 && !dueDismissed && (
          <div className="banner due" role="status" data-testid="due-banner">
            <span>
              Due now:{' '}
              {due.slice(0, 3).map((t, i) => (
                <span key={t.id}>
                  {i > 0 && ', '}
                  <a href="#" onClick={(e) => (e.preventDefault(), setView(viewOf(t, now)), setQuery(''), pick(t.id))}>
                    {t.title}
                  </a>
                </span>
              ))}
              {due.length > 3 && ` and ${due.length - 3} more`}
            </span>
            <button aria-label="Dismiss" onClick={() => setDueDismissed(true)}>
              ×
            </button>
          </div>
        )}
        <div className="toolbar">
          <QuickAdd ref={quickRef} now={now} onAdd={add} />
          <input ref={searchRef} className="search" type="search" data-testid="search" aria-label="Search tasks" placeholder="Search   ( / )" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {listView ? (
          <div className="list" data-testid={query.trim() ? 'view-search' : `view-${view}`}>
            {sections.length === 0 && (
              <p className="empty" data-testid="empty">
                {query.trim() ? `No tasks match ‘${query.trim()}’` : EMPTY[view as Exclude<View, 'settings'>]}
              </p>
            )}
            {sections.map((s) => (
              <section key={s.label}>
                <h2 className={s.tone === 'danger' ? 'section-overdue' : ''}>{s.label}</h2>
                <ul>
                  {s.tasks.map((t) => (
                    <TaskRow key={t.id} task={t} now={now} selected={t.id === selected} onSelect={() => pick(t.id)} onToggle={() => toggle(t)} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <SettingsView info={info} />
        )}
        {undo && (
          <div className="undo" role="status" data-testid="undo-bar">
            Task deleted
            <button data-testid="undo" onClick={() => void doUndo()}>
              UNDO
            </button>
          </div>
        )}
      </main>
      {selectedTask && listView && (
        <DetailsPanel
          task={selectedTask}
          now={now}
          reminderBar={selectedTask.id === fromReminder || dueIds.has(selectedTask.id)}
          onPatch={(p) => patch(selectedTask.id, p)}
          onSnooze={(c) => snooze(selectedTask.id, c)}
          onDelete={() => void remove(selectedTask.id)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
