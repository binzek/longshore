// Tunable scene numbers in one place. World units are roughly metres; +x runs along the coast.
// Camera framing is provisional until step 2 (coast layout) fixes where the shore sits.

export const CAMERA = {
  fov: 50, // vertical, degrees
  near: 0.5,
  far: 900,
  position: [0, 8, 30],
  target: [0, 2, -40],
} as const;

export const FOG = {
  near: 40,
  far: 170,
} as const;

export const SKY = {
  radius: 600, // inside CAMERA.far; the dome follows the camera so panning never reaches its edge
  sunDirection: [-0.4, 0.14, -1], // low over the sea, left of centre (the Malabar coast faces west)
} as const;

export const SEA = {
  size: 360, // square plane edge; much wider than the fog distance so no edge is ever visible
  segments: 120, // cell = size / segments = 3 units, so each wave facet is clearly visible
  behindCamera: 60, // how far the plane reaches behind the origin along +z
  waveHeight: 0.45,
  waveSpeed: 1,
  calmFactor: 0.4, // wave height and speed are scaled by this under prefers-reduced-motion
} as const;
