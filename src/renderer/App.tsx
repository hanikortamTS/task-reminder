import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NewTaskInput, Task, TaskPatch } from '../core/types';
import { doneView, todayView, upcomingView, viewCounts } from '../core/selectors';
import { api, unwrap } from './api';
import { useNow } from './useNow';
import { QuickAdd } from './components/QuickAdd';
import { TaskRow } from './components/TaskRow';
import { DetailsPanel } from './components/DetailsPanel';

type View = 'today' | 'upcoming' | 'done';
interface Section {
  label: string;
  tone?: 'danger';
  tasks: Task[];
}

const EMPTY: Record<View, string> = {
  today: 'Nothing due today. Add your first task above.',
  upcoming: 'No upcoming tasks.',
  done: 'Nothing completed yet. Tick a task to see it here.',
};

export function App() {
  const now = useNow();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<View>('today');
  const [selected, setSelected] = useState<string | null>(null);
  const [undo, setUndo] = useState<Task | null>(null);
  const [banner, setBanner] = useState('');
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quickRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void unwrap(api().tasks.list()).then(setTasks);
    void unwrap(api().app.info()).then((i) => {
      if (i.loadResult === 'restored-from-backup') setBanner('Your task file was damaged, so it was restored from the automatic backup.');
      if (i.loadResult === 'reset-corrupt') setBanner('Your task file could not be read. It was kept as tasks.corrupt-*.json and a new list was started.');
    });
    const offs = [
      api().onTasksChanged(setTasks),
      api().onFocusTask(({ id }) => {
        setSelected(id);
        setTasks((ts) => {
          const t = ts.find((x) => x.id === id);
          if (t) setView(t.status === 'done' ? 'done' : todayView([t], new Date()).overdue.length || todayView([t], new Date()).today.length ? 'today' : 'upcoming');
          return ts;
        });
      }),
      api().onQuickAdd(() => quickRef.current?.focus()),
    ];
    return () => offs.forEach((off) => off());
  }, []);

  const sections: Section[] = useMemo(() => {
    if (view === 'today') {
      const v = todayView(tasks, now);
      return [
        { label: 'Overdue', tone: 'danger' as const, tasks: v.overdue },
        { label: 'Today', tasks: v.today },
      ].filter((s) => s.tasks.length);
    }
    if (view === 'upcoming') return upcomingView(tasks, now);
    const d = doneView(tasks, now);
    return d.length ? [{ label: 'Completed in the last 30 days', tasks: d }] : [];
  }, [tasks, view, now]);

  const visible = sections.flatMap((s) => s.tasks);
  const counts = viewCounts(tasks, now);
  const selectedTask = tasks.find((t) => t.id === selected) ?? null;

  const add = async (input: NewTaskInput) => {
    const t = await unwrap(api().tasks.create(input));
    if (!t.deadline || new Date(t.deadline) > new Date(new Date().setHours(23, 59, 59, 999))) setView('upcoming');
    else setView('today');
  };
  const patch = useCallback(async (id: string, p: TaskPatch) => {
    await unwrap(api().tasks.update(id, p));
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

  // Keyboard (SR-015): N new, Space done, Del delete, Esc close, arrows move.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement).closest('input, textarea, select');
      if (typing) return;
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        quickRef.current?.focus();
      } else if (e.key === 'Escape') setSelected(null);
      else if ((e.key === ' ' || e.key === 'Delete') && selectedTask) {
        e.preventDefault();
        if (e.key === ' ') toggle(selectedTask);
        else void remove(selectedTask.id);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const i = visible.findIndex((t) => t.id === selected);
        const j = e.key === 'ArrowDown' ? Math.min(i + 1, visible.length - 1) : Math.max(i - 1, 0);
        if (visible[j]) setSelected(visible[j].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="app">
      <nav className="sidebar" aria-label="Views">
        <div className="brand">✓ Task Reminder</div>
        {(['today', 'upcoming', 'done'] as View[]).map((v) => (
          <button key={v} data-testid={`nav-${v}`} className={`nav${view === v ? ' active' : ''}`} aria-current={view === v} onClick={() => setView(v)}>
            <span>{v[0].toUpperCase() + v.slice(1)}</span>
            <span className="count" data-testid={`count-${v}`}>
              {counts[v]}
            </span>
          </button>
        ))}
        <div className="keys muted small">
          N new · Space done · Del delete · ↑↓ move · Esc close
        </div>
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
        <QuickAdd ref={quickRef} now={now} onAdd={add} />
        <div className="list" data-testid={`view-${view}`}>
          {sections.length === 0 && (
            <p className="empty" data-testid="empty">
              {EMPTY[view]}
            </p>
          )}
          {sections.map((s) => (
            <section key={s.label}>
              <h2 className={s.tone === 'danger' ? 'section-overdue' : ''}>{s.label}</h2>
              <ul>
                {s.tasks.map((t) => (
                  <TaskRow key={t.id} task={t} now={now} selected={t.id === selected} onSelect={() => setSelected(t.id)} onToggle={() => toggle(t)} />
                ))}
              </ul>
            </section>
          ))}
        </div>
        {undo && (
          <div className="undo" role="status" data-testid="undo-bar">
            Task deleted
            <button data-testid="undo" onClick={() => void doUndo()}>
              UNDO
            </button>
          </div>
        )}
      </main>
      {selectedTask && (
        <DetailsPanel
          task={selectedTask}
          now={now}
          onPatch={(p) => patch(selectedTask.id, p)}
          onDelete={() => void remove(selectedTask.id)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
