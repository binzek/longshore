// The five glass markers that hover over each role's spot on the coast. Each is a real <button>
// (keyboard focus, screen-reader name) laid over the canvas, moved every frame to follow its spot.
// The scene says where each one belongs (`update`); this file never touches Three.js.
import roleText from '../data/roles.en.json';
import type { RoleId } from '../sim/roles/types';
import { ROLE_ICONS } from './roleIcons';
import './markers.css';

/** Where a marker belongs on screen (pixels from the top-left), and whether it is in view. */
export interface MarkerSpot {
  x: number;
  y: number;
  visible: boolean;
}

export interface RoleMarkers {
  /** Fade the markers in (after the player taps Begin). */
  show(): void;
  /** Move every marker to where `project` says its spot is. Call once per frame, after drawing. */
  update(project: (id: RoleId) => MarkerSpot): void;
  /** Highlight one role's marker, or none. */
  select(id: RoleId | null): void;
}

interface Marker {
  id: RoleId;
  root: HTMLElement; // positioned wrapper; moved with a transform
  button: HTMLButtonElement;
  x: number;
  y: number;
}

export function createRoleMarkers(options: {
  container: HTMLElement;
  /** Roles in left-to-right order along the coast, which is also the Tab order. */
  order: readonly RoleId[];
  /** A press that moves more than this (px) was a drag, not a tap. Same number the pan uses. */
  tapSlopPx: number;
  onSelect(id: RoleId): void;
}): RoleMarkers {
  const layer = document.createElement('div');
  layer.className = 'markers';
  layer.tabIndex = -1; // not a Tab stop, but it can be focused from code (see show())

  const markers: Marker[] = options.order.map((id, index) => {
    const label = roleText[id].label;

    const root = document.createElement('div');
    root.className = 'marker';
    root.style.setProperty('--i', String(index)); // staggers the pulse so they do not beat together

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'marker__button glass';
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-pressed', 'false');
    button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ROLE_ICONS[id]}</svg>`;

    const caption = document.createElement('span');
    caption.className = 'marker__caption';
    caption.setAttribute('aria-hidden', 'true'); // the button already has the name
    caption.textContent = label;

    // Tap or drag? A drag that starts on a marker pans the coast and must not select it. The pan
    // stops the click by capturing the pointer, but we do not rely on that alone (touch browsers
    // differ), so we also check how far the press travelled.
    let pressX = 0;
    let pressY = 0;
    button.addEventListener('pointerdown', (event) => {
      pressX = event.clientX;
      pressY = event.clientY;
    });
    button.addEventListener('click', (event) => {
      // detail is 0 for a keyboard press (Enter or Space), which has no pointer to measure.
      const dragged =
        event.detail > 0 &&
        Math.hypot(event.clientX - pressX, event.clientY - pressY) > options.tapSlopPx;
      if (!dragged) options.onSelect(id);
    });

    root.append(button, caption);
    layer.append(root);
    return { id, root, button, x: Number.NaN, y: Number.NaN };
  });

  options.container.append(layer);

  return {
    show() {
      // Wait for the title screen to fade away first.
      window.setTimeout(() => {
        // Named only now, so a screen reader does not announce an empty group behind the title.
        layer.setAttribute('role', 'group');
        layer.setAttribute('aria-label', 'Roles on the coast');
        layer.classList.add('is-shown');
        // The Begin button is going away, and the browser would carry on Tab navigation from where
        // it was in the page: past the markers. Park focus on the layer so the first Tab goes to
        // the first marker.
        layer.focus({ preventScroll: true });
      }, 700);
    },
    update(project) {
      for (const marker of markers) {
        const spot = project(marker.id);
        marker.root.classList.toggle('is-on-screen', spot.visible);
        if (!spot.visible) continue; // nothing to place; it is hidden
        // Only touch the DOM when it moved (a still camera costs nothing).
        if (Math.abs(spot.x - marker.x) < 0.1 && Math.abs(spot.y - marker.y) < 0.1) continue;
        marker.x = spot.x;
        marker.y = spot.y;
        marker.root.style.transform = `translate3d(${spot.x.toFixed(1)}px, ${spot.y.toFixed(1)}px, 0)`;
      }
    },
    select(id) {
      for (const marker of markers) {
        marker.button.setAttribute('aria-pressed', String(marker.id === id));
      }
    },
  };
}
