// Panchayat officer (office near the jetty), plan 4.5. All numbers are placeholders [TUNE].
// Left out on purpose until later: the budget on the hand of cards, and cross-role effects (the
// setback rule hurting shack income, the fishing ban hurting fisher income). M1 has private scores
// only and each role's effects stay inside its own role.
// The cards form a ladder: the more popular a policy is now, the less it does for the coast.
import { fx } from './effects';
import type { RoleConfig } from './types';

export const panchayat: RoleConfig = {
  id: 'panchayat',
  privateScoreStart: 40,
  exposure: { shoreBuffer: 0.25, fishStock: 0.25, cleanCoast: 0.25, coolness: 0.25 },
  decisions: [
    {
      id: 'policy',
      act: 1,
      widget: 'cardDraft',
      default: 'wasteDrive',
      cards: [
        { id: 'seawall', effect: fx(7, { shoreBuffer: 0.4 }) },
        { id: 'wasteDrive', effect: fx(4, { cleanCoast: 0.5 }) },
        { id: 'fishingBan', effect: fx(-1, { fishStock: 0.6 }) },
        { id: 'setback', effect: fx(-2, { shoreBuffer: 0.7 }) },
        { id: 'relocation', effect: fx(-4, { shoreBuffer: 0.8 }) },
      ],
    },
  ],
};
