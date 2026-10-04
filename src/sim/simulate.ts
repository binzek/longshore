// The lean simulation (a first cut of plan 5): everyone's Act 1 choices add up into the four shared
// meters, then a storm tests the coast in 2050 and every role's private score pays for whatever the
// meters it depends on have become. Pure and seeded: the same seed and answers always give the same
// result. It must not import from scene, ui or net.
//
// ALL numbers here are placeholders [TUNE]. The meters are unitless 0-100 gauges in a simplified
// game, not measurements of anything real.
import { botAnswers } from './bots';
import { createRng } from './rng';
import { METER_IDS, ROLES, ROLE_IDS, actEffect, actScore } from './roles';
import type { Choice, MeterId, RoleId } from './roles';

export const SIM = {
  start: 70, // every meter begins here in 2026
  drift: 10, // what the coast loses by 2050 even if everyone is careful (pressure from outside)
  swing: 14, // meter points per 1.0 of total stewardship, summed over the five roles
  hardness: 1.3, // how much of a role's score a worst-case storm can take away
} as const;

export type Verdict = 'thriving' | 'holding' | 'fraying' | 'broken';

export interface SimInput {
  /** Same seed, same bots, same storm. */
  seed: number;
  /** What each role answered. A role with no answers at all is played by a bot. */
  answers: Partial<Record<RoleId, readonly Choice[]>>;
}

export interface RoleOutcome {
  id: RoleId;
  bot: boolean;
  /** Private score at the end of Act 1 (before the years pass). */
  before: number;
  /** Private score after 2050 and the storm. */
  after: number;
}

export interface SimResult {
  before: Record<MeterId, number>;
  after: Record<MeterId, number>;
  /** How hard the storm hit, 0.5 (a lighter one) to 1 (a bad one). */
  storm: number;
  /** How much of the storm got through the shore buffer, 0 to 100. */
  damage: number;
  verdict: Verdict;
  roles: RoleOutcome[];
}

const clamp = (value: number) => Math.min(100, Math.max(0, value));

export function simulate(input: SimInput): SimResult {
  const sums: Record<MeterId, number> = {
    shoreBuffer: 0,
    fishStock: 0,
    cleanCoast: 0,
    coolness: 0,
  };
  const act1: Record<string, { bot: boolean; score: number }> = {};

  ROLE_IDS.forEach((id, index) => {
    const role = ROLES[id];
    const given = input.answers[id] ?? [];
    const bot = given.length === 0;
    // Each bot has its own stream, so a bot's answers do not change when another role is edited.
    const choices = bot ? botAnswers(role, 1, createRng(input.seed + 7919 * (index + 1))) : given;
    const { stewardship } = actEffect(role, 1, choices);
    for (const meter of METER_IDS) sums[meter] += stewardship[meter] ?? 0;
    act1[id] = { bot, score: actScore(role, 1, choices) };
  });

  const before = Object.fromEntries(METER_IDS.map((m) => [m, SIM.start])) as Record<
    MeterId,
    number
  >;
  const after = Object.fromEntries(
    METER_IDS.map((m) => [m, Math.round(clamp(SIM.start + SIM.swing * sums[m] - SIM.drift))]),
  ) as Record<MeterId, number>;

  const storm = 0.5 + 0.5 * createRng(input.seed ^ 0x5eed)();
  const damage = Math.round(100 * storm * (1 - after.shoreBuffer / 100));

  const roles = ROLE_IDS.map((id): RoleOutcome => {
    const weights = ROLES[id].exposure;
    const total = METER_IDS.reduce((sum, m) => sum + (weights[m] ?? 0), 0);
    // How well the meters this role lives off held up: 0 (gone) to 1 (untouched).
    const health =
      total > 0
        ? METER_IDS.reduce((sum, m) => sum + (weights[m] ?? 0) * after[m], 0) / (total * 100)
        : 0.5;
    const entry = act1[id];
    const score = entry?.score ?? 0;
    return {
      id,
      bot: entry?.bot ?? true,
      before: Math.round(score),
      after: Math.round(clamp(score * (1 - SIM.hardness * storm * (1 - health)))),
    };
  });

  const average = METER_IDS.reduce((sum, m) => sum + after[m], 0) / METER_IDS.length;
  const verdict: Verdict =
    average >= 75 ? 'thriving' : average >= 55 ? 'holding' : average >= 35 ? 'fraying' : 'broken';

  return { before, after, storm, damage, verdict, roles };
}
