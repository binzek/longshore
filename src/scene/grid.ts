// Builds the "faceted grid" used for both the ground and the sea: a flat grid of quads, each split
// into two triangles that do NOT share vertices, with every triangle given one flat colour.
// That is what makes the low-poly look: you see individual facets instead of smooth shading.
import { BufferAttribute, BufferGeometry } from 'three';

export interface GridVertex {
  x: number;
  y: number;
  z: number;
  /** One extra number per vertex (the sea uses it for water depth). */
  extra: number;
}

export interface GridSpec {
  xs: number[]; // grid lines along x, increasing
  zs: number[]; // grid lines along z, increasing
  /** 0..~0.4: how far vertices wander from the grid, so facets look hand-made, not mechanical. */
  jitter: number;
  vertexY(x: number, z: number): number;
  extra?: { name: string; value(x: number, z: number): number };
  /** Face colour is linear [r, g, b], or [r, g, b, a] when `alpha` is true. */
  alpha?: boolean;
  /** Return null to leave a triangle out altogether. */
  faceColor(a: GridVertex, b: GridVertex, c: GridVertex): number[] | null;
}

/** Grid lines from a list of [from, to, step] runs, e.g. fine steps near the shore, coarse far away. */
export function axis(runs: readonly (readonly [number, number, number])[]): number[] {
  const out: number[] = [];
  for (const [from, to, step] of runs) {
    const count = Math.max(1, Math.round((to - from) / step));
    for (let i = 0; i < count; i++) out.push(from + ((to - from) * i) / count);
  }
  const last = runs[runs.length - 1];
  if (last) out.push(last[1]);
  return out;
}

export function buildFacetedGrid(spec: GridSpec): BufferGeometry {
  const { xs, zs } = spec;
  const nx = xs.length;
  const nz = zs.length;

  const vertices: GridVertex[] = [];
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      let x = xs[i] as number;
      let z = zs[j] as number;
      // Jitter by a fraction of the neighbouring gap. The outer edge stays straight.
      if (i > 0 && i < nx - 1) {
        const room = Math.min(x - line(xs, i - 1), line(xs, i + 1) - x);
        x += (hash(i, j, 1) - 0.5) * 2 * spec.jitter * room;
      }
      if (j > 0 && j < nz - 1) {
        const room = Math.min(z - line(zs, j - 1), line(zs, j + 1) - z);
        z += (hash(i, j, 2) - 0.5) * 2 * spec.jitter * room;
      }
      vertices.push({ x, y: spec.vertexY(x, z), z, extra: spec.extra?.value(x, z) ?? 0 });
    }
  }
  const at = (i: number, j: number) => vertices[j * nx + i] as GridVertex;

  const positions: number[] = [];
  const colors: number[] = [];
  const extras: number[] = [];
  const emit = (a: GridVertex, b: GridVertex, c: GridVertex) => {
    const color = spec.faceColor(a, b, c);
    if (!color) return;
    for (const p of [a, b, c]) {
      positions.push(p.x, p.y, p.z);
      colors.push(...color);
      extras.push(p.extra);
    }
  };

  for (let j = 0; j < nz - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const v00 = at(i, j);
      const v10 = at(i + 1, j);
      const v01 = at(i, j + 1);
      const v11 = at(i + 1, j + 1);
      // Alternate the diagonal so facets do not line up in rows. Both orders face upwards (+y).
      if ((i + j) % 2 === 0) {
        emit(v00, v01, v10);
        emit(v10, v01, v11);
      } else {
        emit(v00, v01, v11);
        emit(v00, v11, v10);
      }
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(colors), spec.alpha ? 4 : 3));
  if (spec.extra) {
    geometry.setAttribute(spec.extra.name, new BufferAttribute(new Float32Array(extras), 1));
  }
  geometry.computeVertexNormals(); // vertices are not shared, so every normal is flat per face
  return geometry;
}

function line(values: number[], index: number): number {
  return values[index] as number;
}

/** Deterministic pseudo-random number in 0..1 from two integers (same every run, no state). */
export function hash(i: number, j: number, seed: number): number {
  let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(seed, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
