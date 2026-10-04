// Tunable scene numbers in one place. World units are roughly metres; +x runs along the coast,
// -z is out to sea. The shape of the coast itself is in coastShape.ts.

// Camera stands on the beach, a little way inland, and looks out to sea at an angle, so the
// shoreline runs diagonally across the screen (sand in front, sea behind).
export const CAMERA = {
  fov: 50, // vertical, degrees (landscape and desktop)
  fovPortrait: 68, // wider on tall phone screens, so more of the coast fits across the narrow width
  near: 0.5,
  far: 900,
  height: 9, // metres above sea level
  inland: 24, // metres behind the waterline: far enough back that the beach fills the lower half
  yawDeg: 32, // 0 = straight out to sea; positive turns towards +x (along the coast)
  pitchDeg: -14, // negative looks down
  startX: -20, // where along the coast the game opens (the shack is near the middle of the view)
} as const;

export const FOG = {
  near: 80, // clear for the beach and nearby sea, then haze builds towards the horizon
  far: 230,
} as const;

export const SKY = {
  radius: 600, // inside CAMERA.far; the dome follows the camera so panning never reaches its edge
  sunDirection: [0.3, 0.13, -1], // low over the sea, left of centre (the Malabar coast faces west)
} as const;

// Grid lines as [from, to, step] runs: fine near the shoreline where detail shows, coarse far away.
export const GRID = {
  x: [
    [-200, -110, 10],
    [-110, 110, 2.2],
    [110, 200, 10],
  ],
  // Sea: from the horizon in to just past the beach (the land hides the rest).
  seaZ: [
    [-260, -180, 10],
    [-180, -100, 6],
    [-100, -45, 3.5],
    [-45, -14, 2.2],
    [-14, 26, 1.2],
    [26, 34, 4],
  ],
  // Land: out in the shallows, up the beach and back to the far hills.
  landZ: [
    [-50, -14, 3],
    [-14, 26, 1.2],
    [26, 60, 3],
    [60, 140, 8],
  ],
  jitter: 0.3,
} as const;

export const SEA = {
  waveHeight: 0.45,
  waveSpeed: 1,
  calmFactor: 0.4, // wave height and speed are scaled by this under prefers-reduced-motion
} as const;
