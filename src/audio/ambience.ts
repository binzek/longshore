// Quiet sea ambience made entirely in code (Web Audio), so there is no sound file to download or
// license. It is soft noise shaped like surf: a "wash" that swells and fades every ~8 to 10
// seconds, a faint foamy hiss on top, and a low rumble under it. Real recordings can replace this
// later behind the same start() / setEnabled() calls.
//
// Browsers only allow sound after a tap, so start() must be called from a tap handler (Begin).

const LEVEL = 0.5; // master loudness when on (0..1): deliberately soft
const NOISE_SECONDS = 6; // length of the looping noise buffer

export interface Ambience {
  /** Call from a tap. Starts the sea (unless the player has turned sound off). */
  start(): void;
  /** The sound on/off toggle. Safe to call before start(). */
  setEnabled(on: boolean): void;
  /** For inspecting the audio graph in development tools. */
  readonly context: AudioContext | null;
  readonly output: GainNode | null;
}

export function createAmbience(): Ambience {
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let begun = false;
  let enabled = true;

  const shouldPlay = () => begun && enabled && !document.hidden;

  /** Fade up or down to match the state. Muted or hidden: also stop the audio clock to save battery. */
  function update(): void {
    if (shouldPlay()) {
      const first = context === null;
      if (first) build();
      if (!context || !master) return;
      void context.resume();
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setTargetAtTime(LEVEL, context.currentTime, first ? 1.5 : 0.6);
    } else if (context && master) {
      const idle = context;
      master.gain.cancelScheduledValues(idle.currentTime);
      master.gain.setTargetAtTime(0, idle.currentTime, 0.25);
      window.setTimeout(() => {
        if (!shouldPlay()) void idle.suspend(); // the fade has finished by now
      }, 1500);
    }
  }

  function build(): void {
    const ctx = new AudioContext();
    context = ctx;
    master = ctx.createGain();
    master.gain.value = 0; // starts silent; update() fades it in
    master.connect(ctx.destination);
    const out = master;

    const noise = makeNoise(ctx);
    // A slow sine wave that wobbles a setting over time (an "LFO"): depth is how far it swings.
    const wobble = (hz: number, depth: number, target: AudioParam) => {
      const osc = ctx.createOscillator();
      osc.frequency.value = hz;
      const amount = ctx.createGain();
      amount.gain.value = depth;
      osc.connect(amount).connect(target);
      osc.start();
    };
    // Each layer plays the same noise from a different point so they do not sound identical.
    const layer = (offset: number) => {
      const source = ctx.createBufferSource();
      source.buffer = noise;
      source.loop = true;
      source.start(0, offset);
      return source;
    };

    // 1. The wash: the main surf. Louder and brighter as each wave arrives. Two slightly
    //    different swell speeds drift in and out of step, so it never repeats exactly.
    const wash = ctx.createBiquadFilter();
    wash.type = 'lowpass';
    wash.frequency.value = 900;
    wobble(0.1, 450, wash.frequency);
    wobble(0.143, 300, wash.frequency);
    const washLevel = ctx.createGain();
    washLevel.gain.value = 0.38; // the two swells below add up to at most 0.36, so it never goes negative
    wobble(0.1, 0.22, washLevel.gain);
    wobble(0.143, 0.14, washLevel.gain);
    layer(0).connect(wash).connect(washLevel).connect(out);

    // 2. Foam: a faint high hiss that rises a little with each wave.
    const foam = ctx.createBiquadFilter();
    foam.type = 'bandpass';
    foam.frequency.value = 3200;
    foam.Q.value = 0.6;
    const foamLevel = ctx.createGain();
    foamLevel.gain.value = 0.035;
    wobble(0.1, 0.025, foamLevel.gain);
    layer(2.3).connect(foam).connect(foamLevel).connect(out);

    // 3. Rumble: the deep, steady weight of the sea.
    const rumble = ctx.createBiquadFilter();
    rumble.type = 'lowpass';
    rumble.frequency.value = 130;
    const rumbleLevel = ctx.createGain();
    rumbleLevel.gain.value = 0.28;
    layer(4.1).connect(rumble).connect(rumbleLevel).connect(out);
  }

  document.addEventListener('visibilitychange', update);

  return {
    start() {
      begun = true;
      update();
    },
    setEnabled(on) {
      enabled = on;
      update();
    },
    get context() {
      return context;
    },
    get output() {
      return master;
    },
  };
}

/** Looping stereo pink-ish noise (softer and less hissy than plain white noise). */
function makeNoise(ctx: AudioContext): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * NOISE_SECONDS);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    // Paul Kellet's cheap pink-noise filter: a few running averages of white noise.
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  }
  return buffer;
}
