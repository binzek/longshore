// The role panel: a glass sheet that fades in when a marker is tapped, listing the role's
// decisions for the act, each drawn by a reusable widget, with the role's private score at the
// bottom. It lives on <body>, outside #app, so dragging inside it never pans the coast.
import type { ChoiceStore } from '../game/choiceStore';
import { ROLES, actScore, decisionsForAct } from '../sim/roles';
import type { Decision, RoleId } from '../sim/roles';
import './rolePanel.css';
import { ROLE_TEXT } from './roleText';
import { createToggleSet } from './widgets/toggleSet';

/** M1 only has Act 1. */
const ACT = 1;

// Temporary: shown for a decision whose widget is not built yet (slider, split, cardDraft). Not
// in roles.en.json because it goes away in the next step.
const COMING_NEXT_STEP = 'This choice arrives in the next step.';

export interface RolePanel {
  /** Show this role's decisions (replacing another role's, if one is open). */
  open(id: RoleId): void;
  close(): void;
  /** The role whose panel is open, or null. */
  readonly current: RoleId | null;
}

// Static markup with no user input; the words are filled in with textContent below.
const SKELETON = `
  <header class="panel__head">
    <div class="panel__who">
      <h2 class="panel__title" id="panel-title"></h2>
      <p class="panel__blurb"></p>
    </div>
    <button class="panel__close" type="button" aria-label="Close">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></svg>
    </button>
  </header>
  <div class="panel__body"></div>
  <footer class="panel__foot">
    <span class="panel__score-name"></span>
    <output class="panel__score"></output>
  </footer>`;

export function createRolePanel(options: {
  store: ChoiceStore;
  /** Called after the panel closes, with the role it was showing. */
  onClose(id: RoleId): void;
}): RolePanel {
  const { store } = options;

  const panel = document.createElement('section');
  panel.className = 'panel glass';
  panel.tabIndex = -1; // focusable from code, so keyboard users land inside when it opens
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', 'panel-title');
  panel.innerHTML = SKELETON;
  document.body.append(panel);

  const find = <T extends HTMLElement>(selector: string): T => {
    const element = panel.querySelector<T>(selector);
    if (!element) throw new Error(`Missing ${selector} in the role panel`);
    return element;
  };
  const title = find('.panel__title');
  const blurb = find('.panel__blurb');
  const body = find('.panel__body');
  const scoreName = find('.panel__score-name');
  const score = find('.panel__score');

  let current: RoleId | null = null;

  function updateScore(): void {
    if (!current) return;
    const value = actScore(ROLES[current], ACT, store.forAct(current, ACT));
    score.textContent = String(Math.round(value));
  }

  function renderDecision(id: RoleId, decision: Decision): HTMLElement {
    const text = ROLE_TEXT[id].decisions[decision.id];
    const section = document.createElement('section');
    section.className = 'decision';

    const heading = document.createElement('h3');
    heading.className = 'decision__title';
    heading.textContent = text?.title ?? decision.id;

    const prompt = document.createElement('p');
    prompt.className = 'decision__prompt';
    prompt.textContent = text?.prompt ?? '';

    let widget: HTMLElement | null = null;
    if (decision.widget === 'toggleSet') {
      const choice = store.get(id, decision);
      if (choice.widget === 'toggleSet') {
        widget = createToggleSet({
          idPrefix: `${id}-${decision.id}`,
          decision,
          labels: text?.labels ?? {},
          choice,
          onChange: (answer) => store.set(id, decision, answer),
        });
      }
    }
    if (!widget) {
      widget = document.createElement('p');
      widget.className = 'decision__soon';
      widget.textContent = COMING_NEXT_STEP;
    }

    section.append(heading, prompt, widget);
    return section;
  }

  function render(id: RoleId): void {
    const text = ROLE_TEXT[id];
    title.textContent = text.label;
    blurb.textContent = text.blurb;
    scoreName.textContent = text.scoreName;
    // Replace everything: another role's widgets must not linger (or share radio group names).
    body.replaceChildren(...decisionsForAct(ROLES[id], ACT).map((d) => renderDecision(id, d)));
    body.scrollTop = 0;
    updateScore();
  }

  const close = () => {
    if (!current) return;
    const id = current;
    current = null;
    panel.classList.remove('is-open');
    options.onClose(id);
  };

  find('.panel__close').addEventListener('click', close);
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
  store.subscribe((role) => {
    if (role === current) updateScore();
  });

  return {
    open(id) {
      current = id;
      render(id);
      panel.classList.add('is-open');
      panel.focus({ preventScroll: true });
    },
    close,
    get current() {
      return current;
    },
  };
}
