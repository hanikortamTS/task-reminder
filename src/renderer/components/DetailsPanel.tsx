/** Details panel — UX-002 (SR-008, US-005). Changes save automatically. */
import { useEffect, useState } from 'react';
import { fromLocalInput, toLocalInput } from '../../core/dates';
import type { Task, TaskPatch } from '../../core/types';

interface Props {
  task: Task;
  now: Date;
  onPatch: (patch: TaskPatch) => Promise<void>;
  onDelete: () => void;
  onClose: () => void;
}

export function DetailsPanel({ task, now, onPatch, onDelete, onClose }: Props) {
  const [title, setTitle] = useState(task.title);
  const [deadline, setDeadline] = useState(toLocalInput(task.deadline));
  const [error, setError] = useState('');

  useEffect(() => {
    setTitle(task.title);
    setDeadline(toLocalInput(task.deadline));
    setError('');
  }, [task.id, task.title, task.deadline]);

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
    void save({ title });
  };

  const iso = fromLocalInput(deadline);
  const past = task.status === 'open' && iso !== null && new Date(iso) < now;
  const done = task.status === 'done';

  return (
    <aside className="details" data-testid="details" aria-label="Task details">
      <button className="close" aria-label="Close details" onClick={onClose}>
        ×
      </button>
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
      {error && (
        <div className="hint" role="alert">
          {error}
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
