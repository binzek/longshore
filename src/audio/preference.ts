// Remembers whether the player turned the sound off, so it stays off next visit.
// localStorage can be missing or throw (private windows, blocked site data), so the game must
// work without it: the default is sound on, and a failed save is silently ignored.
const KEY = 'longshore.sound';

export function loadSoundOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function saveSoundOn(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    // Not remembering is fine.
  }
}
