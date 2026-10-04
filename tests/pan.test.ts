import { describe, expect, it } from 'vitest';
import {
  MAX_SPEED,
  dragBy,
  limitSpeed,
  movedPastSlop,
  nudge,
  rubberBand,
  stepFree,
} from '../src/scene/pan';
import type { PanBounds, PanState } from '../src/scene/pan';

const bounds: PanBounds = { min: -100, max: 100 };

/** Run the free (hands-off) motion for `seconds`, in 60 fps frames. */
function glide(state: PanState, seconds: number): void {
  for (let i = 0; i < seconds * 60; i++) stepFree(state, 1 / 60, bounds);
}

describe('rubberBand', () => {
  it('leaves positions inside the bounds alone', () => {
    expect(rubberBand(0, bounds)).toBe(0);
    expect(rubberBand(100, bounds)).toBe(100);
    expect(rubberBand(-100, bounds)).toBe(-100);
  });

  it('stretches softly past an end and never far', () => {
    const shown = rubberBand(110, bounds);
    expect(shown).toBeGreaterThan(100);
    expect(shown).toBeLessThan(110); // squeezed
    expect(rubberBand(1000, bounds)).toBeLessThan(100 + 6.001); // hard limit on the stretch
    expect(rubberBand(-110, bounds)).toBeLessThan(-100);
  });
});

describe('dragBy', () => {
  it('follows the finger inside the bounds', () => {
    const state: PanState = { pos: 0, vel: 0 };
    dragBy(state, 12, bounds);
    expect(state.pos).toBe(12);
  });

  it('remembers only a limited distance past an end', () => {
    const state: PanState = { pos: 99, vel: 0 };
    dragBy(state, 10_000, bounds);
    expect(state.pos).toBe(130);
  });
});

describe('free motion after release', () => {
  it('glides on and slows to a stop inside the bounds', () => {
    const state: PanState = { pos: 0, vel: 20 };
    glide(state, 5);
    expect(state.vel).toBe(0);
    expect(state.pos).toBeGreaterThan(5); // it did travel (about vel / friction metres)
    expect(state.pos).toBeLessThan(8);
  });

  it('eases back to the end when released past it, without bouncing', () => {
    const state: PanState = { pos: 120, vel: 0 };
    let lowest = state.pos;
    for (let i = 0; i < 180; i++) {
      stepFree(state, 1 / 60, bounds);
      lowest = Math.min(lowest, state.pos);
    }
    expect(state.pos).toBe(100);
    expect(state.vel).toBe(0);
    expect(lowest).toBeGreaterThanOrEqual(99.99); // critical damping: never overshoots back
  });

  it('a hard flick into an end overshoots a little, then settles on the end', () => {
    const state: PanState = { pos: 95, vel: 60 };
    let furthest = state.pos;
    for (let i = 0; i < 300; i++) {
      stepFree(state, 1 / 60, bounds);
      furthest = Math.max(furthest, state.pos);
    }
    expect(furthest).toBeGreaterThan(100);
    expect(state.pos).toBe(100);
  });

  it('gives the same result at 30 fps and 60 fps (within a metre)', () => {
    const slow: PanState = { pos: 0, vel: 30 };
    const fast: PanState = { pos: 0, vel: 30 };
    for (let i = 0; i < 90; i++) stepFree(slow, 1 / 30, bounds);
    for (let i = 0; i < 180; i++) stepFree(fast, 1 / 60, bounds);
    expect(Math.abs(slow.pos - fast.pos)).toBeLessThan(1);
  });
});

describe('speed limits', () => {
  it('caps speed in both directions', () => {
    expect(limitSpeed(500)).toBe(MAX_SPEED);
    expect(limitSpeed(-500)).toBe(-MAX_SPEED);
    const state: PanState = { pos: 0, vel: 0 };
    nudge(state, 1000);
    expect(state.vel).toBe(MAX_SPEED);
  });
});

describe('movedPastSlop', () => {
  it('treats a little finger wobble as a tap and a real move as a drag', () => {
    expect(movedPastSlop(0, 0, 8)).toBe(false);
    expect(movedPastSlop(3, -4, 8)).toBe(false); // 5 px away
    expect(movedPastSlop(8, 0, 8)).toBe(false); // exactly the slop is still a tap
    expect(movedPastSlop(6, 6, 8)).toBe(true); // about 8.5 px diagonally
    expect(movedPastSlop(-20, 0, 8)).toBe(true);
  });
});
