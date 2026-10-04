// The shape of the coast as plain maths (no Three.js), so the terrain, the sea's depth tint and the
// role anchors all agree on where the waterline is. +x runs along the coast, -z is out to sea.
// Sea level is y = 0. Everything below it is seabed, everything above it is beach and land.

/** z of the waterline at position x along the coast. The shore wiggles gently. */
export function shoreZ(x: number): number {
  return 4 * Math.sin(x / 35) + 1.5 * Math.sin(x / 13 + 1);
}

/** Ground height at (x, z). Negative = seabed, positive = beach, dunes, grass and hills. */
export function terrainHeight(x: number, z: number): number {
  const d = z - shoreZ(x); // metres inland from the waterline; negative = out at sea

  // Seabed: shelves down gently from the beach, then flattens out. Deepest is about 2.6 m.
  if (d < 0) return -2.6 * (1 - Math.exp(d / 22));

  const beach = 1.1 * (1 - Math.exp(-d / 11)); // rises to a low berm about 1 m high
  const dunes = 0.35 * smoothstep(6, 16, d) * wobble(x, z); // soft bumps behind the beach
  const hills = 0.04 * Math.pow(Math.max(d - 40, 0), 1.25); // low green hills far inland
  return beach + dunes + hills;
}

/** Smooth repeating bumpiness in -1..1 (a couple of sines; no random numbers needed). */
export function wobble(x: number, z: number): number {
  return Math.sin(x * 0.19 + z * 0.11) * 0.6 + Math.sin(x * 0.07 - z * 0.23 + 2) * 0.4;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
}
