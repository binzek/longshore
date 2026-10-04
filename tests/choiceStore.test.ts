import { describe, expect, it, vi } from 'vitest';
import { createChoiceStore } from '../src/game/choiceStore';
import { ROLES, actScore, defaultChoice, type Choice, type Decision } from '../src/sim/roles';

const menu = (): Decision => {
  const d = ROLES.shack.decisions[0];
  if (!d) throw new Error('shack has no decisions');
  return d;
};

describe('createChoiceStore', () => {
  it('gives the default until something is chosen', () => {
    const store = createChoiceStore();
    expect(store.get('shack', menu())).toEqual(defaultChoice(menu()));
  });

  it('remembers a choice, per role', () => {
    const store = createChoiceStore();
    const greedy: Choice = {
      decisionId: 'menu',
      widget: 'toggleSet',
      picks: { plates: 'single', fish: 'trucked', cooling: 'ac' },
    };
    store.set('shack', menu(), greedy);
    expect(store.get('shack', menu())).toEqual(greedy);
    const fisherHaul = ROLES.fisher.decisions[0];
    if (!fisherHaul) throw new Error('fisher has no decisions');
    expect(store.get('fisher', fisherHaul)).toEqual(defaultChoice(fisherHaul)); // untouched
  });

  it('clamps nonsense on the way in, so the store only holds valid choices', () => {
    const store = createChoiceStore();
    const junk: Choice = {
      decisionId: 'menu',
      widget: 'toggleSet',
      picks: { plates: 'gold', fish: 'trucked' },
    };
    store.set('shack', menu(), junk);
    expect(store.get('shack', menu())).toEqual({
      decisionId: 'menu',
      widget: 'toggleSet',
      picks: { plates: 'steel', fish: 'trucked', cooling: 'fans' }, // bad and missing -> defaults
    });
  });

  it('lists one answer per decision for an act, in order, mixing chosen and default', () => {
    const store = createChoiceStore();
    const fisher = ROLES.fisher;
    const [haul, ban, gear] = fisher.decisions;
    if (!haul || !ban || !gear) throw new Error('fisher should have three decisions');
    store.set('fisher', ban, {
      decisionId: 'ban',
      widget: 'toggleSet',
      picks: { window: 'skip' },
    });
    const answers = store.forAct('fisher', 1);
    expect(answers.map((a) => a.decisionId)).toEqual(['haul', 'ban', 'gear']);
    expect(answers[0]).toEqual(defaultChoice(haul));
    expect(answers[1]).toMatchObject({ picks: { window: 'skip' } });
    // The score the panel shows: start 40 + medium mesh 5 + skip the ban 6 + hand line 2.
    expect(actScore(fisher, 1, answers)).toBe(53);
  });

  it('tells subscribers which role changed, until they unsubscribe', () => {
    const store = createChoiceStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.set('shack', menu(), defaultChoice(menu()));
    expect(listener).toHaveBeenCalledWith('shack');
    unsubscribe();
    store.set('shack', menu(), defaultChoice(menu()));
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
