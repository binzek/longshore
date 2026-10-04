// Animated low-poly sea, drawn as translucent water over the seabed so the sand shows through
// in the shallows and the water turns deeper teal further out.
//
// Each facet's colour and see-through-ness are baked from the water depth (grid.ts). The waves are
// a few sines in the vertex shader. Because the shader moves the vertices *before* Three.js works
// out each face's normal, every wave facet is lit as a flat triangle (the low-poly look) and the
// CPU does no per-vertex work. A soft foam line breathes in and out along the waterline.
import { Color, Mesh, MeshLambertMaterial } from 'three';
import { GRID, SEA } from './config';
import { smoothstep, terrainHeight } from './coastShape';
import { axis, buildFacetedGrid, hash } from './grid';
import { PALETTE, color } from './palette';

export interface Sea {
  mesh: Mesh;
  /** Call every frame with the elapsed time in seconds. */
  update(elapsedSeconds: number): void;
  dispose(): void;
}

export function createSea(calm: boolean): Sea {
  const deep = color(PALETTE.sea);
  // Clear aqua shallows (a derived tone, not a 7th palette colour) laid over the sandy seabed.
  const shallow = deep.clone().lerp(new Color('#bfe8e0'), 0.5);
  const foamColor = color(PALETTE.haze).lerp(new Color(1, 1, 1), 0.6);

  const geometry = buildFacetedGrid({
    xs: axis(GRID.x),
    zs: axis(GRID.seaZ),
    jitter: GRID.jitter,
    vertexY: () => 0, // flat; the shader makes the waves
    // Water depth at each vertex (sea level minus ground height). Negative means dry land.
    extra: { name: 'aDepth', value: (x, z) => -terrainHeight(x, z) },
    alpha: true,
    faceColor(a, b, c) {
      // Leave out facets that are well under dry land, they would never be seen.
      if (Math.max(a.extra, b.extra, c.extra) < -0.6) return null;

      const depth = (a.extra + b.extra + c.extra) / 3;
      const tone = shallow.clone().lerp(deep, smoothstep(0, 2.2, depth));
      tone.multiplyScalar(0.97 + hash(Math.round(a.x * 10), Math.round(a.z * 10), 3) * 0.06);
      const opacity = 0.35 + 0.6 * smoothstep(0, 1.8, depth); // shallow = see-through
      return [tone.r, tone.g, tone.b, opacity];
    },
  });

  const factor = calm ? SEA.calmFactor : 1;
  const uTime = { value: 0 };
  const uHeight = { value: SEA.waveHeight * factor };
  const uFoam = { value: foamColor };

  const material = new MeshLambertMaterial({
    vertexColors: true,
    flatShading: true,
    transparent: true,
    depthWrite: false, // one see-through layer; the seabed behind it must stay visible
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime;
    shader.uniforms.uHeight = uHeight;
    shader.uniforms.uFoam = uFoam;

    shader.vertexShader = injectAfter(
      shader.vertexShader,
      '#include <common>',
      `uniform float uTime;
       uniform float uHeight;
       attribute float aDepth;
       varying float vCrest;
       varying float vDepth;
       varying float vAlong;`,
    );
    // Waves are a function of the vertex's world position. Three sines with different directions
    // look like a swell. They shrink to a gentle lap in the shallows so the waterline stays tidy.
    shader.vertexShader = injectAfter(
      shader.vertexShader,
      '#include <begin_vertex>',
      `vec3 seaWorld = (modelMatrix * vec4(position, 1.0)).xyz;
       float swell = sin(seaWorld.x * 0.35 + uTime * 0.9) * 0.5
                   + sin(seaWorld.z * 0.50 + uTime * 0.7) * 0.35
                   + sin((seaWorld.x + seaWorld.z) * 0.80 + uTime * 1.3) * 0.15;
       transformed.y += swell * uHeight * (0.2 + 0.8 * smoothstep(0.0, 1.6, aDepth));
       vCrest = swell;
       vDepth = aDepth;
       vAlong = seaWorld.x;`,
    );

    shader.fragmentShader = injectAfter(
      shader.fragmentShader,
      '#include <common>',
      `uniform float uTime;
       uniform vec3 uFoam;
       varying float vCrest;
       varying float vDepth;
       varying float vAlong;`,
    );
    // Crests a touch lighter, troughs a touch darker. Then the foam: a pale band where the water is
    // shallower than a threshold that slowly breathes in and out along the shore.
    // Past the fog distance the sea is pure haze colour, identical to the sky dome behind it, so
    // skip those pixels. Far triangles are smaller than a pixel, and their flat-shading normal
    // can come out as NaN, which showed up as dark specks along the horizon.
    shader.fragmentShader = injectAfter(
      shader.fragmentShader,
      '#include <color_fragment>',
      `diffuseColor.rgb *= 0.92 + 0.16 * vCrest;
       float foamEdge = 0.2 + 0.1 * sin(uTime * 0.9 + vAlong * 0.3);
       float foam = 1.0 - smoothstep(foamEdge * 0.35, foamEdge, vDepth);
       diffuseColor.rgb = mix(diffuseColor.rgb, uFoam, foam * 0.85);
       diffuseColor.a = max(diffuseColor.a, foam * 0.9);
       #if defined( USE_FOG ) && !defined( FOG_EXP2 )
         if ( vFogDepth > fogFar ) discard;
       #endif`,
    );
  };

  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false; // the shader moves vertices, so the static bounding box is wrong

  return {
    mesh,
    update(elapsedSeconds) {
      uTime.value = elapsedSeconds * SEA.waveSpeed * factor;
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
