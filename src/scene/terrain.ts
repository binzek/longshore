// The ground: seabed, wet sand, dry sand, grass and low hills, as one flat-shaded low-poly mesh.
// Colours are per triangle (see grid.ts), picked from how high and how far inland each facet is.
import { type Color, Mesh, MeshLambertMaterial } from 'three';
import { GRID } from './config';
import { shoreZ, smoothstep, terrainHeight, wobble } from './coastShape';
import { axis, buildFacetedGrid } from './grid';
import { PALETTE, color } from './palette';

export interface Terrain {
  mesh: Mesh;
  dispose(): void;
}

export function createTerrain(): Terrain {
  const sand = color(PALETTE.sand);
  const leaf = color(PALETTE.leaf);
  // Derived tones, so the palette stays at 6 colours.
  const wetSand = sand.clone().lerp(color(PALETTE.sea), 0.3); // darker and cooler where it is damp
  const deepBed = color(PALETTE.sea).multiplyScalar(0.5);
  const darkLeaf = leaf.clone().multiplyScalar(0.7);

  const geometry = buildFacetedGrid({
    xs: axis(GRID.x),
    zs: axis(GRID.landZ),
    jitter: GRID.jitter,
    vertexY: terrainHeight,
    faceColor(a, b, c) {
      const x = (a.x + b.x + c.x) / 3;
      const z = (a.z + b.z + c.z) / 3;
      const height = (a.y + b.y + c.y) / 3;
      const inland = z - shoreZ(x); // metres from the waterline
      const speckle = faceNoise(x, z); // 0..1, different for every facet

      let tone: Color;
      if (height < 0) {
        // Under water: damp sand fading to a dark seabed as it gets deeper.
        // Starts as plain sand so the shallows look clean when the water tint is laid over it.
        tone = sand
          .clone()
          .multiplyScalar(0.92)
          .lerp(deepBed, smoothstep(0.2, 2.4, -height));
      } else {
        // Beach: damp at the waterline, drying out inland.
        tone = wetSand.clone().lerp(sand, smoothstep(0.3, 3.5, inland));
        // Grass takes over further inland. The noise makes the edge ragged, not a straight line.
        const grass = smoothstep(15, 27, inland + (speckle - 0.5) * 10 + wobble(x, z) * 4);
        tone.lerp(leaf, grass);
        tone.lerp(darkLeaf, smoothstep(2.5, 7, height)); // hills read darker and further away
      }
      tone.multiplyScalar(0.94 + speckle * 0.12); // slight brightness change per facet
      return [tone.r, tone.g, tone.b];
    },
  });

  const material = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
  return {
    mesh: new Mesh(geometry, material),
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

/** Repeatable pseudo-random 0..1 from a position, so the same facet always gets the same tone. */
function faceNoise(x: number, z: number): number {
  const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return s - Math.floor(s);
}
