// All five roles in one place. Adding a role: add its id to ROLE_IDS, write its file, list it here,
// give it text in src/data/roles.en.json and a spot in src/scene/layout.ts (a test checks all four).
import { fisher } from './fisher';
import { household } from './household';
import { nursery } from './nursery';
import { panchayat } from './panchayat';
import { shack } from './shack';
import type { Act, Decision, RoleConfig, RoleId } from './types';

export const ROLES: Record<RoleId, RoleConfig> = { fisher, shack, household, nursery, panchayat };

export function decisionsForAct(role: RoleConfig, act: Act): Decision[] {
  return role.decisions.filter((d) => d.act === act);
}

export * from './choices';
export * from './effects';
export * from './labels';
export * from './types';
