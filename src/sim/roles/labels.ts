// Which text labels a decision needs, so src/data/roles.en.json can be checked against the role
// data (a test fails if a label is missing or left over). The UI looks labels up with the same keys.
import type { Decision } from './types';

/**
 * Label keys for one decision:
 * - toggleSet: each toggle id, and "<toggle>.<option>" for each option
 * - slider: "value"
 * - split: each part id, and "unspent"
 * - cardDraft: each card id
 */
export function labelKeys(decision: Decision): string[] {
  switch (decision.widget) {
    case 'toggleSet':
      return decision.toggles.flatMap((t) => [t.id, ...t.options.map((o) => `${t.id}.${o.id}`)]);
    case 'slider':
      return ['value'];
    case 'split':
      return [...decision.parts.map((p) => p.id), 'unspent'];
    case 'cardDraft':
      return decision.cards.map((c) => c.id);
  }
}
