// Soft, short interface sounds, made in code (Web Audio) like the sea, so there are no files to
// download or license. Each is one or two quiet sine/triangle notes that fade quickly. They follow
// the same sound on/off toggle as the sea.
//
// Browsers only allow sound after a tap; every call here comes from a tap or key press, and the
// audio context is created on the first one.

export type SfxName =
  | 'select' // a choice was picked
  | 'step' // a slider moved one notch
  | 'open' // a panel opened
  | 'close'; // a panel closed

export interface Sfx {
  play(name: SfxName): void;
  /** The sound on/off toggle. */
  setEnabled(on: boolean): void;
}

const LEVEL = 0.6; // overall loudness of the interface sounds (the notes themselves are quiet too)
const STEP_GAP_S = 0.055; // dragging a slider must not turn into a buzz

export function createSfx(): Sfx {
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let enabled = true;
  let lastStep = 0;

  /** The audio context, created on first use. Null if sound is off or unavailable. */
  function ready(): AudioContext | null {
    if (!enabled) return null;
    if (!context) {
      try {
        context = new AudioContext();
        master = context.createGain();
        master.gain.value = LEVEL;
        master.connect(context.destination);
      } catch {
        enabled = false; // no Web Audio here: stay silent rather than error on every tap
        return null;
      }
    }
    if (context.state === 'suspended') void context.resume();
    return context;
  }

  /** One soft note: a quick rise, then a fade. `endHz` slides the pitch over the note. */
  function note(
    ctx: AudioContext,
    hz: number,
    delay: number,
    seconds: number,
    peak: number,
    type: OscillatorType = 'sine',
    endHz?: number,
  ): void {
    if (!master) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(hz, start);
    if (endHz) osc.frequency.exponentialRampToValueAtTime(endHz, start + seconds);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(gain).connect(master);
    osc.start(start);
    osc.stop(start + seconds + 0.05);
  }

  return {
    play(name) {
      const ctx = ready();
      if (!ctx) return;
      switch (name) {
        case 'select':
          note(ctx, 587, 0, 0.18, 0.1);
          note(ctx, 880, 0.04, 0.14, 0.05);
          break;
        case 'step': {
          const now = ctx.currentTime;
          if (now - lastStep < STEP_GAP_S) return;
          lastStep = now;
          note(ctx, 740, 0, 0.07, 0.035, 'triangle');
          break;
        }
        case 'open':
          note(ctx, 392, 0, 0.36, 0.07);
          note(ctx, 523, 0.07, 0.36, 0.05);
          break;
        case 'close':
          note(ctx, 523, 0, 0.26, 0.06, 'sine', 392);
          break;
      }
    },
    setEnabled(on) {
      enabled = on;
      if (!on && context) void context.suspend(); // nothing playing; save the battery
    },
  };
}
