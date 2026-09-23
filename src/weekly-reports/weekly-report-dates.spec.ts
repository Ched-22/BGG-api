import { DateTime } from 'luxon';
import { resolveWeekWindow } from './weekly-report-dates';

describe('resolveWeekWindow', () => {
  it('returns previous Mon–Sun week in Europe/Lisbon', () => {
    const reference = DateTime.fromISO('2026-06-08T08:00:00', { zone: 'Europe/Lisbon' });
    const window = resolveWeekWindow(undefined, reference);

    expect(window.weekStart).toBe('2026-06-01');
    expect(window.weekEnd).toBe('2026-06-07');
  });

  it('honours explicit weekStart', () => {
    const window = resolveWeekWindow('2026-05-26');

    expect(window.weekStart).toBe('2026-05-26');
    expect(window.weekEnd).toBe('2026-06-01');
  });
});
