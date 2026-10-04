// Animated low-poly sea. One flat-shaded plane whose vertices are pushed up and down by a few
// sine waves in the vertex shader. Because the shader moves the vertices *before* Three.js works
// out each face's normal, every wave facet is lit as a separate flat triangle (the low-poly look)
// and the CPU does no per-vertex work.
import { Mesh, MeshLambertMaterial, PlaneGeometry } from 'three';
import { SEA } from './config';
import { PALETTE, color } from './palette';

export interface Sea {
  mesh: Mesh;
  /** Call every frame. `cameraX` lets the plane follow the camera as it pans along the coast. */
  update(elapsedSeconds: number, cameraX: number): void;
  dispose(): void;
}

export function createSea(calm: boolean): Sea {
  const cell = SEA.size / SEA.segments;
  const geometry = new PlaneGeometry(SEA.size, SEA.size, SEA.segments, SEA.segments);
  // Lay it flat in the geometry itself (not via mesh.rotation) so the shader's local +y is "up".
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, 0, -SEA.size / 2 + SEA.behindCamera);

  const factor = calm ? SEA.calmFactor : 1;
  const uTime = { value: 0 };
  const uHeight = { value: SEA.waveHeight * factor };

  const material = new MeshLambertMaterial({ color: color(PALETTE.sea), flatShading: true });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime;
    shader.uniforms.uHeight = uHeight;

    shader.vertexShader = injectAfter(
      shader.vertexShader,
      '#include <common>',
      `uniform float uTime;
       uniform float uHeight;
       varying float vCrest;`,
    );
    // Waves are a function of the vertex's world position, so they stay put when the plane
    // slides along with the camera. Three sines with different directions look like a swell.
    shader.vertexShader = injectAfter(
      shader.vertexShader,
      '#include <begin_vertex>',
      `vec3 seaWorld = (modelMatrix * vec4(position, 1.0)).xyz;
       float swell = sin(seaWorld.x * 0.35 + uTime * 0.9) * 0.5
                   + sin(seaWorld.z * 0.50 + uTime * 0.7) * 0.35
                   + sin((seaWorld.x + seaWorld.z) * 0.80 + uTime * 1.3) * 0.15;
       transformed.y += swell * uHeight;
       vCrest = swell;`,
    );

    shader.fragmentShader = injectAfter(
      shader.fragmentShader,
      '#include <common>',
      'varying float vCrest;',
    );
    // Crests a touch lighter, troughs a touch darker: depth without any texture.
    // Past the fog distance the sea is pure haze colour, identical to the sky dome behind it, so
    // skip those pixels. Far triangles are smaller than a pixel, and their flat-shading normal
    // can come out as NaN, which showed up as dark specks along the horizon.
    shader.fragmentShader = injectAfter(
      shader.fragmentShader,
      '#include <color_fragment>',
      `diffuseColor.rgb *= 0.9 + 0.2 * vCrest;
       #if defined( USE_FOG ) && !defined( FOG_EXP2 )
         if ( vFogDepth > fogFar ) discard;
       #endif`,
    );
  };

  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false; // the shader moves vertices, so the static bounding box is wrong

  return {
    mesh,
    update(elapsedSeconds, cameraX) {
      uTime.value = elapsedSeconds * SEA.waveSpeed * factor;
      // Snap to whole cells so the triangles never visibly slide under the waves.
      mesh.position.x = Math.round(cameraX / cell) * cell;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

/** Insert GLSL after a chunk include. Throws if the chunk is missing, so a Three.js upgrade that
 *  renames it fails loudly instead of silently rendering a flat sea. */
function injectAfter(source: string, token: string, code: string): string {
  if (!source.includes(token)) {
    throw new Error(`Sea shader: "${token}" not found in the Three.js shader`);
  }
  return source.replace(token, `${token}\n${code}`);
}
