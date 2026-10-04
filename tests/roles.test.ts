import { describe, expect, it } from 'vitest';
import roleText from '../src/data/roles.en.json';
import { ROLE_ANCHORS } from '../src/scene/layout';
import {
  METER_IDS,
  ROLES,
  ROLE_IDS,
  actEffect,
  actProgress,
  actScore,
  answeredEffect,
  capSplitShare,
  answeredScore,
  sanitizeChoice,
  choiceEffect,
  clampChoice,
  decisionsForAct,
  defaultChoice,
  labelKeys,
  stewardshipTotal,
  type Choice,
  type Decision,
  type Effect,
  type RoleConfig,
  type RoleId,
} from '../src/sim/roles';

const allDecisions = ROLE_IDS.flatMap((id) => ROLES[id].decisions.map((d) => ({ role: id, d })));

/** Every effect a decision can produce, as the sets of alternatives the player is choosing between. */
function alternatives(decision: Decision): Effect[][] {
  switch (decision.widget) {
    case 'toggleSet':
      return decision.toggles.map((t) => t.options.map((o) => o.effect));
    case 'slider':
      return [[{ privateGain: 0, stewardship: {} }, decision.effectAtMax]];
    case 'split':
      return [[...decision.parts.map((p) => p.effectAtFullBudget), decision.unspent]];
    case 'cardDraft':
      return [decision.cards.map((c) => c.effect)];
  }
}

function allEffects(decision: Decision): Effect[] {
  return alternatives(decision).flat();
}

describe('role data: ids', () => {
  it('has a config for exactly the five role ids, each filed under its own id', () => {
    expect(Object.keys(ROLES).sort()).toEqual([...ROLE_IDS].sort());
    for (const id of ROLE_IDS) expect(ROLES[id].id).toBe(id);
  });

  it('has a scene anchor for exactly the same roles (no missing, no duplicates)', () => {
    const anchorIds = ROLE_ANCHORS.map((a) => a.id);
    expect(new Set(anchorIds).size).toBe(anchorIds.length);
    expect([...anchorIds].sort()).toEqual([...ROLE_IDS].sort());
  });

  it('has unique ids inside every role and decision', () => {
    const unique = (ids: string[]) => new Set(ids).size === ids.length;
    for (const { role, d } of allDecisions) {
      const where = `${role}.${d.id}`;
      expect(unique(ROLES[role].decisions.map((x) => x.id)), where).toBe(true);
      if (d.widget === 'toggleSet') {
        expect(unique(d.toggles.map((t) => t.id)), where).toBe(true);
        for (const t of d.toggles) expect(unique(t.options.map((o) => o.id)), where).toBe(true);
      }
      if (d.widget === 'split') expect(unique(d.parts.map((p) => p.id)), where).toBe(true);
      if (d.widget === 'cardDraft') expect(unique(d.cards.map((c) => c.id)), where).toBe(true);
    }
  });

  it('gives every role something to decide in Act 1', () => {
    for (const id of ROLE_IDS) expect(decisionsForAct(ROLES[id], 1).length).toBeGreaterThan(0);
  });
});

