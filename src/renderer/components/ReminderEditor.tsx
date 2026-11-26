/** Per-task reminder times — US-008 (SR-003). Presets plus a custom value; max 5. */
import { useState } from 'react';
import { OFFSET_PRESETS, offsetLabel } from '../../core/dates';
import { MAX_OFFSETS } from '../../core/validation';

interface Props {
  offsets: number[];
  disabled?: boolean;
  onChange: (offsets: number[]) => void;
}

export function ReminderEditor({ offsets, disabled, onChange }: Props) {
  const [customValue, setCustomValue] = useState('');
  const [customUnit, setCustomUnit] = useState<'min' | 'h' | 'd'>('min');
  const [showCustom, setShowCustom] = useState(false);
  const sorted = [...offsets].sort((a, b) => b - a);
  const add = (m: number) => {
    if (offsets.includes(m) || offsets.length >= MAX_OFFSETS) return;
    onChange([...offsets, m]);
  };
  const addCustom = () => {
    const n = Number(customValue);
    if (!Number.isInteger(n) || n < 0) return;
    add(n * (customUnit === 'd' ? 1440 : customUnit === 'h' ? 60 : 1));
    setCustomValue('');
    setShowCustom(false);
  };
  return (
    <div className="reminders" data-testid="reminder-editor">
      {sorted.length === 0 && <span className="muted" data-testid="no-reminder">No reminder</span>}
      {sorted.map((m) => (
        <span key={m} className="pill" data-testid="reminder-pill">
          {offsetLabel(m)}
          <button aria-label={`Remove ${offsetLabel(m)}`} disabled={disabled} onClick={() => onChange(offsets.filter((x) => x !== m))}>
            ×
          </button>
        </span>
      ))}
      {offsets.length < MAX_OFFSETS && (
        <select
          aria-label="Add a reminder"
          data-testid="reminder-add"
          value=""
          disabled={disabled}
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'none') onChange([]);
            else if (v === 'custom') setShowCustom(true);
            else if (v) add(Number(v));
          }}
        >
          <option value="">+ add reminder</option>
          {OFFSET_PRESETS.filter((p) => !offsets.includes(p.minutes)).map((p) => (
            <option key={p.minutes} value={p.minutes}>
              {p.label}
            </option>
          ))}
          <option value="custom">Custom…</option>
          {offsets.length > 0 && <option value="none">No reminder</option>}
        </select>
      )}
      {showCustom && (
        <span className="custom">
          <input type="number" min={0} aria-label="Custom amount" data-testid="custom-amount" value={customValue} onChange={(e) => setCustomValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCustom()} />
          <select aria-label="Unit" value={customUnit} onChange={(e) => setCustomUnit(e.target.value as 'min' | 'h' | 'd')}>
            <option value="min">min</option>
            <option value="h">hours</option>
            <option value="d">days</option>
          </select>
          <span className="muted">before</span>
          <button data-testid="custom-add" onClick={addCustom}>
            Add
          </button>
        </span>
      )}
    </div>
  );
}
