import '@fontsource/fraunces/latin-300.css'; // title and buttons
import '@fontsource/newsreader/latin-400-italic.css'; // tagline
import './style.css';
import { applyPaletteToCss } from './scene/palette';
import { createWorld } from './scene/world';
import { initTitleScreen } from './ui/titleScreen';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Missing #app element in index.html');

applyPaletteToCss();
const title = initTitleScreen();

// The loading bar waits for four real things: two fonts, the coast being built, its first frame.
const LOAD_STEPS = 4;
let finished = 0;
const finishStep = () => {
  finished += 1;
  title.setProgress(finished / LOAD_STEPS);
  if (finished === LOAD_STEPS) title.showBegin();
};

/** Wait for a font. If it fails to load we carry on with the fallback serif rather than hang. */
const loadFont = (descriptor: string) =>
  document.fonts
    .load(descriptor)
    .catch(() => [])
    .then(finishStep);

Promise.all([loadFont('300 1em Fraunces'), loadFont('italic 400 1em Newsreader')]).then(
  title.revealText,
);

// Let the empty bar paint first: building the coast takes a moment and blocks the page while it runs.
requestAnimationFrame(() =>
  requestAnimationFrame(() => {
    try {
      const world = createWorld(app);
      finishStep();
      world.firstFrame.then(finishStep);
    } catch (error) {
      // No WebGL (very old phone, blocked GPU): show a plain message, never a blank page.
      console.error(error);
      const message = document.createElement('p');
      message.className = 'fallback';
      message.textContent = 'Longshore needs WebGL to draw the coast. Please try another browser.';
      app.replaceChildren(message);
      title.dismiss();
    }
  }),
);
