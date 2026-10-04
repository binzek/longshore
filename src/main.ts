// Baseline smoke test only. M0 replaces this with the title screen and the 3D coast.
// It proves the whole chain works on a real phone: hosting -> bundle -> Three.js -> WebGL.
import { REVISION, WebGLRenderer } from 'three';
import './style.css';

function webglStatus(): string {
  try {
    const canvas = document.createElement('canvas');
    const renderer = new WebGLRenderer({ canvas });
    const isWebGL2 = renderer.capabilities.isWebGL2;
    renderer.dispose();
    return isWebGL2 ? 'WebGL 2 ok' : 'WebGL 1 only';
  } catch {
    return 'WebGL unavailable';
  }
}

const status = document.querySelector<HTMLElement>('#status');
if (status) status.textContent = `three r${REVISION} · ${webglStatus()}`;
