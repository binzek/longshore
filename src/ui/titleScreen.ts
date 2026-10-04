// The title screen: name, tagline, a loading bar that turns into a Begin button, and the fade-out.
// The markup lives in index.html (so it paints immediately); this file brings it to life.
import narration from '../data/narration.en.json';
import './title.css';

export interface TitleScreen {
  /** Fill the loading bar. 0 = empty, 1 = full. */
  setProgress(fraction: number): void;
  /** Fade the title and tagline in. Call once their fonts are ready. */
  revealText(): void;
  /** Swap the loading bar for the Begin button. */
  showBegin(): void;
  /** Remove the screen immediately (used when the coast cannot be drawn at all). */
  dismiss(): void;
}

export function initTitleScreen(): TitleScreen {
  const root = find('#title');
  const tagline = find('#title-tagline');
  const loader = find('#loader');
  const begin = find<HTMLButtonElement>('#begin');

  tagline.textContent = narration.title.tagline;

  const dismiss = () => {
    root.hidden = true;
  };

  begin.addEventListener('click', () => {
    begin.disabled = true; // a double tap must not run this twice
    root.classList.add('is-leaving');
    // Remove it once the fade finishes. transitionend also bubbles up from child elements, so only
    // react to the screen's own opacity. The timeout is a fallback in case the event never fires.
    root.addEventListener('transitionend', (event) => {
      if (event.target === root && event.propertyName === 'opacity') dismiss();
    });
    window.setTimeout(dismiss, 1300);
  });

  // Keyboard players can press Enter or Space once Begin has appeared (no focus ring needed).
  window.addEventListener('keydown', (event) => {
    const ready = root.classList.contains('is-loaded') && !root.classList.contains('is-leaving');
    if (ready && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      begin.click();
    }
  });

  return {
    setProgress(fraction) {
      const clamped = Math.min(Math.max(fraction, 0), 1);
      root.style.setProperty('--progress', String(clamped));
      loader.setAttribute('aria-valuenow', String(Math.round(clamped * 100)));
    },
    revealText() {
      root.classList.add('is-text-ready');
    },
    showBegin() {
      root.classList.add('is-loaded');
    },
    dismiss,
  };
}

function find<T extends HTMLElement = HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing ${selector} in index.html`);
  return element;
}
