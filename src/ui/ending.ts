// The game-y part: a "Jump to 2050" button, a short time-jump (a haze veil with the year counting
// up while the sea rises behind it), and the results card: the storm, the four shared meters
// before and after, and what each role kept. All numbers come from simulate(); this file only shows
// them. Roles the player never touched are played by bots (the sim decides that from the answers).
import type { ChoiceStore } from '../game/choiceStore';
import uiText from '../data/ui.en.json';
import { METER_IDS, ROLE_IDS } from '../sim/roles';
import type { Choice, RoleId } from '../sim/roles';
import { simulate } from '../sim/simulate';
import type { SimResult } from '../sim/simulate';
import type { Sfx } from '../audio/sfx';
import { createCountUp } from './countUp';
import './ending.css';
import { ROLE_TEXT } from './roleText';

const YEAR_FROM = 2026; // the year the game starts in (plan 2.1)
const YEAR_TO = 2050;
const TEXT = uiText.ending;

export interface Ending {
  /** Show the Jump button (after the intro). */
  showButton(): void;
}

/** A small element with a class and optional text. Text goes in through textContent only. */
function make<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

export function createEnding(options: {
  store: ChoiceStore;
  sfx: Sfx;
  /** Called as the jump starts: close any open panel. */
  onStart(): void;
  /** Called when the years have passed: raise the sea (0 to 1). */
  onSeaRise(share: number): void;
}): Ending {
  const { store, sfx } = options;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- The button ----
  const button = make('button', 'finish glass');
  button.type = 'button';
  button.hidden = true;
  button.append(
    make('span', 'finish__main', uiText.finish.button),
    make('span', 'finish__hint', uiText.finish.hint),
  );

  // ---- The veil: haze over the scene while the years pass ----
  const veil = make('div', 'jump');
  veil.hidden = true;
  veil.setAttribute('aria-hidden', 'true');
  const year = make('p', 'jump__year', String(YEAR_FROM));
  veil.append(year, make('p', 'jump__caption', uiText.jump.caption));
  const yearCount = createCountUp(year, { calm, durationMs: 2300 });
  yearCount.set(YEAR_FROM, false); // the count-up glides from what it last showed: show 2026 first

  // ---- The results card ----
  const card = make('section', 'ending glass');
  card.tabIndex = -1;
  card.setAttribute('role', 'region');
  card.setAttribute('aria-label', TEXT.title);

  document.body.append(button, veil, card);

  function buildCard(result: SimResult): void {
    const head = make('header', 'ending__head');
    head.append(
      make('h2', 'ending__title', TEXT.title),
      make('span', 'sticker', TEXT.sticker), // simulated results always carry the sticker
    );

    const stormLine =
      result.damage < 20
        ? TEXT.storm.light
        : result.damage < 40
          ? TEXT.storm.medium
          : TEXT.storm.heavy;
    const storm = make('section', 'ending__block');
    storm.append(make('h3', 'ending__sub', TEXT.stormTitle), make('p', 'ending__text', stormLine));

    // Meters: the bar slides and the number counts from the 2026 value to the 2050 one.
    const meters = make('section', 'ending__block');
    meters.append(make('h3', 'ending__sub', TEXT.metersTitle));
    const bars: { fill: HTMLElement; count: ReturnType<typeof createCountUp>; to: number }[] = [];
    for (const id of METER_IDS) {
      const row = make('div', 'row');
      const fill = make('span', 'bar__fill');
      fill.style.width = `${result.before[id]}%`;
      const bar = make('span', 'bar');
      bar.append(fill);
      const number = make('output', 'row__num');
      number.textContent = String(result.before[id]);
      row.append(make('span', 'row__name', TEXT.meters[id]), bar, number);
      meters.append(row);
      const count = createCountUp(number, { calm, durationMs: 1400 });
      count.set(result.before[id], false);
      bars.push({ fill, count, to: result.after[id] });
    }

    // Scores: each role's private score before and after the years.
    const scores = make('section', 'ending__block');
    scores.append(make('h3', 'ending__sub', TEXT.scoresTitle));
    for (const outcome of result.roles) {
      const row = make('div', outcome.bot ? 'row' : 'row is-you');
      row.append(
        make('span', 'row__name', `${ROLE_TEXT[outcome.id].label}`),
        make('span', 'row__tag', outcome.bot ? TEXT.bot : TEXT.you),
        make('span', 'row__score', `${outcome.before} → ${outcome.after}`),
      );
      scores.append(row);
    }

    const verdict = make('p', 'ending__verdict', TEXT.verdict[result.verdict]);
    const note = make('p', 'ending__note', TEXT.note);
    const again = make('button', 'ending__again glass', TEXT.again);
    again.type = 'button';
    again.addEventListener('click', () => window.location.reload());

    card.replaceChildren(head, storm, meters, scores, verdict, note, again);

    // Let the card paint at the 2026 values first, then slide to 2050.
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => {
        for (const bar of bars) {
          bar.fill.style.width = `${bar.to}%`;
          bar.count.set(bar.to, true);
        }
      }),
    );
  }

  function run(): void {
    button.disabled = true;
    button.classList.remove('is-visible');
    options.onStart();

    // What the player answered; a role with no answers at all becomes a bot inside simulate().
    const answers: Partial<Record<RoleId, readonly Choice[]>> = {};
    for (const id of ROLE_IDS) answers[id] = store.forAct(id, 1);
    // The seed is picked here, at the edge, so simulate() itself never needs Math.random().
    const result = simulate({ seed: Date.now() >>> 0, answers });

    veil.hidden = false;
    window.requestAnimationFrame(() => veil.classList.add('is-on'));
    sfx.play('open');
    window.setTimeout(() => yearCount.set(YEAR_TO, true), calm ? 0 : 700);

    window.setTimeout(
      () => {
        buildCard(result);
        document.body.classList.add('is-ended'); // hides the markers, which would reopen panels
        options.onSeaRise(Math.min(1, (100 - result.after.shoreBuffer) / 60));
        veil.classList.remove('is-on');
        window.setTimeout(() => (veil.hidden = true), 1000);
        card.classList.add('is-open');
        card.focus({ preventScroll: true });
        sfx.play('close');
      },
      calm ? 500 : 3400,
    );
  }

  button.addEventListener('click', run);

  return {
    showButton() {
      button.hidden = false;
      window.requestAnimationFrame(() => button.classList.add('is-visible'));
    },
  };
}
