// Mangrove nursery NGO (estuary edge), plan 4.4. All numbers are placeholders [TUNE].
// M1 stand-in: the tile-placement game (right site, density cap, saplings that grow in) is M3.
// Here a site pick and a sapling count stand in for it. Planting costs the NGO money (negative
// privateGain) while the coast gains; the easy, visible site pays the NGO but protects less.
import { fx } from './effects';
import type { RoleConfig } from './types';

export const nursery: RoleConfig = {
  id: 'nursery',
  privateScoreStart: 40,
  exposure: { shoreBuffer: 0.5, fishStock: 0.5 },
  decisions: [
    {
      id: 'saplings',
      act: 1,
      widget: 'slider',
      min: 0,
      max: 8,
      step: 1,
      default: 4,
      effectAtMax: fx(-6, { shoreBuffer: 0.5, fishStock: 0.3 }),
    },
    {
      id: 'site',
      act: 1,
      widget: 'toggleSet',
      toggles: [
        {
          id: 'site',
          default: 'mudflat',
          options: [
            { id: 'beach', effect: fx(6, { shoreBuffer: -0.2 }) },
            { id: 'mudflat', effect: fx(1, { shoreBuffer: 0.5, fishStock: 0.3 }) },
          ],
        },
      ],
    },
    {
      id: 'followup',
      act: 1,
      widget: 'toggleSet',
      toggles: [
        {
          id: 'followup',
          default: 'survey',
          options: [
            { id: 'moveOn', effect: fx(4, { shoreBuffer: -0.2 }) },
            { id: 'survey', effect: fx(1, { shoreBuffer: 0.3, fishStock: 0.1 }) },
          ],
        },
      ],
    },
  ],
};
