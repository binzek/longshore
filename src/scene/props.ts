// Simple low-poly things standing on each role's spot: a boat, a beach shack, a house, a few
// mangrove saplings and a panchayat office, plus a short jetty. Flat-shaded primitives in the
// shared palette (mixes of the six colours are fine), no textures. They only decorate: the
// glass marker over each one is what the player taps.
import {
  BoxGeometry,
  Box3,
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshLambertMaterial,
  type Color,
} from 'three';
import type { RoleId } from '../sim/roles/types';
import { shoreZ, terrainHeight } from './coastShape';
import { ROLE_ANCHORS, anchorPosition } from './layout';
import { PALETTE, color } from './palette';

export interface Props {
  group: Group;
  /** How tall each role's prop stands above its spot, in metres (markers hover above this). */
  heights: Record<RoleId, number>;
  /** Call every frame with the elapsed seconds (the boat rocks a little). */
  update(elapsed: number): void;
  dispose(): void;
}

/** A mix of two palette colours, so props stay inside the same restrained set as the scene. */
const mix = (a: string, b: string, t: number): Color => color(a).lerp(color(b), t);

const COLOURS = {
  wall: color(PALETTE.haze),
  wood: mix(PALETTE.ink, PALETTE.sand, 0.55),
  thatch: mix(PALETTE.leaf, PALETTE.sand, 0.4),
  roof: mix(PALETTE.sea, PALETTE.haze, 0.2),
  hull: color(PALETTE.ink),
  sail: color(PALETTE.haze),
  leaf: color(PALETTE.leaf),
  flag: mix(PALETTE.sand, PALETTE.haze, 0.2),
};

