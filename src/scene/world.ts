// Builds the always-on 3D backdrop: renderer, camera, sky, ground, sea, lights, and the render loop.
// It only draws. It never reads game state yet (later the sim's output will drive it).
import { Fog, PerspectiveCamera, Scene, Timer, Vector3, WebGLRenderer } from 'three';
import type { RoleId } from '../sim/roles/types';
import { createCameraRig } from './cameraRig';
import { CAMERA, FOG, MARKERS } from './config';
import { debugAnchorMarkers, debugExpose, debugStartX } from './debug';
import { ROLE_ANCHORS, anchorPosition } from './layout';
import { createLights } from './lights';
import { PALETTE, color } from './palette';
import { toScreen, type ScreenPoint } from './project';
import { createSea } from './sea';
import { createSky } from './sky';
import { createTerrain } from './terrain';

export interface World {
  /** Resolves once the first frame has been drawn (the loading bar waits for it). */
  firstFrame: Promise<void>;
  /** Where a role's marker belongs on screen right now (px from the container's top-left). */
  projectRole(id: RoleId): ScreenPoint;
  /** Run `listener` after every frame is drawn, so the HTML on top can follow the camera. */
  onFrame(listener: () => void): void;
  dispose(): void;
}

export function createWorld(container: HTMLElement): World {
  // Throws if WebGL is unavailable; main.ts catches it and shows a plain message.
  const renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  // Cap the pixel ratio: a 3x phone screen would draw 9 pixels per CSS pixel for little gain.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const scene = new Scene();
  scene.fog = new Fog(color(PALETTE.haze), FOG.near, FOG.far);

  const camera = new PerspectiveCamera(CAMERA.fov, 1, CAMERA.near, CAMERA.far);
  // The rig listens on the whole container, not just the canvas, so a drag that starts on a glass
  // marker (a sibling of the canvas) still pans.
  const rig = createCameraRig(camera, container, debugStartX() ?? CAMERA.startX);
  debugExpose({ rig });

  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sky = createSky();
  const terrain = createTerrain();
  const sea = createSea(calm);
  scene.add(sky, terrain.mesh, sea.mesh, createLights());

  const markers = debugAnchorMarkers();
  if (markers) scene.add(markers);

  let width = 1;
  let height = 1;
  const resize = () => {
    ({ clientWidth: width, clientHeight: height } = container);
    renderer.setSize(width, height, false); // false: the canvas size is set by CSS
    camera.aspect = width / height;
    camera.fov = camera.aspect < 1 ? CAMERA.fovPortrait : CAMERA.fov;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  // Timer (not the deprecated Clock) pauses itself while the tab is hidden, so waves don't jump.
  const timer = new Timer();
  timer.connect(document);

  let markFirstFrame: () => void = () => {};
  const firstFrame = new Promise<void>((resolve) => (markFirstFrame = resolve));

  // Where each marker hovers: its anchor spot, lifted a little. Worked out once.
  const markerSpots = new Map<RoleId, Vector3>(
    ROLE_ANCHORS.map((anchor) => {
      const { x, y, z } = anchorPosition(anchor);
      return [anchor.id, new Vector3(x, y + MARKERS.lift, z)];
    }),
  );
  const scratch = new Vector3();
  const projectRole = (id: RoleId): ScreenPoint => {
    const spot = markerSpots.get(id);
    if (!spot) return { x: 0, y: 0, visible: false };
    // project() uses the camera's matrices, which render() refreshes: so call this after render().
    scratch.copy(spot).project(camera);
    return toScreen(scratch.x, scratch.y, scratch.z, width, height, MARKERS.edgeMargin);
  };

  const frameListeners: (() => void)[] = [];

  renderer.setAnimationLoop((time) => {
    timer.update(time);
    rig.update(timer.getDelta());
    sea.update(timer.getElapsed());
    sky.position.copy(camera.position); // the dome travels with the camera: no visible edge
    renderer.render(scene, camera);
    for (const listener of frameListeners) listener();
    markFirstFrame(); // does nothing after the first call
  });

  return {
    firstFrame,
    projectRole,
    onFrame(listener) {
      frameListeners.push(listener);
    },
    dispose() {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      rig.dispose();
      timer.dispose();
      terrain.dispose();
      sea.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
