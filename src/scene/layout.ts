// Where the five roles live along the coast. Data only for now: M1 puts a glass marker (and the
// small prop) on each anchor. Positions are given along the shore (x) and as metres inland from
// the waterline (d, negative = out at sea), so they follow the shore if its shape changes.
//
// The spots are 12 m apart and about the same distance from the camera: measured on a 390 x 844
// phone, that keeps a role in view for most of the pan (spots far apart, or at very different
// depths, left long stretches of bare coast). Left to right along the pan axis, plan section 6.1:
// mangrove estuary | houses behind the shore | beach shack | panchayat office by the jetty | boat
import type { RoleId } from '../sim/roles/types';
import { shoreZ, terrainHeight } from './coastShape';

export interface RoleAnchor {
  id: RoleId;
  x: number;
  d: number;
}

export const ROLE_ANCHORS: readonly RoleAnchor[] = [
  { id: 'nursery', x: -34, d: 3 }, // estuary edge, far left
  { id: 'household', x: -22, d: 9 }, // where the sand meets the grass behind the beach
  { id: 'shack', x: -10, d: 6 }, // on the sand
  { id: 'panchayat', x: 2, d: 8 }, // office near the jetty
  { id: 'fisher', x: 14, d: -12 }, // boat offshore, beside the jetty
];

/** World position of an anchor; boats float, so offshore anchors sit on the water surface. */
export function anchorPosition(anchor: RoleAnchor): { x: number; y: number; z: number } {
  const z = shoreZ(anchor.x) + anchor.d;
  return { x: anchor.x, y: Math.max(terrainHeight(anchor.x, z), 0), z };
}

/**
 * How far along the coast the camera may travel (step 3 uses this for the pan bounds). Worked out
 * so the nursery is centred at the left end and the panchayat and boat at the right end.
 */
export const PAN_RANGE = { min: -47, max: -8 } as const;
