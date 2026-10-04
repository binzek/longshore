// Beach shack owner (shoreline), plan 4.2. All numbers are placeholders [TUNE].
// Left out on purpose until later: the budget the plan puts on these toggles, and cooling costing
// more when it is hot (that needs the heat pressure from simulate(), M2).
import { fx } from './effects';
import type { RoleConfig } from './types';

export const shack: RoleConfig = {
  id: 'shack',
  privateScoreStart: 40,
  exposure: { cleanCoast: 0.5, coolness: 0.5 },
  decisions: [
    {
      id: 'menu',
      act: 1,
      widget: 'toggleSet',
      toggles: [
        {
          id: 'plates',
          default: 'steel',
          options: [
            { id: 'single', effect: fx(5, { cleanCoast: -0.6 }) },
            { id: 'steel', effect: fx(2, { cleanCoast: 0.4 }) },
          ],
        },
        {
          id: 'fish',
          default: 'local',
          options: [
            { id: 'trucked', effect: fx(4, { cleanCoast: -0.2 }) },
            { id: 'local', effect: fx(2, { cleanCoast: 0.1 }) },
          ],
        },
        {
          id: 'cooling',
          default: 'fans',
          options: [
            { id: 'ac', effect: fx(5, { coolness: -0.5 }) },
            { id: 'fans', effect: fx(2, { coolness: 0.1 }) },
          ],
        },
      ],
    },
  ],
};
