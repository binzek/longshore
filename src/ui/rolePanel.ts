// The role panel: a glass sheet that fades in when a marker is tapped, listing the role's
// decisions for the act, each drawn by a reusable widget, with the role's private score at the
// bottom. It lives on <body>, outside #app, so dragging inside it never pans the coast.
import type { Sfx, SfxName } from '../audio/sfx';
import uiText from '../data/ui.en.json';
import type { ChoiceStore } from '../game/choiceStore';
import { ROLES, decisionsForAct } from '../sim/roles';
import type { Choice, Decision, RoleId } from '../sim/roles';
import { createCountUp } from './countUp';
import './rolePanel.css';
import { ROLE_TEXT } from './roleText';
import { createCardDraft } from './widgets/cardDraft';
import { createSlider } from './widgets/slider';
import { createSplit } from './widgets/split';
import { createToggleSet } from './widgets/toggleSet';

/** M1 only has Act 1. */
const ACT = 1;

export interface RolePanel {
  /** Show this role's decisions (replacing another role's, if one is open). */
  open(id: RoleId): void;
  close(): void;
  /** The role whose panel is open, or null. */
  readonly current: RoleId | null;
}

// Static markup with no user input; the words are filled in with textContent below. The score is
// drawn twice: a gliding number for the eyes (hidden from screen readers, which would otherwise hear
// every frame of the glide) and a plain final number for them.
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
    <div class="panel__who-score">
      <span class="panel__score-name"></span>
      <span class="panel__progress"></span>
    </div>
    <output class="panel__score">
      <span class="panel__score-seen" aria-hidden="true"></span>
      <span class="sr-only panel__score-final"></span>
    </output>
  </footer>`;

export function createRolePanel(options: {
  store: ChoiceStore;
  sfx: Sfx;
  /** Called after the panel closes, with the role it was showing. */
  onClose(id: RoleId): void;
}): RolePanel {
  const { store, sfx } = options;

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
  const scoreSeen = find('.panel__score-seen');
  const scoreFinal = find('.panel__score-final');
  const progress = find('.panel__progress');

  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scoreCount = createCountUp(scoreSeen, { calm });

  let current: RoleId | null = null;

  // The score and "2 of 3 chosen" both come from what has actually been answered so far.
  function updateFooter(animate: boolean): void {
    if (!current) return;
    const value = Math.round(store.score(current, ACT));
    scoreCount.set(value, animate);
    scoreFinal.textContent = String(value);
    const { answered, total } = store.progress(current, ACT);
    progress.textContent = uiText.panel.progress
      .replace('{answered}', String(answered))
      .replace('{total}', String(total));
  }

  /** The widget for one decision, wired to the store and to a soft sound on every change. */
  function buildWidget(
    id: RoleId,
    decision: Decision,
    labels: Record<string, string>,
  ): HTMLElement {
    const answered = store.get(id, decision);
    const idPrefix = `${id}-${decision.id}`;
    const save = (sound: SfxName) => (answer: Choice) => {
      store.set(id, decision, answer);
      sfx.play(sound);
    };
    switch (decision.widget) {
      case 'toggleSet':
        return createToggleSet({
          idPrefix,
          decision,
          labels,
          choice: answered?.widget === 'toggleSet' ? answered : undefined,
          onChange: save('select'),
        });
      case 'slider':
        return createSlider({
          decision,
          labels,
          choice: answered?.widget === 'slider' ? answered : undefined,
          onChange: save('step'),
        });
      case 'split':
        return createSplit({
          decision,
          labels,
          choice: answered?.widget === 'split' ? answered : undefined,
          onChange: save('step'),
        });
      case 'cardDraft':
        return createCardDraft({
          idPrefix,
          decision,
          labels,
          choice: answered?.widget === 'cardDraft' ? answered : undefined,
          onChange: save('select'),
        });
    }
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

    section.append(heading, prompt, buildWidget(id, decision, text?.labels ?? {}));
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
    updateFooter(false); // opening a panel shows the score straight away; only changes glide
  }

  const close = () => {
    if (!current) return;
    const id = current;
    current = null;
    panel.classList.remove('is-open');
    sfx.play('close');
    options.onClose(id);
  };

  find('.panel__close').addEventListener('click', close);
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
  store.subscribe((role) => {
    if (role === current) updateFooter(true);
  });

  return {
    open(id) {
      current = id;
      render(id);
      panel.classList.add('is-open');
      panel.focus({ preventScroll: true });
      sfx.play('open');
    },
    close,
    get current() {
      return current;
    },
  };
}
