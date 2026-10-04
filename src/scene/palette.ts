// The one restrained palette (plan section 7.2): 6 muted colours plus the sun light.
// The scene reads these directly; the UI reads them as CSS variables via applyPaletteToCss().
// Warm afternoon light for Act 1. Later acts will blend towards a harsher, hazier version.
import { Color } from 'three';

export const PALETTE = {
  haze: '#ecd3b0', // horizon sky and distance fog (they must match, or a seam shows)
  sky: '#7da3b4', // top of the sky
  sea: '#3d7a86',
  sand: '#dcc496',
  leaf: '#5d7c58',
  ink: '#1e2f36', // text and dark UI strokes
} as const;

// Light colour only, not part of the 6 painted colours.
export const SUN_LIGHT = '#ffd29a';

/** Colour for use in Three.js (converted to linear working space for us). */
export function color(hex: string): Color {
  return new Color(hex);
}

/** Expose the palette to CSS as --haze, --sky, ... so UI panels share the scene's colours. */
export function applyPaletteToCss(root: HTMLElement = document.documentElement): void {
  for (const [name, hex] of Object.entries(PALETTE)) {
    root.style.setProperty(`--${name}`, hex);
  }
}
