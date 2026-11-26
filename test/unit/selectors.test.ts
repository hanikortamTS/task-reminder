// US-003, US-004 — views, sorting, overdue (SR-007)
import { describe, expect, it } from 'vitest';
import { doneView, todayView, upcomingView, viewCounts } from '../../src/core/selectors';
import { local, mkTask } from './helpers';

const now = local(2026, 11, 26, 12, 0);
const iso = (d: Date) => d.toISOString();

describe('todayView', () => {
  it('shows overdue first, then today, sorted by deadline then priority', () => {
    const over = mkTask({ title: 'over', deadline: iso(local(2026, 11, 26, 10)) });
    const t17 = mkTask({ title: 't17', deadline: iso(local(2026, 11, 26, 17)) });
    const t17p = mkTask({ title: 't17p', deadline: iso(local(2026, 11, 26, 17)), priority: true });
    const t13 = mkTask({ title: 't13', deadline: iso(local(2026, 11, 26, 13)) });
    const tomorrow = mkTask({ deadline: iso(local(2026, 11, 27, 9)) });
    const done = mkTask({ deadline: iso(local(2026, 11, 26, 14)), status: 'done', completedAt: iso(now) });
    const v = todayView([t17, tomorrow, over, t17p, done, t13], now);
    expect(v.overdue.map((t) => t.title)).toEqual(['over']);
    expect(v.today.map((t) => t.title)).toEqual(['t13', 't17p', 't17']);
  });

  it('includes tasks overdue from previous days and removes them once completed', () => {
    const old = mkTask({ deadline: iso(local(2026, 11, 20, 9)) });
    expect(todayView([old], now).overdue).toHaveLength(1);
    expect(todayView([{ ...old, status: 'done', completedAt: iso(now) }], now).overdue).toHaveLength(0);
  });
});

describe('upcomingView', () => {
  it('groups into Tomorrow / This week / Later / No deadline and hides empty groups', () => {
    const ts = [
      mkTask({ title: 'later', deadline: iso(local(2026, 12, 20, 9)) }),
      mkTask({ title: 'none' }),
      mkTask({ title: 'tomorrow', deadline: iso(local(2026, 11, 27, 9)) }),
      mkTask({ title: 'week', deadline: iso(local(2026, 11, 30, 9)) }),
      mkTask({ title: 'today', deadline: iso(local(2026, 11, 26, 18)) }),
    ];
    const g = upcomingView(ts, now);
    expect(g.map((x) => [x.label, x.tasks.map((t) => t.title)])).toEqual([
      ['Tomorrow', ['tomorrow']],
      ['This week', ['week']],
      ['Later', ['later']],
      ['No deadline', ['none']],
    ]);
    expect(upcomingView([], now)).toEqual([]);
  });
});

describe('doneView and counts', () => {
  it('lists the last 30 days of completed tasks, newest first', () => {
    const a = mkTask({ title: 'a', status: 'done', completedAt: iso(local(2026, 11, 25, 9)) });
    const b = mkTask({ title: 'b', status: 'done', completedAt: iso(local(2026, 11, 26, 9)) });
    const old = mkTask({ title: 'old', status: 'done', completedAt: iso(local(2026, 10, 1, 9)) });
    expect(doneView([a, old, b], now).map((t) => t.title)).toEqual(['b', 'a']);
  });
  it('counts each view', () => {
    const ts = [mkTask({ deadline: iso(local(2026, 11, 26, 10)) }), mkTask({}), mkTask({ status: 'done', completedAt: iso(now) })];
    expect(viewCounts(ts, now)).toEqual({ today: 1, upcoming: 1, done: 1 });
  });
});
