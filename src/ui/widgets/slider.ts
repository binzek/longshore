// The slider widget: one number picked from a range (for example how many saplings to plant).
// It starts "not set": the thumb waits at the low end, dimmed, and the choice only counts once the
// player touches it (drag, tap or keyboard), so there is no pre-filled answer to just accept.
import type { Choice, SliderDecision } from '../../sim/roles/types';
import './range.css';

type SliderChoice = Extract<Choice, { widget: 'slider' }>;

export function createSlider(options: {
  decision: SliderDecision;
  labels: Record<string, string>;
  /** What the player has answered so far, if anything. */
  choice: SliderChoice | undefined;
  onChange(choice: Choice): void;
}): HTMLElement {
  const { decision } = options;
  let isSet = options.choice !== undefined;
  let value = options.choice?.value ?? decision.min;

  const root = document.createElement('div');
  root.className = 'range';

  const head = document.createElement('div');
  head.className = 'range__head';
  const name = document.createElement('span');
  name.className = 'range__label';
  name.textContent = options.labels.value ?? decision.id;
  const shown = document.createElement('output');
  shown.className = 'range__value';
  head.append(name, shown);

  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(decision.min);
  input.max = String(decision.max);
  input.step = String(decision.step);
  input.setAttribute('aria-label', name.textContent);

  const render = () => {
    input.value = String(value);
    const share = (value - decision.min) / (decision.max - decision.min);
    input.style.setProperty('--fill', `${Math.round(share * 100)}%`);
    shown.textContent = isSet ? String(value) : '–'; // an en dash while not set
    input.setAttribute('aria-valuetext', isSet ? String(value) : 'not set');
    root.classList.toggle('is-unset', !isSet);
  };

  const commit = () => {
    isSet = true;
    render();
    options.onChange({ decisionId: decision.id, widget: 'slider', value });
  };

  input.addEventListener('input', () => {
    value = Number(input.value);
    commit();
  });
  // Pressing the thumb where it already sits (for example to choose the lowest value) fires no
  // "input" event, so a plain press and release also counts as choosing.
  input.addEventListener('pointerup', () => {
    if (!isSet) commit();
  });

  root.append(head, input);
  render();
  return root;
}
