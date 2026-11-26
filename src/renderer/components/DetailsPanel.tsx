/** Details panel — UX-002/UX-003 (SR-002, SR-006, SR-008; US-002, US-005, US-008, US-011). Changes save automatically. */
import { useEffect, useState } from 'react';
import { formatWhen, fromLocalInput, SNOOZE_LABELS, toLocalInput, type SnoozeChoice } from '../../core/dates';
import { TITLE_MAX } from '../../core/validation';
import type { Task, TaskPatch } from '../../core/types';
import { ReminderEditor } from './ReminderEditor';

interface Props {
  task: Task;
  now: Date;
  /** Show Done/Snooze (the task is due, or was opened from a reminder). */
  reminderBar: boolean;
  onPatch: (patch: TaskPatch) => Promise<void>;
  onSnooze: (choice: SnoozeChoice) => Promise<void>;
  onDelete: () => void;
  onClose: () => void;
}

export function DetailsPanel({ task, now, reminderBar, onPatch, onSnooze, onDelete, onClose }: Props) {
  const [title, setTitle] = useState(task.title);
  const [deadline, setDeadline] = useState(toLocalInput(task.deadline));
  const [notes, setNotes] = useState(task.notes);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    setTitle(task.title);
    setDeadline(toLocalInput(task.deadline));
    setNotes(task.notes);
    setError('');
    setInfo('');
  }, [task.id, task.title, task.deadline, task.notes]);

  const save = async (patch: TaskPatch) => {
    try {
      await onPatch(patch);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const saveTitle = () => {
    if (title.trim() === task.title) return;
    if (!title.trim()) {
      setError('Give the task a name');
      setTitle(task.title);
      return;
    }
    if (title.trim().length > TITLE_MAX) setInfo(`Title shortened to ${TITLE_MAX} characters.`);
    void save({ title });
  };

  const iso = fromLocalInput(deadline);
  const past = task.status === 'open' && iso !== null && new Date(iso) < now;
  const done = task.status === 'done';
  const snoozed = task.snoozedUntil && new Date(task.snoozedUntil) > now ? new Date(task.snoozedUntil) : null;

  return (
    <aside className="details" data-testid="details" aria-label="Task details">
      <button className="close" aria-label="Close details" onClick={onClose}>
        ×
      </button>
      {reminderBar && !done && (
        <div className="reminder-bar" data-testid="reminder-bar" role="group" aria-label="Reminder actions">
          <button className="primary" data-testid="bar-done" onClick={() => void save({ status: 'done' })}>
            ✓ Done
          </button>
          {(Object.keys(SNOOZE_LABELS) as SnoozeChoice[]).map((c) => (
            <button key={c} data-testid={`bar-snooze-${c}`} onClick={() => void onSnooze(c).then(() => setInfo(`Snoozed — I'll remind you again ${c === 'tomorrow' ? 'tomorrow at 9:00' : c === '1h' ? 'in 1 hour' : 'in 10 minutes'}.`))}>
              {SNOOZE_LABELS[c]}
            </button>
          ))}
        </div>
      )}
      {snoozed && !done && (
        <div className="muted small" data-testid="snoozed-until">
          Snoozed until {formatWhen(snoozed, now)}
        </div>
      )}
      <label className="field">
        <span>Title</span>
        <input data-testid="details-title" value={title} onChange={(e) => setTitle(e.target.value)} onBlur={saveTitle} onKeyDown={(e) => e.key === 'Enter' && saveTitle()} />
      </label>
      <label className="field">
        <span>Deadline</span>
        <input
          type="datetime-local"
          data-testid="details-deadline"
          value={deadline}
          onChange={(e) => {
            setDeadline(e.target.value);
            void save({ deadline: fromLocalInput(e.target.value) });
          }}
        />
      </label>
      {past && <div className="warn">This deadline has already passed.</div>}
      <div className="field">
        <span>Reminders</span>
        <ReminderEditor offsets={task.reminderOffsets} disabled={done} onChange={(o) => void save({ reminderOffsets: o })} />
        {!task.deadline && task.reminderOffsets.length > 0 && <span className="muted small">Reminders start once the task has a deadline.</span>}
      </div>
      <div className="field">
        <span>Priority</span>
        <button
          className={`toggle${task.priority ? ' on' : ''}`}
          data-testid="details-priority"
          aria-pressed={task.priority}
          onClick={() => void save({ priority: !task.priority })}
        >
          {task.priority ? '! High priority' : 'Normal'}
        </button>
      </div>
      <label className="field">
        <span>Notes</span>
        <textarea data-testid="details-notes" rows={5} maxLength={5000} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== task.notes && void save({ notes })} />
      </label>
      {error && (
        <div className="hint" role="alert">
          {error}
        </div>
      )}
      {info && (
        <div className="notice" role="status" data-testid="details-info">
          {info}
        </div>
      )}
      <div className="actions">
        <button className="primary" data-testid="details-toggle" onClick={() => void save({ status: done ? 'open' : 'done' })}>
          {done ? 'Reopen' : '✓ Mark done'}
        </button>
        <button className="danger" data-testid="details-delete" onClick={onDelete}>
          Delete
        </button>
      </div>
      <p className="muted small">Changes save automatically.</p>
    </aside>
  );
}
