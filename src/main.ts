import '@fontsource/fraunces/latin-300.css'; // title and buttons
import '@fontsource/newsreader/latin-400-italic.css'; // tagline, hints, captions
import '@fontsource/newsreader/latin-400.css'; // panel text and numbers
import './style.css';
import { createAmbience } from './audio/ambience';
import { loadSoundOn, saveSoundOn } from './audio/preference';
import { createChoiceStore } from './game/choiceStore';
import narration from './data/narration.en.json';
import uiText from './data/ui.en.json';
import { applyPaletteToCss } from './scene/palette';
import { PAN } from './scene/config';
import { debugExpose } from './scene/debug';
import { ROLE_ANCHORS } from './scene/layout';
import { createWorld } from './scene/world';
import { createIntro } from './ui/intro';
import { createRoleMarkers } from './ui/markers';
import { createRolePanel } from './ui/rolePanel';
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

// The loading bar waits for five real things: three fonts, the coast being built, its first frame.
const LOAD_STEPS = 5;
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

// The title's text only waits for its own two fonts; the roman Newsreader (panels) loads alongside.
Promise.all([loadFont('300 1em Fraunces'), loadFont('italic 400 1em Newsreader')]).then(
  title.revealText,
);
loadFont('400 1em Newsreader');

// Let the empty bar paint first: building the coast takes a moment and blocks the page while it runs.
requestAnimationFrame(() =>
  requestAnimationFrame(() => {
    try {
      const world = createWorld(app);

      // Tapping a marker opens that role's panel; tapping it again, or closing the panel, closes it.
      // For now any role's panel can be edited. Step 5 locks the player to the one role they chose
      // and hands the other four to the bots.
      const store = createChoiceStore();
      const panel = createRolePanel({
        store,
        onClose: (id) => {
          markers.select(null);
          markers.focus(id);
        },
      });

      // Glass markers over each role's spot. They follow the camera, and appear after Begin.
      const markers = createRoleMarkers({
        container: app,
        order: ROLE_ANCHORS.map((anchor) => anchor.id),
        tapSlopPx: PAN.tapSlopPx,
        onSelect: (id) => {
          if (panel.current === id) {
            panel.close();
          } else {
            markers.select(id);
            panel.open(id);
          }
        },
      });
      world.onFrame(() => markers.update(world.projectRole));

      // After Begin the intro lines play over the coast; the markers appear when it ends or is skipped.
      const intro = createIntro(narration.intro, uiText.intro.skip);
      title.onBegin(intro.start);
      intro.onDone(markers.show);

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