export function createProps(calm: boolean): Props {
  const geometries: BufferGeometry[] = [];
  const materials = new Map<Color, MeshLambertMaterial>();

  const geo = <T extends BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const material = (colour: Color): MeshLambertMaterial => {
    let m = materials.get(colour);
    if (!m) {
      m = new MeshLambertMaterial({ color: colour, flatShading: true, side: DoubleSide });
      materials.set(colour, m);
    }
    return m;
  };
  /** A mesh placed relative to its group. */
  const part = (g: BufferGeometry, colour: Color, x: number, y: number, z: number): Mesh => {
    const mesh = new Mesh(geo(g), material(colour));
    mesh.position.set(x, y, z);
    return mesh;
  };
  /** A flat triangle (sails, flags), standing in the x-y plane. */
  const triangle = (w: number, h: number): BufferGeometry => {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute([0, 0, 0, w, 0, 0, 0, h, 0], 3));
    g.computeVertexNormals();
    return g;
  };

  const root = new Group();
  const groups = {} as Record<RoleId, Group>;
  const place = (id: RoleId): Group => {
    const anchor = ROLE_ANCHORS.find((a) => a.id === id);
    if (!anchor) throw new Error(`No anchor for ${id}`);
    const g = new Group();
    const { x, y, z } = anchorPosition(anchor);
    g.position.set(x, y, z);
    groups[id] = g;
    root.add(g);
    return g;
  };

  // Beach shack: four-sided thatched roof on a small box.
  const shack = place('shack');
  shack.add(part(new BoxGeometry(2.8, 1.7, 2.4), COLOURS.wall, 0, 0.85, 0));
  const thatch = part(new ConeGeometry(2.5, 2.1, 4), COLOURS.thatch, 0, 2.75, 0);
  thatch.rotation.y = Math.PI / 4;
  shack.add(thatch);

  // Household: a house with a gabled roof (a three-sided prism lying along x), and a smaller one beside it.
  const household = place('household');
  const house = (scale: number, dx: number, dz: number) => {
    const h = new Group();
    h.position.set(dx, 0, dz);
    h.scale.setScalar(scale);
    h.add(part(new BoxGeometry(4, 2.4, 3.2), COLOURS.wall, 0, 1.2, 0));
    const roof = part(new CylinderGeometry(2.3, 2.3, 4.4, 3), COLOURS.roof, 0, 3.05, 0);
    roof.rotation.z = Math.PI / 2;
    h.add(roof);
    h.add(part(new BoxGeometry(0.8, 1.4, 0.1), COLOURS.wood, 0.6, 0.7, 1.62));
    household.add(h);
  };
  house(0.85, 0, 0);
  house(0.6, 4.6, 1.5);

  // Nursery: a small cluster of young trees (a thin trunk and a faceted crown each).
  const nursery = place('nursery');
  const saplings: [number, number, number][] = [
    [0, 0, 1.9],
    [2.4, 0.8, 1.5],
    [-2.2, 1.2, 1.3],
    [1.1, -2.1, 1.1],
    [-1.4, -1.8, 1.7],
    [3.4, -1.4, 1.0],
    [-3.5, -0.4, 1.2],
  ];
  for (const [dx, dz, height] of saplings) {
    const y = terrainHeight(nursery.position.x + dx, nursery.position.z + dz) - nursery.position.y;
    nursery.add(
      part(new CylinderGeometry(0.08, 0.12, height, 5), COLOURS.wood, dx, y + height / 2, dz),
    );
    nursery.add(part(new IcosahedronGeometry(0.55, 0), COLOURS.leaf, dx, y + height + 0.25, dz));
  }

  // Panchayat office: a boxy building with a low pyramid roof and a flagpole.
  const panchayat = place('panchayat');
  panchayat.add(part(new BoxGeometry(5.4, 2.8, 3.6), COLOURS.wall, 0, 1.4, 0));
  const officeRoof = part(new ConeGeometry(4.6, 1.2, 4), COLOURS.roof, 0, 3.4, 0);
  officeRoof.rotation.y = Math.PI / 4;
  panchayat.add(officeRoof);
  panchayat.add(part(new CylinderGeometry(0.06, 0.06, 4, 5), COLOURS.wood, 2.9, 2, 1.2));
  panchayat.add(part(triangle(1.1, 0.7), COLOURS.flag, 2.9, 3.2, 1.2));

  // Fisher's boat: a tapered hull, a mast and a triangular sail. It floats and rocks gently.
  const fisher = place('fisher');
  const boat = new Group();
  const hull = part(new CylinderGeometry(0.95, 0.5, 4.4, 5), COLOURS.hull, 0, 0.1, 0);
  hull.rotation.z = Math.PI / 2;
  hull.scale.set(0.6, 1, 1);
  boat.add(hull);
  boat.add(part(new BoxGeometry(0.9, 0.7, 0.8), COLOURS.wood, -1.0, 0.65, 0));
  boat.add(part(new CylinderGeometry(0.06, 0.06, 3.4, 5), COLOURS.wood, 0.3, 1.7, 0));
  const sail = part(triangle(1.9, 2.8), COLOURS.sail, 0.35, 0.6, 0);
  boat.add(sail);
  boat.rotation.y = 0.5;
  fisher.add(boat);

  // A short jetty out to sea, between the office and the boat: a plank deck on thin posts.
  const jettyX = 8;
  const jetty = new Group();
  const shoreAtJetty = shoreZ(jettyX);
  const jettyStart = shoreAtJetty + 5; // on the sand
  const jettyEnd = shoreAtJetty - 12; // out in the water
  jetty.position.set(jettyX, 0, (jettyStart + jettyEnd) / 2);
  jetty.add(part(new BoxGeometry(1.8, 0.2, jettyStart - jettyEnd), COLOURS.wood, 0, 0.8, 0));
  for (let z = jettyEnd + 1; z <= jettyStart; z += 3) {
    jetty.add(
      part(new CylinderGeometry(0.12, 0.12, 3, 5), COLOURS.wood, 0.8, -0.6, z - jetty.position.z),
    );
    jetty.add(
      part(new CylinderGeometry(0.12, 0.12, 3, 5), COLOURS.wood, -0.8, -0.6, z - jetty.position.z),
    );
  }
  root.add(jetty);

  // Measure how tall each prop really is, so a marker can hover just above it.
  const heights = {} as Record<RoleId, number>;
  const box = new Box3();
  for (const [id, g] of Object.entries(groups) as [RoleId, Group][]) {
    root.updateMatrixWorld(true);
    heights[id] = box.setFromObject(g).max.y - g.position.y;
  }

  const boatBaseY = 0.15;
  return {
    group: root,
    heights,
    update(elapsed) {
      if (calm) return;
      boat.position.y = boatBaseY + Math.sin(elapsed * 0.9) * 0.08;
      boat.rotation.z = Math.sin(elapsed * 0.7) * 0.03;
    },
    dispose() {
      for (const g of geometries) g.dispose();
      for (const m of materials.values()) m.dispose();
    },
  };
}
