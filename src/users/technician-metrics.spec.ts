import {
  computeRating,
  computeUtilizationPercent,
} from './technician-metrics';

describe('technician-metrics', () => {
  it('computes utilization from workload hours', () => {
    expect(computeUtilizationPercent(4)).toBe(50);
    expect(computeUtilizationPercent(8)).toBe(100);
  });

  it('computes rating heuristic capped at 5', () => {
    expect(computeRating(0)).toBe(4.6);
    expect(computeRating(200)).toBe(5);
  });
});
