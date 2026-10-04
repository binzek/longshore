// Small helpers for building and combining Effects (see types.ts).
import { METER_IDS, type Effect, type MeterId } from './types';

/** Shorthand for the role files: fx(8, { fishStock: -0.6 }). */
export function fx(
  privateGain: number,
  stewardship: Partial<Record<MeterId, number>> = {},
): Effect {
  return { privateGain, stewardship };
}

export const NO_EFFECT: Effect = fx(0);

/** An effect multiplied by a share between 0 and 1 (for sliders and budget splits). */
export function scaleEffect(effect: Effect, factor: number): Effect {
  const stewardship: Partial<Record<MeterId, number>> = {};
  for (const meter of METER_IDS) {
    const scaled = (effect.stewardship[meter] ?? 0) * factor;
    // Skip zeros so "nothing" always looks the same (and never as -0 or an empty-but-listed meter).
    if (scaled !== 0) stewardship[meter] = scaled;
  }
  return { privateGain: effect.privateGain * factor + 0, stewardship }; // + 0 turns -0 into 0
}

export function addEffects(a: Effect, b: Effect): Effect {
  const stewardship: Partial<Record<MeterId, number>> = {};
  for (const meter of METER_IDS) {
    const sum = (a.stewardship[meter] ?? 0) + (b.stewardship[meter] ?? 0);
    if (sum !== 0) stewardship[meter] = sum;
  }
  return { privateGain: a.privateGain + b.privateGain, stewardship };
}

/** All meters added up into one number: how kind the effect is to the coast overall. */
export function stewardshipTotal(effect: Effect): number {
  return METER_IDS.reduce((sum, meter) => sum + (effect.stewardship[meter] ?? 0), 0);
}
