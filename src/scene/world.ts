// Builds the always-on 3D backdrop: renderer, camera, sky, sea, lights, and the render loop.
// It only draws. It never reads game state yet (later the sim's output will drive it).
import { Fog, PerspectiveCamera, Scene, Timer, WebGLRenderer } from 'three';
import { CAMERA, FOG } from './config';
import { createLights } from './lights';
import { PALETTE, color } from './palette';
import { createSea } from './sea';
import { createSky } from './sky';

export interface World {
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
  camera.position.set(...CAMERA.position);
  camera.lookAt(...CAMERA.target);

  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sky = createSky();
  const sea = createSea(calm);
  scene.add(sky, sea.mesh, createLights());

  const resize = () => {
    const { clientWidth: width, clientHeight: height } = container;
    renderer.setSize(width, height, false); // false: the canvas size is set by CSS
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  // Timer (not the deprecated Clock) pauses itself while the tab is hidden, so waves don't jump.
  const timer = new Timer();
  timer.connect(document);

  renderer.setAnimationLoop((time) => {
    timer.update(time);
    sea.update(timer.getElapsed(), camera.position.x);
    sky.position.copy(camera.position); // the dome travels with the camera: no visible edge
    renderer.render(scene, camera);
  });

  return {
    dispose() {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      timer.dispose();
      sea.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
