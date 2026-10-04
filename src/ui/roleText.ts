// The words for each role (src/data/roles.en.json), typed so the UI can look them up by id.
// A test checks the file against the role data, so every key used here exists.
import roleText from '../data/roles.en.json';
import type { RoleId } from '../sim/roles/types';

export interface DecisionText {
  title: string;
  prompt: string;
  /** Labels for the decision's own parts, keyed as in src/sim/roles/labels.ts. */
  labels: Record<string, string>;
}

export interface RoleText {
  label: string;
  /** What the role's private score is called ("Income", "Profit"...). */
  scoreName: string;
  blurb: string;
  decisions: Record<string, DecisionText>;
}

export const ROLE_TEXT: Record<RoleId, RoleText> = roleText;
