// Turns drag, swipe, mouse wheel and arrow keys into camera movement along the coast.
// The feel (glide, soft ends) is in pan.ts; this file only listens to the browser and places
// the camera each frame.
import { MathUtils, type PerspectiveCamera } from 'three';
import { placeCamera } from './camera';
import { CAMERA, PAN } from './config';
import { PAN_RANGE } from './layout';
import {
  dragBy,
  limitSpeed,
  movedPastSlop,
  nudge,
  rubberBand,
  stepFree,
  type PanState,
} from './pan';

export interface CameraRig {
  /** Call every frame with the seconds since the last frame. */
  update(dt: number): void;
  /** Where the camera is now, in metres along the coast. */
  readonly x: number;
  dispose(): void;
}

/**
 * `surface` is the element that receives the drags. Pass the whole scene container (not just the
 * canvas) so a press that starts on a glass marker still pans the coast.
 */
export function createCameraRig(
  camera: PerspectiveCamera,
  surface: HTMLElement,
  startX: number,
): CameraRig {
  const bounds = PAN_RANGE;
  const state: PanState = { pos: MathUtils.clamp(startX, bounds.min, bounds.max), vel: 0 };

  let dragging = false;
  let activePointer = -1;
  let lastClientX = 0;
  let lastTime = 0;
  let downX = 0;
  let downY = 0;
  let pastSlop = false; // false while the press could still turn out to be a tap
  let metresPerPixel = 0.1;
  const keysDown = new Set<string>();

  /** How many metres along the coast one pixel of drag should move, so the sand under the finger
   *  keeps up with it. Depends on screen width, lens and the angle the camera looks along. */
  function dragScale(): number {
    const halfWidth = Math.tan(MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
    const visibleMetres = 2 * PAN.focusDistance * halfWidth; // width of the view at that distance
    // Moving along the coast only slides the view sideways by cos(yaw) of the distance moved.
    return visibleMetres / (surface.clientWidth * Math.cos(MathUtils.degToRad(CAMERA.yawDeg)));
  }

  const onPointerDown = (event: PointerEvent) => {
    if (dragging) return; // a second finger does nothing
    dragging = true;
    activePointer = event.pointerId;
    lastClientX = event.clientX;
    lastTime = event.timeStamp;
    downX = event.clientX;
    downY = event.clientY;
    pastSlop = false;
    state.vel = 0;
    metresPerPixel = dragScale();
    // The pointer is NOT captured yet. Capturing swallows the click a marker is waiting for, so we
    // only capture once the press has clearly become a drag (see onPointerMove).
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!dragging || event.pointerId !== activePointer) return;
    if (!pastSlop && movedPastSlop(event.clientX - downX, event.clientY - downY, PAN.tapSlopPx)) {
      pastSlop = true;
      try {
        surface.setPointerCapture(event.pointerId); // keep getting moves if the finger leaves the screen
      } catch {
        // Not fatal: some synthetic or already-ended pointers cannot be captured.
      }
    }
    // Dragging the scene to the left reveals more coast to the right (+x), so the sign is flipped.
    const delta = -(event.clientX - lastClientX) * metresPerPixel;
    const seconds = Math.max((event.timeStamp - lastTime) / 1000, 0.001);
    dragBy(state, delta, bounds);
    state.vel = 0.7 * state.vel + 0.3 * (delta / seconds); // smoothed, becomes the glide speed
    lastClientX = event.clientX;
    lastTime = event.timeStamp;
  };

  const onPointerEnd = (event: PointerEvent) => {
    if (!dragging || event.pointerId !== activePointer) return;
    dragging = false;
    // A tap never glides. Held still before lifting? Then no glide either. Otherwise glide on at
    // the smoothed speed.
    state.vel = !pastSlop || event.timeStamp - lastTime > 80 ? 0 : limitSpeed(state.vel);
  };

  const onWheel = (event: WheelEvent) => {
    nudge(state, (event.deltaX + event.deltaY) * PAN.wheelPush);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') keysDown.add(event.key);
  };
  const onKeyUp = (event: KeyboardEvent) => {
    keysDown.delete(event.key);
  };

  // A drag starts on the scene but is followed on `window`, so its moves and its end are never
  // missed, even if the pointer slides over the sound button or out of the browser window.
  surface.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerEnd);
  window.addEventListener('pointercancel', onPointerEnd);
  surface.addEventListener('wheel', onWheel, { passive: true });
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  placeCamera(camera, state.pos);

  return {
    update(dt) {
      const step = Math.min(dt, 0.05); // a long pause (tab switch) must not fling the camera
      if (!dragging) {
        const direction =
          (keysDown.has('ArrowRight') ? 1 : 0) - (keysDown.has('ArrowLeft') ? 1 : 0);
        if (direction !== 0) {
          // Held key: steady movement, stopping hard at the ends (no stretch for the keyboard).
          state.vel = 0;
          state.pos = MathUtils.clamp(
            state.pos + direction * PAN.keySpeed * step,
            bounds.min,
            bounds.max,
          );
        } else {
          stepFree(state, step, bounds);
        }
      }
      placeCamera(camera, rubberBand(state.pos, bounds));
    },
    get x() {
      return camera.position.x;
    },
    dispose() {
      surface.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerEnd);
      window.removeEventListener('pointercancel', onPointerEnd);
      surface.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    },
  };
}
