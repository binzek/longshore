// What each role has chosen so far in the run. A plain store with no DOM in it: the panels write
// to it, the score reads from it, and later the bots and the lock-in flow use it too.
// It holds only what the player has actually answered (no defaults), and cleans every answer on
// the way in, so it can only ever hold valid choices.
import { ROLES, actProgress, answeredScore, decisionsForAct, sanitizeChoice } from '../sim/roles';
import type { Act, Choice, Decision, RoleId } from '../sim/roles';

export interface ChoiceStore {
  /** What the player has answered for a decision (maybe only part of it), or undefined if nothing. */
  get(role: RoleId, decision: Decision): Choice | undefined;
  /** Remember an answer, cleaned of anything invalid. An answer with nothing valid clears it. */
  set(role: RoleId, decision: Decision, choice: Choice): void;
  /** The answers given so far for a role's decisions in an act (decisions not touched are absent). */
  forAct(role: RoleId, act: Act): Choice[];
  /** How many parts (each toggle, slider, split or card pick) are answered, out of the total. */
  progress(role: RoleId, act: Act): { answered: number; total: number };
  /** Every part answered: the player may lock in. */
  isComplete(role: RoleId, act: Act): boolean;
  /** The role's private score from what has been answered so far. */
  score(role: RoleId, act: Act): number;
  /** Call `listener` with the role whenever one of its answers changes. Returns an unsubscribe. */
  subscribe(listener: (role: RoleId) => void): () => void;
}

export function createChoiceStore(): ChoiceStore {
  const answers = new Map<string, Choice>();
  const listeners = new Set<(role: RoleId) => void>();
  const key = (role: RoleId, decisionId: string) => `${role}.${decisionId}`;

  const store: ChoiceStore = {
    get(role, decision) {
      return answers.get(key(role, decision.id));
    },
    set(role, decision, choice) {
      const clean = sanitizeChoice(decision, choice);
      if (clean) answers.set(key(role, decision.id), clean);
      else answers.delete(key(role, decision.id));
      for (const listener of listeners) listener(role);
    },
    forAct(role, act) {
      return decisionsForAct(ROLES[role], act).flatMap((decision) => {
        const answer = store.get(role, decision);
        return answer ? [answer] : [];
      });
    },
    progress(role, act) {
      return actProgress(ROLES[role], act, store.forAct(role, act));
    },
    isComplete(role, act) {
      const { answered, total } = store.progress(role, act);
      return answered === total;
    },
    score(role, act) {
      return answeredScore(ROLES[role], act, store.forAct(role, act));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return store;
}