describe('role data: numbers', () => {
  it('keeps starting scores in 0 to 100 and exposure weights adding up to 1', () => {
    for (const id of ROLE_IDS) {
      const role = ROLES[id];
      expect(role.privateScoreStart).toBeGreaterThanOrEqual(0);
      expect(role.privateScoreStart).toBeLessThanOrEqual(100);
      const weights = Object.entries(role.exposure);
      expect(weights.length).toBeGreaterThan(0);
      for (const [meter] of weights) expect(METER_IDS as readonly string[]).toContain(meter);
      expect(weights.reduce((sum, [, w]) => sum + w, 0)).toBeCloseTo(1, 10);
    }
  });

  it('keeps every effect inside the allowed ranges and on real meters', () => {
    for (const { role, d } of allDecisions) {
      for (const effect of allEffects(d)) {
        const where = `${role}.${d.id}`;
        expect(effect.privateGain, where).toBeGreaterThanOrEqual(-10);
        expect(effect.privateGain, where).toBeLessThanOrEqual(15);
        for (const [meter, value] of Object.entries(effect.stewardship)) {
          expect(METER_IDS as readonly string[], where).toContain(meter);
          expect(value, where).toBeGreaterThanOrEqual(-1);
          expect(value, where).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('makes every option a real trade-off: none is beaten on both private gain and the coast', () => {
    // Pillar 3 (plan 1): the best personal move should cost the shared meters. An option that is
    // worse for you AND worse for the coast than another one is dead weight.
    const beats = (a: Effect, b: Effect) => {
      const gain = a.privateGain - b.privateGain;
      const coast = stewardshipTotal(a) - stewardshipTotal(b);
      return gain >= 0 && coast >= 0 && (gain > 0 || coast > 0);
    };
    for (const { role, d } of allDecisions) {
      for (const set of alternatives(d)) {
        set.forEach((candidate, i) => {
          const beaten = set.some((other, j) => i !== j && beats(other, candidate));
          expect(beaten, `${role}.${d.id} option ${i}`).toBe(false);
        });
      }
    }
  });
});

describe('role data: defaults', () => {
  it('has defaults that are valid answers, unchanged by clamping', () => {
    for (const { role, d } of allDecisions) {
      const choice = defaultChoice(d);
      expect(clampChoice(d, choice), `${role}.${d.id}`).toEqual(choice);
    }
  });

  it('uses defaults that point at real options', () => {
    for (const { d } of allDecisions) {
      if (d.widget === 'toggleSet') {
        for (const t of d.toggles) expect(t.options.map((o) => o.id)).toContain(t.default);
      }
      if (d.widget === 'cardDraft') expect(d.cards.map((c) => c.id)).toContain(d.default);
      if (d.widget === 'split') {
        const spent = d.parts.reduce((sum, p) => sum + p.default, 0);
        expect(spent).toBeLessThanOrEqual(d.budget);
      }
    }
  });
});

describe('role text (src/data/roles.en.json)', () => {
  const text: Record<string, (typeof roleText)[RoleId]> = roleText;

  it('covers exactly the five roles', () => {
    expect(Object.keys(text).sort()).toEqual([...ROLE_IDS].sort());
  });

  it('has a label for every id in the role data, and none left over', () => {
    for (const id of ROLE_IDS) {
      const entry = text[id];
      expect(entry, id).toBeDefined();
      if (!entry) continue;
      const decisions: Record<string, { title: string; prompt: string; labels: object }> =
        entry.decisions;
      expect(Object.keys(decisions).sort(), id).toEqual(
        ROLES[id].decisions.map((d) => d.id).sort(),
      );
      for (const d of ROLES[id].decisions) {
        expect(Object.keys(decisions[d.id]?.labels ?? {}).sort(), `${id}.${d.id}`).toEqual(
          labelKeys(d).sort(),
        );
      }
    }
  });

  it('has no empty strings and no digits (a real-world number needs a factId, plan 8.9)', () => {
    const visit = (value: unknown, path: string) => {
      if (typeof value === 'string') {
        expect(value.trim().length, path).toBeGreaterThan(0);
        expect(value, path).not.toMatch(/\d/);
      } else if (value && typeof value === 'object') {
        for (const [key, child] of Object.entries(value)) visit(child, `${path}.${key}`);
      }
    };
    visit(roleText, 'roles');
  });
});

describe('clampChoice', () => {
  const find = (role: RoleId, id: string): Decision => {
    const d = ROLES[role].decisions.find((x) => x.id === id);
    if (!d) throw new Error(`no decision ${role}.${id}`);
    return d;
  };

  it('falls back to the default for a missing, mismatched or wrong-kind answer', () => {
    const haul = find('fisher', 'haul');
    expect(clampChoice(haul, undefined)).toEqual(defaultChoice(haul));
    expect(clampChoice(haul, { ...defaultChoice(find('fisher', 'gear')) })).toEqual(
      defaultChoice(haul),
    );
    const sliderAnswer: Choice = { decisionId: 'haul', widget: 'slider', value: 3 };
    expect(clampChoice(haul, sliderAnswer)).toEqual(defaultChoice(haul));
  });

  it('replaces an unknown option or an unknown toggle with the default', () => {
    const haul = find('fisher', 'haul');
    const bad: Choice = {
      decisionId: 'haul',
      widget: 'toggleSet',
      picks: { mesh: 'giant', x: 'y' },
    };
    expect(clampChoice(haul, bad)).toEqual(defaultChoice(haul));
  });

  it('snaps a slider to its range and step, and ignores NaN', () => {
    const saplings = find('nursery', 'saplings');
    const answer = (value: number): Choice => ({ decisionId: 'saplings', widget: 'slider', value });
    const valueOf = (c: Choice) => (c.widget === 'slider' ? c.value : NaN);
    expect(valueOf(clampChoice(saplings, answer(99)))).toBe(8);
    expect(valueOf(clampChoice(saplings, answer(-5)))).toBe(0);
    expect(valueOf(clampChoice(saplings, answer(3.4)))).toBe(3);
    expect(valueOf(clampChoice(saplings, answer(Number.NaN)))).toBe(4);
  });

  it('never lets a split spend more than its budget', () => {
    const budget = find('household', 'budget');
    if (budget.widget !== 'split') throw new Error('household.budget should be a split');
    const greedy: Choice = {
      decisionId: 'budget',
      widget: 'split',
      shares: { food: 9, water: 9, transport: 9, cooling: 9 },
    };
    const result = clampChoice(budget, greedy);
    if (result.widget !== 'split') throw new Error('expected a split answer');
    const spent = Object.values(result.shares).reduce((sum, n) => sum + n, 0);
    expect(spent).toBeLessThanOrEqual(budget.budget);
    expect(result.shares).toEqual({ food: 9, water: 1, transport: 0, cooling: 0 });
  });
});

describe('choiceEffect and actEffect', () => {
  it('reads a toggle answer straight from the option', () => {
    const haul = ROLES.fisher.decisions[0];
    if (!haul) throw new Error('fisher has no decisions');
    const small: Choice = { decisionId: 'haul', widget: 'toggleSet', picks: { mesh: 'small' } };
    expect(choiceEffect(haul, small)).toEqual({ privateGain: 8, stewardship: { fishStock: -0.6 } });
  });

  it('scales a slider in a straight line from min to max', () => {
    const saplings = ROLES.nursery.decisions.find((d) => d.id === 'saplings');
    if (saplings?.widget !== 'slider') throw new Error('nursery.saplings should be a slider');
    const at = (value: number) =>
      choiceEffect(saplings, { decisionId: 'saplings', widget: 'slider', value });
    expect(at(0)).toEqual({ privateGain: 0, stewardship: {} });
    expect(at(8)).toEqual(saplings.effectAtMax);
    expect(at(4).privateGain).toBeCloseTo(saplings.effectAtMax.privateGain / 2, 10);
  });

  it('counts money left unspent in a split as savings', () => {
    const budget = ROLES.household.decisions[0];
    if (budget?.widget !== 'split') throw new Error('household.budget should be a split');
    const nothingSpent: Choice = {
      decisionId: 'budget',
      widget: 'split',
      shares: { food: 0, water: 0, transport: 0, cooling: 0 },
    };
    expect(choiceEffect(budget, nothingSpent)).toEqual(budget.unspent);
  });

  it('fills a missing answer with the default so the sim always gets a complete answer', () => {
    for (const id of ROLE_IDS) {
      const role = ROLES[id];
      const defaults = role.decisions.map(defaultChoice);
      expect(actEffect(role, 1, [])).toEqual(actEffect(role, 1, defaults));
    }
  });

  it('gives the same answer every time (pure)', () => {
    const role = ROLES.shack;
    const choices = role.decisions.map(defaultChoice);
    expect(actEffect(role, 1, choices)).toEqual(actEffect(role, 1, choices));
  });
});

describe('actScore', () => {
  it('is the starting score plus the act gains (shack: 40, then steel 2, local fish 2, fans 2)', () => {
    const shack = ROLES.shack;
    expect(actScore(shack, 1, [])).toBe(46); // nothing touched: the defaults
    const greedy: Choice = {
      decisionId: 'menu',
      widget: 'toggleSet',
      picks: { plates: 'single', fish: 'trucked', cooling: 'ac' },
    };
    expect(actScore(shack, 1, [greedy])).toBe(54); // 40 + 5 + 4 + 5
  });

  it('never goes below 0 or above 100', () => {
    const role = (start: number, gain: number): RoleConfig => ({
      id: 'fisher',
      privateScoreStart: start,
      exposure: { fishStock: 1 },
      decisions: [
        {
          id: 'only',
          act: 1,
          widget: 'cardDraft',
          default: 'x',
          cards: [{ id: 'x', effect: { privateGain: gain, stewardship: {} } }],
        },
      ],
    });
    expect(actScore(role(98, 5), 1, [])).toBe(100);
    expect(actScore(role(2, -6), 1, [])).toBe(0);
  });
});

describe('answered-only helpers (what a player has really chosen)', () => {
  const shack = ROLES.shack;
  const menu = shack.decisions[0];
  if (!menu) throw new Error('shack has no decisions');

  it('sanitizeChoice keeps valid parts, adds no defaults, and returns undefined when empty', () => {
    const half: Choice = { decisionId: 'menu', widget: 'toggleSet', picks: { fish: 'local' } };
    expect(sanitizeChoice(menu, half)).toEqual(half);
    const bad: Choice = { decisionId: 'menu', widget: 'toggleSet', picks: { fish: 'gold' } };
    expect(sanitizeChoice(menu, bad)).toBeUndefined();
    expect(sanitizeChoice(menu, undefined)).toBeUndefined();
  });

  it('answeredEffect counts only the picked toggles; the full effect fills the rest', () => {
    const half: Choice = { decisionId: 'menu', widget: 'toggleSet', picks: { cooling: 'ac' } };
    expect(answeredEffect(menu, half)).toEqual({ privateGain: 5, stewardship: { coolness: -0.5 } });
    expect(answeredEffect(menu, undefined)).toEqual({ privateGain: 0, stewardship: {} });
    expect(choiceEffect(menu, half).privateGain).toBe(5 + 2 + 2); // defaults fill plates and fish
  });

  it('answeredScore starts at the base score and grows only with answers', () => {
    expect(answeredScore(shack, 1, [])).toBe(40);
    const half: Choice = { decisionId: 'menu', widget: 'toggleSet', picks: { cooling: 'ac' } };
    expect(answeredScore(shack, 1, [half])).toBe(45);
  });

  it('actProgress counts toggles for a toggle set and decisions for the rest', () => {
    expect(actProgress(shack, 1, [])).toEqual({ answered: 0, total: 3 });
    const half: Choice = { decisionId: 'menu', widget: 'toggleSet', picks: { plates: 'steel' } };
    expect(actProgress(shack, 1, [half])).toEqual({ answered: 1, total: 3 });
    expect(actProgress(ROLES.household, 1, [])).toEqual({ answered: 0, total: 1 });
    expect(actProgress(ROLES.panchayat, 1, [])).toEqual({ answered: 0, total: 1 });
  });
});

describe('capSplitShare (a budget line while its slider is dragged)', () => {
  const budget = ROLES.household.decisions[0];
  if (budget?.widget !== 'split') throw new Error('household.budget should be a split');

  it('lets a line take what it asks for while there is room', () => {
    expect(capSplitShare(budget, { food: 0, water: 0, transport: 0, cooling: 0 }, 'food', 6)).toBe(
      6,
    );
  });

  it('never lets the total pass the budget', () => {
    const shares = { food: 4, water: 3, transport: 0, cooling: 0 }; // 7 of 10 spent elsewhere
    expect(capSplitShare(budget, shares, 'transport', 9)).toBe(3);
    expect(capSplitShare(budget, shares, 'food', 9)).toBe(7); // moving food: its own 4 is not "others"
  });

  it('stays at zero or above, and snaps to whole steps', () => {
    const full = { food: 5, water: 5, transport: 0, cooling: 0 };
    expect(capSplitShare(budget, full, 'cooling', 4)).toBe(0);
    expect(capSplitShare(budget, full, 'cooling', -3)).toBe(0);
    expect(
      capSplitShare(budget, { food: 0, water: 0, transport: 0, cooling: 0 }, 'water', 2.6),
    ).toBe(3);
  });
});
