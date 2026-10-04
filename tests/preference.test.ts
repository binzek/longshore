import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadSoundOn, saveSoundOn } from '../src/audio/preference';

/** A tiny stand-in for the browser's localStorage. */
function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('sound preference', () => {
  it('defaults to sound on when nothing is saved', () => {
    vi.stubGlobal('localStorage', fakeStorage());
    expect(loadSoundOn()).toBe(true);
  });

  it('remembers off and on', () => {
    vi.stubGlobal('localStorage', fakeStorage());
    saveSoundOn(false);
    expect(loadSoundOn()).toBe(false);
    saveSoundOn(true);
    expect(loadSoundOn()).toBe(true);
  });

  it('still works when storage is blocked (private window)', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    vi.stubGlobal('localStorage', blocked);
    expect(loadSoundOn()).toBe(true);
    expect(() => saveSoundOn(false)).not.toThrow();
  });
});
