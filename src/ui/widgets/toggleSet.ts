// The toggleSet widget: one or more either/or (or pick-one-of-three) switches. Each switch is a
// native radio group drawn as a row of buttons, so keyboard (Tab, arrow keys) and screen readers
// work without extra code. It only reports the answer through onChange; the caller stores it.
import type { Choice, ToggleSetDecision } from '../../sim/roles/types';
import './toggleSet.css';

type ToggleSetChoice = Extract<Choice, { widget: 'toggleSet' }>;

export function createToggleSet(options: {
  /** Makes each radio group's name unique on the page, e.g. "shack-menu". */
  idPrefix: string;
  decision: ToggleSetDecision;
  labels: Record<string, string>;
  /** What the player has answered so far, if anything. Nothing is pre-selected. */
  choice: ToggleSetChoice | undefined;
  onChange(choice: Choice): void;
}): HTMLElement {
  const { decision, labels } = options;
  const picks: Record<string, string> = { ...options.choice?.picks };
  const root = document.createElement('div');
  root.className = 'toggle-set';

  // With a single switch the decision's own prompt is the question, so its label is only for
  // screen readers. With several switches each needs a visible label.
  const showLabels = decision.toggles.length > 1;

  for (const toggle of decision.toggles) {
    const group = document.createElement('fieldset');
    group.className = 'toggle';

    const legend = document.createElement('legend');
    legend.className = showLabels ? 'toggle__label' : 'sr-only';
    legend.textContent = labels[toggle.id] ?? toggle.id;

    const row = document.createElement('div');
    row.className = 'toggle__options';

    for (const option of toggle.options) {
      const label = document.createElement('label');
      label.className = 'toggle__option';

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = `${options.idPrefix}-${toggle.id}`;
      input.value = option.id;
      input.checked = picks[toggle.id] === option.id;
      input.addEventListener('change', () => {
        picks[toggle.id] = option.id;
        options.onChange({ decisionId: decision.id, widget: 'toggleSet', picks: { ...picks } });
      });

      const text = document.createElement('span');
      text.textContent = labels[`${toggle.id}.${option.id}`] ?? option.id;

      label.append(input, text);
      row.append(label);
    }

    group.append(legend, row);
    root.append(group);
  }
  return root;
}
