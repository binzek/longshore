// Turns drag, swipe, mouse wheel and arrow keys into camera movement along the coast.
// The feel (glide, soft ends) is in pan.ts; this file only listens to the browser and places
// the camera each frame.
import { MathUtils, type PerspectiveCamera } from 'three';
import { placeCamera } from './camera';
import { CAMERA, PAN } from './config';
import { PAN_RANGE } from './layout';
import { dragBy, limitSpeed, nudge, rubberBand, stepFree, type PanState } from './pan';

export interface CameraRig {
  /** Call every frame with the seconds since the last frame. */
  update(dt: number): void;
  /** Where the camera is now, in metres along the coast. */
  readonly x: number;
  dispose(): void;
}

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
    state.vel = 0;
    metresPerPixel = dragScale();
    try {
      surface.setPointerCapture(event.pointerId); // keep getting moves if the finger leaves the canvas
    } catch {
      // Not fatal: some synthetic or already-ended pointers cannot be captured.
    }
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!dragging || event.pointerId !== activePointer) return;
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
    // Held still before lifting? Then no glide. Otherwise glide at the smoothed speed.
    state.vel = event.timeStamp - lastTime > 80 ? 0 : limitSpeed(state.vel);
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

  surface.addEventListener('pointerdown', onPointerDown);
  surface.addEventListener('pointermove', onPointerMove);
  surface.addEventListener('pointerup', onPointerEnd);
  surface.addEventListener('pointercancel', onPointerEnd);
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
      surface.removeEventListener('pointermove', onPointerMove);
      surface.removeEventListener('pointerup', onPointerEnd);
      surface.removeEventListener('pointercancel', onPointerEnd);
      surface.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    },
  };
}
