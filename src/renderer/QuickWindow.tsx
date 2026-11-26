/** Ctrl+Alt+T quick-add box — UX-004, US-014. Enter saves and closes, Esc closes. */
import { useEffect, useRef, useState } from 'react';
import { QuickAdd } from './components/QuickAdd';
import { api, unwrap } from './api';
import { useNow } from './useNow';

export function QuickWindow() {
  const now = useNow();
  const ref = useRef<HTMLInputElement>(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    ref.current?.focus();
    const off = api().onQuickReset(() => {
      setKey((k) => k + 1);
      setTimeout(() => ref.current?.focus(), 0);
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') void api().quick.close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      off();
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div className="quick-window" data-testid="quick-window">
      <div className="quick-title">Add a task · Enter saves · Esc closes</div>
      <QuickAdd
        key={key}
        ref={ref}
        now={now}
        compact
        onAdd={async (input) => {
          await unwrap(api().tasks.create(input));
          await api().quick.close();
          setKey((k) => k + 1);
        }}
      />
    </div>
  );
}
