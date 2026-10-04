// Fisher (boat offshore), plan 4.1. All numbers are placeholders [TUNE].
// M1 stand-in: the push-your-luck haul is just a mesh-size pick for now (the real mini-game is M3).
// The decision keeps its id `haul`, so M3 swaps the widget and nothing else.
import { fx } from './effects';
import type { RoleConfig } from './types';

export const fisher: RoleConfig = {
  id: 'fisher',
  privateScoreStart: 40,
  exposure: { fishStock: 1 },
  decisions: [
    {
      id: 'haul',
      act: 1,
      widget: 'toggleSet',
      toggles: [
        {
          id: 'mesh',
          default: 'medium',
          // Smaller mesh: more fish now, more juveniles caught.
          options: [
            { id: 'small', effect: fx(8, { fishStock: -0.6 }) },
            { id: 'medium', effect: fx(5, { fishStock: -0.2 }) },
            { id: 'large', effect: fx(3, { fishStock: 0.2 }) },
          ],
        },
      ],
    },
    {
      id: 'ban',
      act: 1,
      widget: 'toggleSet',
      toggles: [
        {
          id: 'window',
          default: 'observe',
          options: [
            { id: 'skip', effect: fx(6, { fishStock: -0.5 }) },
            { id: 'observe', effect: fx(0, { fishStock: 0.5 }) },
          ],
        },
      ],
    },
    {
      id: 'gear',
      act: 1,
      widget: 'toggleSet',
      toggles: [
        {
          id: 'gear',
          default: 'line',
          options: [
            { id: 'net', effect: fx(6, { fishStock: -0.4 }) },
            { id: 'line', effect: fx(2, { fishStock: 0.3 }) },
          ],
        },
      ],
    },
  ],
};
