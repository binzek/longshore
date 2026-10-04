// The card-pick widget: choose one card from a hand (the panchayat's policy). Native radio inputs
// drawn as cards, so keyboard and screen readers work. Nothing is picked until the player picks.
import type { CardDraftDecision, Choice } from '../../sim/roles/types';
import './cardDraft.css';

type CardChoice = Extract<Choice, { widget: 'cardDraft' }>;

export function createCardDraft(options: {
  /** Makes the radio group's name unique on the page, e.g. "panchayat-policy". */
  idPrefix: string;
  decision: CardDraftDecision;
  labels: Record<string, string>;
  /** What the player has answered so far, if anything. */
  choice: CardChoice | undefined;
  onChange(choice: Choice): void;
}): HTMLElement {
  const { decision, labels } = options;

  const group = document.createElement('fieldset');
  group.className = 'cards';
  const legend = document.createElement('legend');
  legend.className = 'sr-only';
  legend.textContent = decision.id;
  group.append(legend);

  for (const card of decision.cards) {
    const label = document.createElement('label');
    label.className = 'card';

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = `${options.idPrefix}-card`;
    input.value = card.id;
    input.checked = options.choice?.card === card.id;
    input.addEventListener('change', () => {
      options.onChange({ decisionId: decision.id, widget: 'cardDraft', card: card.id });
    });

    const body = document.createElement('span');
    body.className = 'card__body';
    const title = document.createElement('span');
    title.className = 'card__title';
    title.textContent = labels[card.id] ?? card.id;
    const hint = document.createElement('span');
    hint.className = 'card__hint';
    hint.textContent = labels[`${card.id}.hint`] ?? '';
    body.append(title, hint);

    label.append(input, body);
    group.append(label);
  }
  return group;
}
