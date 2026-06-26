import {
  computeRating,
  computeUtilizationPercent,
  sumScheduledHours,
} from './technician-metrics';

describe('technician-metrics', () => {
  it('computes utilization from scheduled hours vs daily capacity', () => {
    expect(computeUtilizationPercent(0, 8)).toBe(0);
    expect(computeUtilizationPercent(4, 8)).toBe(50);
    expect(computeUtilizationPercent(8, 8)).toBe(100);
    expect(computeUtilizationPercent(10, 8)).toBe(100);
    expect(computeUtilizationPercent(2, 0)).toBe(0);
  });

  it('sums task duration and appointment slots for today', () => {
    expect(sumScheduledHours([2, null], 0)).toBe(3.5);
    expect(sumScheduledHours([], 1)).toBe(1.5);
    expect(sumScheduledHours([], 0)).toBe(0);
  });

  it('computes rating heuristic capped at 5', () => {
    expect(computeRating(0)).toBe(4.6);
    expect(computeRating(200)).toBe(5);
  });
});
