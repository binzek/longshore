// Gradient sky dome: a big sphere seen from inside, coloured per vertex (no texture, no shader).
// Colour at the horizon equals the fog colour, so the far sea melts into the sky without a seam.
import {
  BackSide,
  BufferAttribute,
  Color,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  Vector3,
} from 'three';
import { smoothstep } from './coastShape';
import { SKY } from './config';
import { PALETTE, SUN_LIGHT, color } from './palette';

export function createSky(): Mesh {
  const geometry = new SphereGeometry(SKY.radius, 64, 48);
  const position = geometry.getAttribute('position');
  const colors = new Float32Array(position.count * 3);

  const haze = color(PALETTE.haze);
  const top = color(PALETTE.sky);
  const sunColor = color(SUN_LIGHT);
  const sunDir = new Vector3(...SKY.sunDirection).normalize();
  const dir = new Vector3();
  const c = new Color();

  for (let i = 0; i < position.count; i++) {
    dir.fromBufferAttribute(position, i).normalize();

    // Height 0..1 above the horizon. The power keeps the haze band wide, like real evening air.
    const height = Math.max(dir.y, 0);
    c.copy(haze).lerp(top, Math.pow(height, 0.45));

    // Warm glow around the sun. It fades out at the horizon so it never clashes with the fog.
    const towardSun = Math.max(dir.dot(sunDir), 0);
    const glow = Math.pow(towardSun, 6) * smoothstep(0, 0.1, dir.y);
    c.lerp(sunColor, glow * 0.8);

    colors.set([c.r, c.g, c.b], i * 3);
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3));

  const material = new MeshBasicMaterial({
    vertexColors: true,
    side: BackSide,
    fog: false, // the sky is the thing the fog fades into
    depthWrite: false,
    dithering: true, // hides banding in the smooth gradient on 8-bit phone screens
  });

  const sky = new Mesh(geometry, material);
  sky.renderOrder = -1; // draw first, everything else paints over it
  sky.frustumCulled = false;
  return sky;
}
