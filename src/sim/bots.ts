// A bot plays a role the player did not touch. It is not clever: for each decision it draws a few
// random answers (from the seeded RNG, so a run can be replayed) and keeps the one that pays its own
// role best. That is exactly the pull the game is about: everyone chasing their own score.
import type { Rng } from './rng';
import { choiceEffect, clampChoice, decisionsForAct } from './roles';
import type { Act, Choice, Decision, RoleConfig } from './roles';

const TRIES = 4; // random answers drawn per decision; the best for the bot's own score wins

/** A random answer for one decision. Not yet cleaned: clampChoice snaps it to the allowed values. */
function randomAnswer(decision: Decision, rng: Rng): Choice {
  const decisionId = decision.id;
  switch (decision.widget) {
    case 'toggleSet': {
      const picks: Record<string, string> = {};
      for (const toggle of decision.toggles) {
        const option = toggle.options[Math.floor(rng() * toggle.options.length)];
        picks[toggle.id] = option?.id ?? toggle.default;
      }
      return { decisionId, widget: 'toggleSet', picks };
    }
    case 'slider': {
      const steps = Math.round((decision.max - decision.min) / decision.step);
      const value = decision.min + Math.floor(rng() * (steps + 1)) * decision.step;
      return { decisionId, widget: 'slider', value };
    }
    case 'split': {
      const shares: Record<string, number> = {};
      let remaining = decision.budget;
      for (const part of decision.parts) {
        const share = Math.floor(rng() * (remaining / decision.step + 1)) * decision.step;
        shares[part.id] = share;
        remaining -= share;
      }
      return { decisionId, widget: 'split', shares };
    }
    case 'cardDraft': {
      const card = decision.cards[Math.floor(rng() * decision.cards.length)];
      return { decisionId, widget: 'cardDraft', card: card?.id ?? decision.default };
    }
  }
}

/** A bot's complete answers for a role's decisions in an act. */
export function botAnswers(role: RoleConfig, act: Act, rng: Rng): Choice[] {
  return decisionsForAct(role, act).map((decision) => {
    let best = clampChoice(decision, randomAnswer(decision, rng));
    for (let i = 1; i < TRIES; i++) {
      const tryAnswer = clampChoice(decision, randomAnswer(decision, rng));
      if (
        choiceEffect(decision, tryAnswer).privateGain > choiceEffect(decision, best).privateGain
      ) {
        best = tryAnswer;
      }
    }
    return best;
  });
}
