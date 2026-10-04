// Builds the always-on 3D backdrop: renderer, camera, sky, ground, sea, lights, and the render loop.
// It only draws. It never reads game state yet (later the sim's output will drive it).
import { Fog, PerspectiveCamera, Scene, Timer, WebGLRenderer } from 'three';
import { createCameraRig } from './cameraRig';
import { CAMERA, FOG } from './config';
import { debugAnchorMarkers, debugExpose, debugStartX } from './debug';
import { createLights } from './lights';
import { PALETTE, color } from './palette';
import { createSea } from './sea';
import { createSky } from './sky';
import { createTerrain } from './terrain';

export interface World {
  /** Resolves once the first frame has been drawn (the loading bar waits for it). */
  firstFrame: Promise<void>;
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
  const rig = createCameraRig(camera, renderer.domElement, debugStartX() ?? CAMERA.startX);
  debugExpose({ rig });

  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sky = createSky();
  const terrain = createTerrain();
  const sea = createSea(calm);
  scene.add(sky, terrain.mesh, sea.mesh, createLights());

  const markers = debugAnchorMarkers();
  if (markers) scene.add(markers);

  const resize = () => {
    const { clientWidth: width, clientHeight: height } = container;
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

  renderer.setAnimationLoop((time) => {
    timer.update(time);
    rig.update(timer.getDelta());
    sea.update(timer.getElapsed());
    sky.position.copy(camera.position); // the dome travels with the camera: no visible edge
    renderer.render(scene, camera);
    markFirstFrame(); // does nothing after the first call
  });

  return {
    firstFrame,
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
