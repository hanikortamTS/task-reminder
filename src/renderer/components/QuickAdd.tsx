/** Quick add — UX-001, US-001 (SR-001). */
import { forwardRef, useState } from 'react';
import { quickChips, type ChipId } from '../../core/dates';
import type { NewTaskInput } from '../../core/types';
import { TITLE_MAX } from '../../core/validation';

interface Props {
  now: Date;
  onAdd: (input: NewTaskInput) => Promise<void>;
  compact?: boolean;
}

export const QuickAdd = forwardRef<HTMLInputElement, Props>(function QuickAdd({ now, onAdd, compact }, ref) {
  const [title, setTitle] = useState('');
  const [chip, setChip] = useState<ChipId | null>(null);
  const [custom, setCustom] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [notice, setNotice] = useState('');
  const chips = quickChips(now);

  const deadline = (): string | null => {
    if (custom) return new Date(custom).toISOString();
    const c = chips.find((x) => x.id === chip);
    return c ? c.at.toISOString() : null;
  };

  const submit = async () => {
    if (!title.trim()) {
      setError('Give the task a name');
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    try {
      await onAdd({ title, deadline: deadline() });
      setNotice(title.trim().length > TITLE_MAX ? `Title shortened to ${TITLE_MAX} characters.` : '');
      setTitle('');
      setChip(null);
      setCustom('');
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="quickadd-wrap">
      <div className={`quickadd${shake ? ' shake' : ''}${error ? ' has-error' : ''}`}>
        <input
          ref={ref}
          data-testid="quickadd-input"
          aria-label="New task title"
          placeholder={compact ? 'What do you need to do?' : 'Add a task…   (press N)'}
          value={title}
          maxLength={400}
          onChange={(e) => {
            setTitle(e.target.value);
            if (error) setError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit();
            if (e.key === 'Escape') (e.target as HTMLInputElement).blur();
          }}
        />
        <div className="chips" role="group" aria-label="Deadline">
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              data-testid={`chip-${c.id}`}
              className={`chip${chip === c.id && !custom ? ' on' : ''}`}
              aria-pressed={chip === c.id && !custom}
              onClick={() => {
                setCustom('');
                setChip(chip === c.id ? null : c.id);
              }}
            >
              {c.label}
            </button>
          ))}
          <input
            type="datetime-local"
            data-testid="chip-custom"
            className={`chip date${custom ? ' on' : ''}`}
            aria-label="Pick a date and time"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
        </div>
      </div>
      <div className="hint" role="alert" data-testid="quickadd-error">
        {error}
      </div>
      {notice && !error && (
        <div className="notice" role="status" data-testid="quickadd-notice">
          {notice}
        </div>
      )}
    </div>
  );
});
