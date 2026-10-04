// The round glass sound on/off button. It only reports the player's choice (onChange); the audio
// itself and remembering the choice are handled by the caller.
import './soundToggle.css';

export interface SoundToggle {
  /** Fade the button in (after the player taps Begin). */
  show(): void;
}

// Two thin-line speaker icons; CSS shows one depending on aria-pressed. Static markup, no user input.
const ICONS = `
  <svg class="icon-on" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" />
    <path d="M15.5 9a4.2 4.2 0 0 1 0 6" />
    <path d="M18 6.5a8 8 0 0 1 0 11" />
  </svg>
  <svg class="icon-off" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" />
    <path d="M16 9.5l5 5M21 9.5l-5 5" />
  </svg>`;

export function createSoundToggle(options: {
  on: boolean;
  onChange(on: boolean): void;
}): SoundToggle {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'sound-toggle glass';
  button.setAttribute('aria-label', 'Sound');
  button.setAttribute('aria-pressed', String(options.on));
  button.innerHTML = ICONS;

  button.addEventListener('click', () => {
    const on = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(on));
    options.onChange(on);
  });

  document.body.append(button);
  return {
    show() {
      button.classList.add('is-visible');
    },
  };
}
