import { describe, expect, it } from 'vitest';
import { toScreen } from '../src/scene/project';

describe('toScreen', () => {
  it('maps the middle of the view to the middle of the container', () => {
    const p = toScreen(0, 0, 0.5, 400, 800, 40);
    expect(p).toEqual({ x: 200, y: 400, visible: true, inFront: true });
  });

  it('flips y: up in the view is towards the top of the screen', () => {
    expect(toScreen(-1, 1, 0.5, 400, 800, 40)).toMatchObject({ x: 0, y: 0 });
    expect(toScreen(1, -1, 0.5, 400, 800, 40)).toMatchObject({ x: 400, y: 800 });
  });

  it('hides anything behind the camera, even if it lands inside the screen', () => {
    const behind = toScreen(0, 0, 1.2, 400, 800, 40);
    expect(behind.visible).toBe(false);
    expect(behind.inFront).toBe(false);
  });

  it('keeps a marker just past an edge (its body is still partly in view) but not further', () => {
    const justOut = toScreen(1.05, 0, 0.5, 400, 800, 40); // 410 px: 10 px past the right edge
    expect(justOut.visible).toBe(true);
    const farOut = toScreen(1.5, 0, 0.5, 400, 800, 40); // 500 px: well past the margin
    expect(farOut.visible).toBe(false);
    expect(farOut.inFront).toBe(true); // hidden, but still tracked so its fade-out keeps moving
  });
});
