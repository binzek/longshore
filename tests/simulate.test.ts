import { describe, expect, it } from 'vitest';
import { METER_IDS, ROLES, ROLE_IDS, decisionsForAct, defaultChoice } from '../src/sim/roles';
import type { Choice, RoleId } from '../src/sim/roles';
import { simulate } from '../src/sim/simulate';

/** Every role answered with its gentle defaults (a careful table of players). */
function allGentle(): Partial<Record<RoleId, Choice[]>> {
  return Object.fromEntries(
    ROLE_IDS.map((id) => [id, decisionsForAct(ROLES[id], 1).map(defaultChoice)]),
  );
}

describe('simulate', () => {
  it('gives the same result for the same seed and answers', () => {
    expect(simulate({ seed: 7, answers: {} })).toEqual(simulate({ seed: 7, answers: {} }));
  });

  it('plays every role with no answers as a bot, and keeps every number between 0 and 100', () => {
    for (const seed of [1, 2, 3, 99, 12345]) {
      const result = simulate({ seed, answers: {} });
      expect(result.roles.every((r) => r.bot)).toBe(true);
      for (const meter of METER_IDS) {
        expect(result.after[meter]).toBeGreaterThanOrEqual(0);
        expect(result.after[meter]).toBeLessThanOrEqual(100);
      }
      for (const role of result.roles) {
        expect(role.after).toBeGreaterThanOrEqual(0);
        expect(role.after).toBeLessThanOrEqual(100);
      }
    }
  });

  it('treats a role the player answered as the player, not a bot', () => {
    const answers = allGentle();
    const result = simulate({ seed: 5, answers: { fisher: answers.fisher ?? [] } });
    expect(result.roles.find((r) => r.id === 'fisher')?.bot).toBe(false);
    expect(result.roles.filter((r) => r.bot)).toHaveLength(4);
  });

  it('leaves the coast in a better state when everyone is careful than when bots chase their own score', () => {
    const careful = simulate({ seed: 11, answers: allGentle() });
    const selfish = simulate({ seed: 11, answers: {} });
    const average = (after: Record<string, number>) =>
      METER_IDS.reduce((sum, m) => sum + (after[m] ?? 0), 0) / METER_IDS.length;
    expect(average(careful.after)).toBeGreaterThan(average(selfish.after));
  });
});
