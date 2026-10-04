// Household (behind the shore), plan 4.3. All numbers are placeholders [TUNE].
//
// PROPOSAL for Wajid to confirm: the plan says "split a rupee budget across four sliders: cooling,
// water, transport, food". To make a split a real trade-off, each slider here is spending on the
// convenient option of that line (air conditioning, bottled water, private vehicle, takeaway food),
// and whatever is not spent counts as savings. Comfort rises with spending, savings rise with
// restraint, and the coast pays for the spending. The plan's structural limits (a bus that does
// not run on this route) are not modelled yet. Effects stay ordinal until sourced (plan 4.3).
//
// Ordered so each line gives more comfort and costs the coast more than the one before, so no line
// is a free win.
import { fx } from './effects';
import type { RoleConfig } from './types';

export const household: RoleConfig = {
  id: 'household',
  privateScoreStart: 40,
  exposure: { coolness: 0.5, shoreBuffer: 0.5 },
  decisions: [
    {
      id: 'budget',
      act: 1,
      widget: 'split',
      budget: 10,
      step: 1,
      parts: [
        { id: 'food', default: 2, effectAtFullBudget: fx(8, { cleanCoast: -0.3 }) },
        { id: 'water', default: 2, effectAtFullBudget: fx(10, { cleanCoast: -0.5 }) },
        { id: 'transport', default: 2, effectAtFullBudget: fx(12, { coolness: -0.6 }) },
        { id: 'cooling', default: 2, effectAtFullBudget: fx(14, { coolness: -0.8 }) },
      ],
      unspent: fx(6),
    },
  ],
};
