import '@fontsource/fraunces/latin-300.css'; // title and buttons
import '@fontsource/newsreader/latin-400-italic.css'; // tagline
import './style.css';
import { createAmbience } from './audio/ambience';
import { loadSoundOn, saveSoundOn } from './audio/preference';
import { applyPaletteToCss } from './scene/palette';
import { PAN } from './scene/config';
import { debugExpose } from './scene/debug';
import { ROLE_ANCHORS } from './scene/layout';
import { createWorld } from './scene/world';
import { createRoleMarkers } from './ui/markers';
import { createSoundToggle } from './ui/soundToggle';
import { initTitleScreen } from './ui/titleScreen';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Missing #app element in index.html');

applyPaletteToCss();
const title = initTitleScreen();

// Sound: silent until the player taps Begin (browsers insist on a tap), then a quiet sea.
// The on/off choice is remembered between visits.
const ambience = createAmbience();
const soundOn = loadSoundOn();
ambience.setEnabled(soundOn);
const soundToggle = createSoundToggle({
  on: soundOn,
  onChange: (on) => {
    saveSoundOn(on);
    ambience.setEnabled(on);
  },
});
title.onBegin(() => {
  ambience.start();
  soundToggle.show();
});
debugExpose({ ambience });

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

      // Glass markers over each role's spot. They follow the camera, and appear after Begin.
      const markers = createRoleMarkers({
        container: app,
        order: ROLE_ANCHORS.map((anchor) => anchor.id),
        tapSlopPx: PAN.tapSlopPx,
        // Step 3 opens the role's panel here. For now a tap just highlights that marker.
        onSelect: (id) => markers.select(id),
      });
      world.onFrame(() => markers.update(world.projectRole));
      title.onBegin(markers.show);

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
