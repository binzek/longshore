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

/** A complete answer built from the defaults, for the bots, simulate() and tests. Players themselves start with nothing chosen. */
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
 * The total effect of everything a role chose in one act, for the sim and the bots. A decision with
 * no answer counts as its default so the result is always complete; players themselves start with
 * nothing chosen (see the answered* helpers below).
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

/**
 * The role's private score after an act's choices: its starting score plus this act's private
 * gains, kept between 0 and 100. (From M2, simulate() also applies the Act 2 exposure multiplier,
 * plan 2.6.)
 */
export function actScore(role: RoleConfig, act: Act, choices: readonly Choice[]): number {
  const gain = actEffect(role, act, choices).privateGain;
  return Math.min(100, Math.max(0, role.privateScoreStart + gain));
}

// ---- What the player has actually answered ----
// Players start with nothing chosen (no default is shown), so the panel works with half-finished
// answers. These helpers never fill a gap with a default: a toggle nobody touched simply has no
// entry. (The fill-with-default functions above stay for the bots and simulate(), which need a
// complete answer.)

/** The pieces of a decision a player answers one at a time: each toggle, or the whole widget. */
export function answerParts(decision: Decision): string[] {
  switch (decision.widget) {
    case 'toggleSet':
      return decision.toggles.map((t) => t.id);
    case 'slider':
      return ['value'];
    case 'split':
      return ['shares'];
    case 'cardDraft':
      return ['card'];
  }
}

/**
 * Keeps what is valid in a (possibly half-finished) answer and drops the rest, without adding
 * defaults. Returns undefined if nothing valid is left.
 */
export function sanitizeChoice(decision: Decision, choice: Choice | undefined): Choice | undefined {
  if (!choice || choice.decisionId !== decision.id || choice.widget !== decision.widget) {
    return undefined;
  }
  switch (decision.widget) {
    case 'toggleSet': {
      if (choice.widget !== 'toggleSet') return undefined;
      const picks: Record<string, string> = {};
      for (const toggle of decision.toggles) {
        const picked = choice.picks[toggle.id];
        if (picked !== undefined && toggle.options.some((o) => o.id === picked)) {
          picks[toggle.id] = picked;
        }
      }
      return Object.keys(picks).length > 0
        ? { decisionId: decision.id, widget: 'toggleSet', picks }
        : undefined;
    }
    case 'slider': {
      if (choice.widget !== 'slider' || !Number.isFinite(choice.value)) return undefined;
      const value = snap(choice.value, decision.min, decision.max, decision.step, decision.min);
      return { decisionId: decision.id, widget: 'slider', value };
    }
    case 'split': {
      if (choice.widget !== 'split') return undefined;
      const shares: Record<string, number> = {};
      let remaining = decision.budget;
      for (const part of decision.parts) {
        const share = Math.min(
          snap(choice.shares[part.id], 0, remaining, decision.step, 0),
          remaining,
        );
        shares[part.id] = share;
        remaining -= share;
      }
      return { decisionId: decision.id, widget: 'split', shares };
    }
    case 'cardDraft': {
      if (choice.widget !== 'cardDraft') return undefined;
      return decision.cards.some((c) => c.id === choice.card)
        ? { decisionId: decision.id, widget: 'cardDraft', card: choice.card }
        : undefined;
    }
  }
}

/** How many of a decision's parts the (sanitised) answer covers. */
function answeredCount(choice: Choice | undefined): number {
  if (!choice) return 0;
  return choice.widget === 'toggleSet' ? Object.keys(choice.picks).length : 1;
}

/** The effect of only what has been answered; anything not yet chosen adds nothing. */
export function answeredEffect(decision: Decision, choice: Choice | undefined): Effect {
  const clean = sanitizeChoice(decision, choice);
  if (!clean) return NO_EFFECT;
  if (decision.widget !== 'toggleSet' || clean.widget !== 'toggleSet') {
    return choiceEffect(decision, clean); // already complete and valid
  }
  let total = NO_EFFECT;
  for (const toggle of decision.toggles) {
    const option = toggle.options.find((o) => o.id === clean.picks[toggle.id]);
    if (option) total = addEffects(total, option.effect);
  }
  return total;
}

/** The role's private score from what has been answered so far, kept between 0 and 100. */
export function answeredScore(role: RoleConfig, act: Act, choices: readonly Choice[]): number {
  let gain = 0;
  for (const decision of role.decisions) {
    if (decision.act !== act) continue;
    const answer = choices.find((c) => c.decisionId === decision.id);
    gain += answeredEffect(decision, answer).privateGain;
  }
  return Math.min(100, Math.max(0, role.privateScoreStart + gain));
}

/** How many of the act's parts are answered, out of how many there are ("2 of 3 chosen"). */
export function actProgress(
  role: RoleConfig,
  act: Act,
  choices: readonly Choice[],
): { answered: number; total: number } {
  let answered = 0;
  let total = 0;
  for (const decision of role.decisions) {
    if (decision.act !== act) continue;
    total += answerParts(decision).length;
    const answer = sanitizeChoice(
      decision,
      choices.find((c) => c.decisionId === decision.id),
    );
    answered += answeredCount(answer);
  }
  return { answered, total };
}
