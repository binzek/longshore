// What a role is, as plain data (plan section 4). The simulation and the bots read this; the UI
// renders it with a few reusable widgets. Nothing here knows about the scene or the screen, and all
// the words live in src/data/roles.en.json (matched to these ids), so a new role is mostly data.

export const ROLE_IDS = ['fisher', 'shack', 'household', 'nursery', 'panchayat'] as const;
export type RoleId = (typeof ROLE_IDS)[number];

/** The four shared meters (plan 2.3). */
export const METER_IDS = ['shoreBuffer', 'fishStock', 'cleanCoast', 'coolness'] as const;
export type MeterId = (typeof METER_IDS)[number];

/**
 * What one choice does. `privateGain` is points on the role's own score (negative = it costs the
 * role something). `stewardship` is how much it helps (+) or hurts (-) each shared meter, from -1
 * to +1. M2's simulate() turns stewardship into meter damage; M1 only shows the private score.
 * All the numbers in the role files are placeholders to tune [TUNE], not facts.
 */
export interface Effect {
  privateGain: number;
  stewardship: Partial<Record<MeterId, number>>;
}

// ---- Decisions: one decision is one widget on a role's panel ----
// Every `default` below is the gentle fallback: never shown as selected (Wajid wants the raw,
// unselected feel), but it is what anything the player left unanswered becomes at lock-in or timeout.

/** Which act a decision belongs to. M1 only has Act 1; Act 2 content arrives in M3. */
export type Act = 1 | 2;

interface DecisionBase {
  id: string;
  act: Act;
}

export interface ToggleOption {
  id: string;
  effect: Effect;
}

/** One either/or (or pick-one-of-three) switch inside a toggleSet. */
export interface Toggle {
  id: string;
  /**
   * The gentle option. Never pre-selected on screen (players see nothing chosen), but it is what
   * a toggle nobody picked becomes when the answer is locked in or the timer runs out.
   */
  default: string;
  options: ToggleOption[];
}

/** A few switches on one panel, for example the shack's plates, fish and cooling. */
export interface ToggleSetDecision extends DecisionBase {
  widget: 'toggleSet';
  toggles: Toggle[];
}

/** One slider. The effect grows in a straight line from nothing at `min` to `effectAtMax`. */
export interface SliderDecision extends DecisionBase {
  widget: 'slider';
  min: number;
  max: number;
  step: number;
  default: number;
  effectAtMax: Effect;
}

export interface SplitPart {
  id: string;
  default: number;
  /** The effect if the whole budget went on this line; a share of the budget gets that share of it. */
  effectAtFullBudget: Effect;
}

/**
 * A budget shared across several lines. Money left over is not lost: it counts as savings, which
 * has its own (usually kinder) effect. So every allocation is a trade-off.
 */
export interface SplitDecision extends DecisionBase {
  widget: 'split';
  budget: number;
  step: number;
  parts: SplitPart[];
  unspent: Effect;
}

export interface Card {
  id: string;
  effect: Effect;
}

/** Pick one card from a hand (the panchayat's policy for the act). */
export interface CardDraftDecision extends DecisionBase {
  widget: 'cardDraft';
  cards: Card[];
  default: string;
}

export type Decision = ToggleSetDecision | SliderDecision | SplitDecision | CardDraftDecision;

// ---- Choices: what a player (or a bot) answers ----

export type ChoiceBody =
  | { widget: 'toggleSet'; picks: Record<string, string> } // toggle id -> option id
  | { widget: 'slider'; value: number }
  | { widget: 'split'; shares: Record<string, number> } // part id -> share of the budget
  | { widget: 'cardDraft'; card: string };

export type Choice = ChoiceBody & { decisionId: string };

// ---- A role ----

export interface RoleConfig {
  id: RoleId;
  /** Starting private score, 0 to 100. */
  privateScoreStart: number;
  /**
   * How strongly each shared meter decides this role's score in Act 2 (plan 2.6). Weights sum to 1.
   * Not used until M2.
   */
  exposure: Partial<Record<MeterId, number>>;
  decisions: Decision[];
}
