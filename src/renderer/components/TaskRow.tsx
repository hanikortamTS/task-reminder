/** Task row — UX-001 (SR-007, US-004, US-005). */
import { deadlineLabel } from '../../core/dates';
import type { Task } from '../../core/types';

interface Props {
  task: Task;
  now: Date;
  selected: boolean;
  onSelect: () => void;
  onToggle: () => void;
}

export function TaskRow({ task, now, selected, onSelect, onToggle }: Props) {
  const done = task.status === 'done';
  const meta = done
    ? `Completed ${task.completedAt ? new Date(task.completedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : ''}`
    : deadlineLabel(task.deadline, now);
  const text = typeof meta === 'string' ? meta : meta.text;
  const overdue = typeof meta !== 'string' && meta.overdue;
  const noReminder = !done && task.deadline && task.reminderOffsets.length === 0 ? ' · no reminder' : '';
  return (
    <li
      className={`row${selected ? ' selected' : ''}${overdue ? ' overdue' : ''}${done ? ' done' : ''}`}
      data-testid="task-row"
      data-task-id={task.id}
      aria-selected={selected}
      onClick={onSelect}
    >
      <input
        type="checkbox"
        className="check"
        checked={done}
        aria-label={done ? `Reopen ${task.title}` : `Mark ${task.title} done`}
        onClick={(e) => e.stopPropagation()}
        onChange={onToggle}
      />
      <div className="row-text">
        <div className="row-title">{task.title}</div>
        <div className="row-meta" data-testid="task-meta">
          {text}
          {noReminder}
        </div>
      </div>
      {task.priority && (
        <span className="prio" title="High priority" aria-label="High priority">
          !
        </span>
      )}
    </li>
  );
}
