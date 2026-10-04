import { describe, expect, it } from 'vitest';
import { createRng } from '../src/sim/rng';

describe('createRng (mulberry32)', () => {
  it('gives the same sequence for the same seed', () => {
    const a = createRng(2026);
    const b = createRng(2026);
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('gives different sequences for different seeds', () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(a()).not.toBe(b());
  });

  it('stays within [0, 1)', () => {
    const rng = createRng(42);
    for (let i = 0; i < 10_000; i++) {
      const n = rng();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });
});
