// Turning a decision plus an answer into an Effect. Pure functions, used by the panel (live score),
// the bots (to rank options) and, from M2, simulate(). Every answer is clamped to what the decision
// allows, which is all the anti-cheat a jam needs (plan 5.1).
import { NO_EFFECT, addEffects, scaleEffect } from './effects';
import type { Act, Choice, Decision, Effect, RoleConfig } from './types';

/** Snap to the step grid and keep inside [min, max]. Anything that is not a number falls back. */
function snap(value: unknown, min: number, max: number, step: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  const snapped = min + Math.round((value - min) / step) * step;
  return Math.min(max, Math.max(min, snapped));
}

/** What is chosen if the player never touches the panel. */
export function defaultChoice(decision: Decision): Choice {
  const decisionId = decision.id;
  switch (decision.widget) {
    case 'toggleSet':
      return {
        decisionId,
        widget: 'toggleSet',
        picks: Object.fromEntries(decision.toggles.map((t) => [t.id, t.default])),
      };
    case 'slider':
      return { decisionId, widget: 'slider', value: decision.default };
    case 'split':
      return {
        decisionId,
        widget: 'split',
        shares: Object.fromEntries(decision.parts.map((p) => [p.id, p.default])),
      };
    case 'cardDraft':
      return { decisionId, widget: 'cardDraft', card: decision.default };
  }
}

/**
 * Returns a valid choice for this decision. Missing or nonsense parts are replaced by the defaults,
 * numbers are snapped to their step and range, and a split never spends more than its budget.
 */
export function clampChoice(decision: Decision, choice: Choice | undefined): Choice {
  const fallback = defaultChoice(decision);
  if (!choice || choice.decisionId !== decision.id || choice.widget !== decision.widget) {
    return fallback;
  }

  switch (decision.widget) {
    case 'toggleSet': {
      if (choice.widget !== 'toggleSet' || fallback.widget !== 'toggleSet') return fallback;
      const picks: Record<string, string> = {};
      for (const toggle of decision.toggles) {
        const picked = choice.picks[toggle.id];
        const valid = toggle.options.some((o) => o.id === picked);
        picks[toggle.id] = valid && picked !== undefined ? picked : toggle.default;
      }
      return { decisionId: decision.id, widget: 'toggleSet', picks };
    }
    case 'slider': {
      if (choice.widget !== 'slider') return fallback;
      const value = snap(choice.value, decision.min, decision.max, decision.step, decision.default);
      return { decisionId: decision.id, widget: 'slider', value };
    }
    case 'split': {
      if (choice.widget !== 'split') return fallback;
      const shares: Record<string, number> = {};
      let remaining = decision.budget;
      // Lines are filled in order; a line that would overspend gets only what is left.
      for (const part of decision.parts) {
        const share = snap(choice.shares[part.id], 0, remaining, decision.step, part.default);
        shares[part.id] = Math.min(share, remaining);
        remaining -= shares[part.id] ?? 0;
      }
      return { decisionId: decision.id, widget: 'split', shares };
    }
    case 'cardDraft': {
      if (choice.widget !== 'cardDraft') return fallback;
      const valid = decision.cards.some((c) => c.id === choice.card);
      return {
        decisionId: decision.id,
        widget: 'cardDraft',
        card: valid ? choice.card : decision.default,
      };
    }
  }
}

/** The total effect of one answer. An invalid answer is clamped first, so this never throws. */
export function choiceEffect(decision: Decision, choice: Choice | undefined): Effect {
  const valid = clampChoice(decision, choice);

  switch (decision.widget) {
    case 'toggleSet': {
      if (valid.widget !== 'toggleSet') return NO_EFFECT;
      let total = NO_EFFECT;
      for (const toggle of decision.toggles) {
        const option = toggle.options.find((o) => o.id === valid.picks[toggle.id]);
        if (option) total = addEffects(total, option.effect);
      }
      return total;
    }
    case 'slider': {
      if (valid.widget !== 'slider') return NO_EFFECT;
      const share = (valid.value - decision.min) / (decision.max - decision.min);
      return scaleEffect(decision.effectAtMax, share);
    }
    case 'split': {
      if (valid.widget !== 'split') return NO_EFFECT;
      let total = NO_EFFECT;
      let spent = 0;
      for (const part of decision.parts) {
        const amount = valid.shares[part.id] ?? 0;
        spent += amount;
        total = addEffects(total, scaleEffect(part.effectAtFullBudget, amount / decision.budget));
      }
      return addEffects(
        total,
        scaleEffect(decision.unspent, (decision.budget - spent) / decision.budget),
      );
    }
    case 'cardDraft': {
      if (valid.widget !== 'cardDraft') return NO_EFFECT;
      return decision.cards.find((c) => c.id === valid.card)?.effect ?? NO_EFFECT;
    }
  }
}

/**
 * The total effect of everything a role chose in one act. A decision with no answer counts as its
 * default, so the timer running out locks in something sensible.
 */
export function actEffect(role: RoleConfig, act: Act, choices: readonly Choice[]): Effect {
  let total = NO_EFFECT;
  for (const decision of role.decisions) {
    if (decision.act !== act) continue;
    const answer = choices.find((c) => c.decisionId === decision.id);
    total = addEffects(total, choiceEffect(decision, answer));
  }
  return total;
}
