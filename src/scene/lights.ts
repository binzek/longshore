// Soft warm light, no shadows (shadow maps are costly on phones, and flat shading reads fine).
// A hemisphere light gives the cool sky / warm sand fill; one low sun adds the golden side light.
import { DirectionalLight, Group, HemisphereLight, Vector3 } from 'three';
import { SKY } from './config';
import { PALETTE, SUN_LIGHT, color } from './palette';

export function createLights(): Group {
  const group = new Group();

  group.add(new HemisphereLight(color(PALETTE.sky), color(PALETTE.sand), 3.2));

  const sun = new DirectionalLight(color(SUN_LIGHT), 2.6);
  // Same direction as the glow in the sky, so the light and the visible sun agree.
  sun.position.copy(new Vector3(...SKY.sunDirection).normalize().multiplyScalar(100));
  group.add(sun);

  return group;
}
