import { describe, expect, it, vi } from 'vitest';
import { createChoiceStore } from '../src/game/choiceStore';
import { ROLES, type Choice, type Decision } from '../src/sim/roles';

const shackMenu = (): Decision => {
  const d = ROLES.shack.decisions[0];
  if (!d) throw new Error('shack has no decisions');
  return d;
};

const plates = (option: string): Choice => ({
  decisionId: 'menu',
  widget: 'toggleSet',
  picks: { plates: option },
});

describe('createChoiceStore: players start with nothing chosen', () => {
  it('has no answers, a base score and 0 of 3 chosen for a fresh role', () => {
    const store = createChoiceStore();
    expect(store.get('shack', shackMenu())).toBeUndefined();
    expect(store.forAct('shack', 1)).toEqual([]);
    expect(store.score('shack', 1)).toBe(40); // the shack's starting score, nothing added
    expect(store.progress('shack', 1)).toEqual({ answered: 0, total: 3 });
    expect(store.isComplete('shack', 1)).toBe(false);
  });

  it('counts only the toggles actually picked, and only their effects', () => {
    const store = createChoiceStore();
    store.set('shack', shackMenu(), plates('single')); // single-use plates: +5 profit
    expect(store.progress('shack', 1)).toEqual({ answered: 1, total: 3 });
    expect(store.score('shack', 1)).toBe(45);
    expect(store.get('shack', shackMenu())).toEqual(plates('single')); // no defaults added
  });

  it('is complete, and scores in full, once every toggle is picked', () => {
    const store = createChoiceStore();
    store.set('shack', shackMenu(), {
      decisionId: 'menu',
      widget: 'toggleSet',
      picks: { plates: 'single', fish: 'trucked', cooling: 'ac' },
    });
    expect(store.isComplete('shack', 1)).toBe(true);
    expect(store.score('shack', 1)).toBe(54); // 40 + 5 + 4 + 5
  });

  it('counts each of the fisher\u2019s three decisions as one part', () => {
    const store = createChoiceStore();
    const [haul, ban] = ROLES.fisher.decisions;
    if (!haul || !ban) throw new Error('fisher should have decisions');
    expect(store.progress('fisher', 1)).toEqual({ answered: 0, total: 3 });
    store.set('fisher', ban, { decisionId: 'ban', widget: 'toggleSet', picks: { window: 'skip' } });
    expect(store.progress('fisher', 1)).toEqual({ answered: 1, total: 3 });
    expect(store.score('fisher', 1)).toBe(46); // 40 + 6 for skipping the ban
    expect(store.forAct('fisher', 1).map((a) => a.decisionId)).toEqual(['ban']);
  });

  it('drops invalid picks instead of storing them or filling defaults', () => {
    const store = createChoiceStore();
    store.set('shack', shackMenu(), {
      decisionId: 'menu',
      widget: 'toggleSet',
      picks: { plates: 'gold', fish: 'trucked', napkins: 'paper' },
    });
    expect(store.get('shack', shackMenu())).toEqual({
      decisionId: 'menu',
      widget: 'toggleSet',
      picks: { fish: 'trucked' }, // bad option and unknown toggle gone, nothing invented
    });
    store.set('shack', shackMenu(), plates('gold')); // nothing valid left: clears the answer
    expect(store.get('shack', shackMenu())).toBeUndefined();
  });

  it('keeps roles apart and tells subscribers which role changed, until they unsubscribe', () => {
    const store = createChoiceStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.set('shack', shackMenu(), plates('steel'));
    expect(listener).toHaveBeenCalledWith('shack');
    expect(store.progress('fisher', 1).answered).toBe(0);
    unsubscribe();
    store.set('shack', shackMenu(), plates('single'));
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
