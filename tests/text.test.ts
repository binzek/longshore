import { describe, expect, it } from 'vitest';
import narration from '../src/data/narration.en.json';
import uiText from '../src/data/ui.en.json';

/** Every string in a JSON file, with where it was found. */
function strings(value: unknown, path: string): [string, string][] {
  if (typeof value === 'string') return [[path, value]];
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => strings(child, `${path}.${key}`));
  }
  return [];
}

describe('on-screen text files', () => {
  it('has no empty strings', () => {
    for (const [path, text] of [...strings(narration, 'narration'), ...strings(uiText, 'ui')]) {
      expect(text.trim().length, path).toBeGreaterThan(0);
    }
  });

  it('has no digits in the narration (a real-world number needs a factId, plan 8.9)', () => {
    for (const [path, text] of strings(narration, 'narration')) {
      expect(text, path).not.toMatch(/\d/);
    }
  });

  it('has 3 to 5 intro lines, as the plan asks (section 2.1)', () => {
    expect(narration.intro.length).toBeGreaterThanOrEqual(3);
    expect(narration.intro.length).toBeLessThanOrEqual(5);
  });
});
