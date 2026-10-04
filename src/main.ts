import './style.css';
import { applyPaletteToCss } from './scene/palette';
import { createWorld } from './scene/world';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Missing #app element in index.html');

applyPaletteToCss();

try {
  createWorld(app);
} catch (error) {
  // No WebGL (very old phone, blocked GPU): show a plain message, never a blank page.
  console.error(error);
  const message = document.createElement('p');
  message.className = 'fallback';
  message.textContent = 'Longshore needs WebGL to draw the coast. Please try another browser.';
  app.replaceChildren(message);
}
