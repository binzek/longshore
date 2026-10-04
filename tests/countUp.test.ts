import { describe, expect, it } from 'vitest';
import { countUpValue, easeOutCubic } from '../src/ui/countUp';

describe('easeOutCubic', () => {
  it('starts at 0, ends at 1, and never leaves that range', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(-3)).toBe(0);
    expect(easeOutCubic(7)).toBe(1);
  });

  it('slows down towards the end (most of the move happens early)', () => {
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
    expect(easeOutCubic(0.9) - easeOutCubic(0.8)).toBeLessThan(
      easeOutCubic(0.2) - easeOutCubic(0.1),
    );
  });
});

describe('countUpValue', () => {
  it('goes from the old number to the new one, up or down', () => {
    expect(countUpValue(40, 52, 0)).toBe(40);
    expect(countUpValue(40, 52, 1)).toBe(52);
    expect(countUpValue(52, 40, 1)).toBe(40);
    const mid = countUpValue(40, 52, 0.5);
    expect(mid).toBeGreaterThan(40);
    expect(mid).toBeLessThan(52);
  });
});
