// The "feel" of panning along the coast, as plain maths (no DOM, no Three.js) so it can be tested.
// `pos` is the camera's raw position along the coast in metres, `vel` its speed in metres/second.
//   - While a finger is down, the position follows the finger (dragBy).
//   - After release it glides on and slows down (inertia), like a flicked page.
//   - Past either end it stretches a little (rubberBand) and a spring eases it back, so the ends
//     feel soft rather than like a wall.

export interface PanState {
  pos: number;
  vel: number;
}

export interface PanBounds {
  min: number;
  max: number;
}

const FRICTION = 3; // per second: higher = the glide stops sooner
const STIFFNESS = 60; // spring pulling back from past an end
const DAMPING = 2 * Math.sqrt(STIFFNESS); // critical damping: eases back without bouncing
const STRETCH = 6; // metres the view can visibly stretch past an end, at most
const MAX_OVERDRAG = 30; // raw metres past an end we remember, so the spring-back stays quick
export const MAX_SPEED = 60; // metres/second

/** Where to actually draw the camera: the raw position, squeezed softly if it is past an end. */
export function rubberBand(pos: number, { min, max }: PanBounds): number {
  if (pos < min) return min - STRETCH * (1 - Math.exp(-(min - pos) / STRETCH));
  if (pos > max) return max + STRETCH * (1 - Math.exp(-(pos - max) / STRETCH));
  return pos;
}

/** Move by `delta` metres while dragging. May go past an end (the rubber band hides most of it). */
export function dragBy(state: PanState, delta: number, { min, max }: PanBounds): void {
  state.pos = Math.min(Math.max(state.pos + delta, min - MAX_OVERDRAG), max + MAX_OVERDRAG);
}

/**
 * True once a press has moved far enough (screen pixels) to count as a drag, not a tap. Fingers
 * wobble a few pixels even when they mean to tap, so a tap on a marker must survive a little jitter.
 */
export function movedPastSlop(dx: number, dy: number, slop: number): boolean {
  return Math.hypot(dx, dy) > slop;
}

/** Add a push (mouse wheel). The glide takes it from there. */
export function nudge(state: PanState, impulse: number): void {
  state.vel = limitSpeed(state.vel + impulse);
}

export function limitSpeed(speed: number): number {
  return Math.min(Math.max(speed, -MAX_SPEED), MAX_SPEED);
}

/** Advance one frame after the finger is lifted: inertia inside the bounds, spring outside. */
export function stepFree(state: PanState, dt: number, { min, max }: PanBounds): void {
  if (state.pos < min || state.pos > max) {
    const end = state.pos < min ? min : max;
    state.vel += (-STIFFNESS * (state.pos - end) - DAMPING * state.vel) * dt;
    state.pos += state.vel * dt;
    if (Math.abs(state.pos - end) < 0.01 && Math.abs(state.vel) < 0.05) {
      state.pos = end; // close enough: stop creeping
      state.vel = 0;
    }
  } else {
    state.vel *= Math.exp(-FRICTION * dt);
    state.pos += state.vel * dt;
    if (Math.abs(state.vel) < 0.02) state.vel = 0;
  }
}
