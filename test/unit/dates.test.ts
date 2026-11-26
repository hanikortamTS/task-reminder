// US-001, US-004 — quick chips and relative labels (SR-001, SR-007)
import { describe, expect, it } from 'vitest';
import { deadlineLabel, formatDuration, formatWhen, fromLocalInput, quickChips, toLocalInput } from '../../src/core/dates';
import { local } from './helpers';

describe('quickChips', () => {
  it('offers Today 17:00, Tomorrow 9:00 and next Monday 9:00 in the morning', () => {
    const now = local(2026, 11, 26, 9, 30); // Thursday
    const [today, tomorrow, nextweek] = quickChips(now);
    expect(today.label).toBe('Today 17:00');
    expect(today.at).toEqual(local(2026, 11, 26, 17));
    expect(tomorrow.at).toEqual(local(2026, 11, 27, 9));
    expect(nextweek.at).toEqual(local(2026, 11, 30, 9));
  });

  it('turns "Today 17:00" into "In 1 hour" after 17:00, rounded to 5 minutes', () => {
    const [today] = quickChips(local(2026, 11, 26, 18, 2));
    expect(today.label).toBe('In 1 hour');
    expect(today.at).toEqual(local(2026, 11, 26, 19, 5));
  });

  it('picks the following Monday when today is Monday', () => {
    const [, , nextweek] = quickChips(local(2026, 11, 30, 8));
    expect(nextweek.at).toEqual(local(2026, 12, 7, 9));
  });
});

describe('labels', () => {
  const now = local(2026, 11, 26, 12, 0);
  it('formats durations', () => {
    expect(formatDuration(30_000)).toBe('1 min');
    expect(formatDuration(25 * 60_000)).toBe('25 min');
    expect(formatDuration(2 * 3_600_000)).toBe('2 h');
    expect(formatDuration(-3 * 86_400_000)).toBe('3 d');
  });
  it('says overdue by … with the original time', () => {
    const l = deadlineLabel(local(2026, 11, 26, 10, 0).toISOString(), now);
    expect(l).toEqual({ text: 'Overdue by 2 h · was due 10:00', overdue: true });
  });
  it('shows future deadlines relative to today', () => {
    expect(deadlineLabel(local(2026, 11, 26, 17).toISOString(), now).text).toBe('Due 17:00');
    expect(deadlineLabel(local(2026, 11, 27, 9).toISOString(), now).text).toBe('Due tomorrow 09:00');
    expect(formatWhen(local(2026, 11, 28, 9), now)).toBe('Sat 28 Nov 09:00');
  });
  it('handles no deadline', () => {
    expect(deadlineLabel(null, now)).toEqual({ text: 'No deadline', overdue: false });
  });
  it('round-trips datetime-local values', () => {
    const iso = local(2026, 11, 26, 17, 30).toISOString();
    expect(toLocalInput(iso)).toBe('2026-11-26T17:30');
    expect(fromLocalInput('2026-11-26T17:30')).toBe(iso);
    expect(fromLocalInput('')).toBeNull();
  });
});
