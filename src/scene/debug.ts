// Development-only helpers (they do nothing in the production build). They let us check that the
// five role anchors fit in the frame before real markers and props exist.
//   ?anchors      draws a coloured post on each role anchor
//   ?camx=30      starts the camera at x = 30 along the coast
import { CylinderGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import type { RoleId } from '../sim/roles/types';
import { ROLE_ANCHORS, anchorPosition } from './layout';

const MARKER_COLOURS: Record<RoleId, number> = {
  nursery: 0x2e9d4f, // green
  household: 0xf08a24, // orange
  shack: 0xd6342c, // red
  panchayat: 0x7b3fb5, // purple
  fisher: 0x1f6fe0, // blue
};

const params = import.meta.env.DEV ? new URLSearchParams(window.location.search) : null;

export function debugStartX(): number | null {
  const value = params?.get('camx');
  return value === null || value === undefined ? null : Number(value);
}

/** Puts objects on `window.__longshore` so we can inspect them from the browser console. */
export function debugExpose(objects: Record<string, unknown>): void {
  if (!import.meta.env.DEV) return;
  const existing = (window as { __longshore?: Record<string, unknown> }).__longshore;
  Object.assign(window, { __longshore: { ...existing, ...objects } });
}

export function debugAnchorMarkers(): Group | null {
  if (!params?.has('anchors')) return null;
  const group = new Group();
  for (const anchor of ROLE_ANCHORS) {
    const post = new Mesh(
      new CylinderGeometry(0.6, 0.6, 6, 8),
      new MeshBasicMaterial({ color: MARKER_COLOURS[anchor.id], fog: false }),
    );
    const { x, y, z } = anchorPosition(anchor);
    post.position.set(x, y + 3, z);
    group.add(post);
  }
  return group;
}
