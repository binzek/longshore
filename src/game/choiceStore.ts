// What each role has chosen so far in the run. A plain store with no DOM in it: the panels write
// to it, the score reads from it, and later the bots and the lock-in flow use it too.
// Every answer is clamped on the way in, so the store can only ever hold valid choices.
import { ROLES, clampChoice, decisionsForAct } from '../sim/roles';
import type { Act, Choice, Decision, RoleId } from '../sim/roles';

export interface ChoiceStore {
  /** The answer for a decision: what was chosen, or its default if nothing has been chosen yet. */
  get(role: RoleId, decision: Decision): Choice;
  /** Remember an answer (after clamping it to what the decision allows). */
  set(role: RoleId, decision: Decision, choice: Choice): void;
  /** One answer (chosen or default) for each of the role's decisions in an act, in order. */
  forAct(role: RoleId, act: Act): Choice[];
  /** Call `listener` with the role whenever one of its answers changes. Returns an unsubscribe. */
  subscribe(listener: (role: RoleId) => void): () => void;
}

export function createChoiceStore(): ChoiceStore {
  const answers = new Map<string, Choice>();
  const listeners = new Set<(role: RoleId) => void>();
  const key = (role: RoleId, decisionId: string) => `${role}.${decisionId}`;

  const store: ChoiceStore = {
    get(role, decision) {
      return clampChoice(decision, answers.get(key(role, decision.id)));
    },
    set(role, decision, choice) {
      answers.set(key(role, decision.id), clampChoice(decision, choice));
      for (const listener of listeners) listener(role);
    },
    forAct(role, act) {
      return decisionsForAct(ROLES[role], act).map((decision) => store.get(role, decision));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return store;
}
