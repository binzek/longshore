// A number that glides to its new value instead of jumping, for the private score. The glide is
// short and eases out (calm, no bounce). Under prefers-reduced-motion it just changes at once.

/** Slows down towards the end: 0 to 1 in, 0 to 1 out. */
export function easeOutCubic(t: number): number {
  const clamped = Math.min(Math.max(t, 0), 1);
  return 1 - Math.pow(1 - clamped, 3);
}

/** Where the number is `t` (0 to 1) of the way from `from` to `to`. */
export function countUpValue(from: number, to: number, t: number): number {
  return from + (to - from) * easeOutCubic(t);
}

export interface CountUp {
  /** Show `value`. Glides from what is on screen now, unless `animate` is false. */
  set(value: number, animate?: boolean): void;
}

export function createCountUp(
  element: HTMLElement,
  options: { calm: boolean; durationMs?: number },
): CountUp {
  const duration = options.durationMs ?? 450;
  let shown = Number.NaN; // what is on screen right now (can be fractional mid-glide)
  let frame = 0;

  const show = (value: number) => {
    shown = value;
    element.textContent = String(Math.round(value));
  };

  return {
    set(value, animate = true) {
      window.cancelAnimationFrame(frame);
      if (!animate || options.calm || Number.isNaN(shown) || Math.round(shown) === value) {
        show(value);
        return;
      }
      const from = shown;
      const start = performance.now();
      const step = (now: number) => {
        const t = (now - start) / duration;
        show(countUpValue(from, value, t));
        if (t < 1) frame = window.requestAnimationFrame(step);
        else show(value);
      };
      frame = window.requestAnimationFrame(step);
    },
  };
}
