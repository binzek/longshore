// The split widget: a budget shared across several lines (the household's monthly money). Every
// line has its own slider; what is left over is shown as savings. It starts "not set" with every
// line at zero (all savings), and counts as chosen once the player touches any line. A line can
// never be pushed past what is left of the budget.
import { capSplitShare } from '../../sim/roles/choices';
import type { Choice, SplitDecision } from '../../sim/roles/types';
import './range.css';

type SplitChoice = Extract<Choice, { widget: 'split' }>;

export function createSplit(options: {
  decision: SplitDecision;
  labels: Record<string, string>;
  /** What the player has answered so far, if anything. */
  choice: SplitChoice | undefined;
  onChange(choice: Choice): void;
}): HTMLElement {
  const { decision, labels } = options;
  let isSet = options.choice !== undefined;
  const shares: Record<string, number> = {};
  for (const part of decision.parts) shares[part.id] = options.choice?.shares[part.id] ?? 0;

  const root = document.createElement('div');
  root.className = 'range-group';

  const rows = decision.parts.map((part) => {
    const row = document.createElement('div');
    row.className = 'range';

    const head = document.createElement('div');
    head.className = 'range__head';
    const name = document.createElement('span');
    name.className = 'range__label';
    name.textContent = labels[part.id] ?? part.id;
    const shown = document.createElement('output');
    shown.className = 'range__value';
    head.append(name, shown);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = '0';
    input.max = String(decision.budget);
    input.step = String(decision.step);
    input.setAttribute('aria-label', name.textContent);

    row.append(head, input);
    root.append(row);
    return { part, row, input, shown };
  });

  // What is left over, shown as savings.
  const savings = document.createElement('div');
  savings.className = 'range__head range__savings';
  const savingsName = document.createElement('span');
  savingsName.className = 'range__label';
  savingsName.textContent = labels.unspent ?? 'unspent';
  const savingsValue = document.createElement('output');
  savingsValue.className = 'range__value';
  savings.append(savingsName, savingsValue);
  root.append(savings);

  const render = () => {
    let spent = 0;
    for (const { part, row, input, shown } of rows) {
      const share = shares[part.id] ?? 0;
      spent += share;
      input.value = String(share);
      input.style.setProperty('--fill', `${Math.round((share / decision.budget) * 100)}%`);
      input.setAttribute('aria-valuetext', isSet ? String(share) : 'not set');
      shown.textContent = isSet ? String(share) : '–';
      row.classList.toggle('is-unset', !isSet);
    }
    savingsValue.textContent = isSet ? String(decision.budget - spent) : '–';
    savings.classList.toggle('is-unset', !isSet);
  };

  const commit = () => {
    isSet = true;
    render();
    options.onChange({ decisionId: decision.id, widget: 'split', shares: { ...shares } });
  };

  for (const { part, input } of rows) {
    input.addEventListener('input', () => {
      shares[part.id] = capSplitShare(decision, shares, part.id, Number(input.value));
      commit();
    });
    input.addEventListener('pointerup', () => {
      if (!isSet) commit();
    });
  }

  render();
  return root;
}
