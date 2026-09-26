/**
 * The full red-flag rule table.
 *
 * Responsibility: one ordered list of every deterministic rule, grouped by domain
 * files so each stays small. Boundary: adding a rule means adding it to a domain file;
 * the engine (engine/red-flags.ts) never special-cases a rule id.
 */
import type { RedFlagRule } from './rule-types.js';
import { GENERAL_RULES } from './rules-general.js';
import { RENTAL_RULES } from './rules-rental.js';
import { WORK_FINANCE_RULES } from './rules-work-finance.js';

export type { RedFlagRule, RuleContext, RuleHit } from './rule-types.js';

export const RED_FLAG_RULES: readonly RedFlagRule[] = [...RENTAL_RULES, ...WORK_FINANCE_RULES, ...GENERAL_RULES];
