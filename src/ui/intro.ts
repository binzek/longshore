// The intro narration: a few short lines fade in and out over the coast, with a Skip button. The
// coast stays draggable behind it (the overlay ignores the pointer; only Skip takes it). When the
// lines end, or the player skips, the caller is told so the markers can appear.
import './intro.css';

export interface Intro {
  /** Begin showing the lines (call after the player taps Begin). */
  start(): void;
  /** Run `handler` once, when the intro ends or is skipped. */
  onDone(handler: () => void): void;
}

const FIRST_DELAY_MS = 1000; // the title screen is still fading away
const SHOW_MS = 4600; // each line stays this long...
const FADE_MS = 900; // ...and takes this long to fade in or out (see intro.css)

export function createIntro(lines: readonly string[], skipLabel: string): Intro {
  const root = document.createElement('section');
  root.className = 'intro';
  root.hidden = true;

  const line = document.createElement('p');
  line.className = 'intro__line';
  line.setAttribute('aria-live', 'polite'); // screen readers read each line as it appears

  const skip = document.createElement('button');
  skip.type = 'button';
  skip.className = 'intro__skip glass';
  skip.textContent = skipLabel;

  root.append(line, skip);
  document.body.append(root);

  const handlers: (() => void)[] = [];
  let timer = 0;
  let finished = false;
  let index = 0;

  const finish = () => {
    if (finished) return;
    finished = true;
    window.clearTimeout(timer);
    line.classList.remove('is-visible');
    root.classList.add('is-leaving');
    window.setTimeout(() => (root.hidden = true), FADE_MS);
    for (const handler of handlers) handler();
  };

  const showNext = () => {
    const text = lines[index];
    if (text === undefined) return finish();
    line.textContent = text;
    line.classList.add('is-visible');
    timer = window.setTimeout(() => {
      line.classList.remove('is-visible');
      index += 1;
      timer = window.setTimeout(showNext, FADE_MS);
    }, SHOW_MS);
  };

  skip.addEventListener('click', finish);

  return {
    start() {
      if (finished || !root.hidden) return;
      root.hidden = false;
      skip.focus({ preventScroll: true }); // keyboard players can skip straight away
      timer = window.setTimeout(showNext, FIRST_DELAY_MS);
    },
    onDone(handler) {
      handlers.push(handler);
    },
  };
}
