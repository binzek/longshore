// Thin-line icons for the five roles, drawn on a 24 x 24 grid with strokes only (no fill), in the
// same style as the sound toggle. Static markup written here, never built from user input.
import type { RoleId } from '../sim/roles/types';

export const ROLE_ICONS: Record<RoleId, string> = {
  // A boat: hull, mast, sail.
  fisher: `<path d="M3 14.5h18l-2.6 4.5H5.6z" /><path d="M12 14V4.5" /><path d="M12 5.5l5.5 7.5H12" />`,
  // A beach parasol: canopy, pole, base.
  shack: `<path d="M4 11.5a8 6 0 0 1 16 0z" /><path d="M12 11.5V20" /><path d="M8.5 20h7" />`,
  // A house: roof, walls, door.
  household: `<path d="M3.5 11.5L12 4.5l8.5 7" /><path d="M6 10v9.5h12V10" /><path d="M10.5 19.5v-4.5h3v4.5" />`,
  // A sapling: two leaves on a stem, ground line.
  nursery: `<path d="M12 20v-8" /><path d="M12 12.5c-4 0-6-2.5-6-6.5 4 0 6 2.2 6 6.5z" /><path d="M12 14.5c3.5 0 5.5-2 5.5-5.5-3.5 0-5.5 1.8-5.5 5.5z" /><path d="M7 20h10" />`,
  // A civic building: pediment, columns, step.
  panchayat: `<path d="M4 10l8-5 8 5z" /><path d="M6.5 10.5v7M10 10.5v7M14 10.5v7M17.5 10.5v7" /><path d="M4 19.5h16" />`,
};
