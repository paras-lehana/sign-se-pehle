/**
 * Free legal aid screening under section 12 of the Legal Services Authorities Act, 1987.
 *
 * Responsibility: say whether a reader generally falls in a category entitled to free legal
 * services, naming the clause of section 12 that applies. Boundary: a screening aid run in the
 * browser (answers never leave the device); the Legal Services Authority makes the decision.
 */
import { formatInr } from '../format.js';
import { LAWS } from '../knowledge/laws.js';
import type { LawReference } from '../schemas/analysis.js';
import type { EligibilityRequest } from '../schemas/requests.js';

export type EligibilityStatus = 'eligible' | 'likely' | 'check-with-dlsa';

export interface EligibilityResult {
  readonly status: EligibilityStatus;
  readonly reasons: readonly string[];
  readonly law: LawReference;
}

/**
 * Income ceiling many states set under section 12(h) (many states; limits differ). Used only
 * to say "likely"; the reader's own state limit decides.
 */
export const COMMON_STATE_INCOME_LIMIT_INR = 300_000;

type CategoryKey = Exclude<keyof EligibilityRequest, 'annualIncomeInr'>;

/**
 * Section 12 category → the reason shown to the reader, in the Act's clause order. Keyed by the
 * request's yes/no answers, so a new category in the schema must be explained here.
 */
const CATEGORY_REASONS: Readonly<Record<CategoryKey, string>> = {
  isScheduledCasteOrTribe: 'Members of a Scheduled Caste or Scheduled Tribe are covered by section 12(a).',
  isVictimOfTraffickingOrBegar: 'Victims of human trafficking or begar (forced labour) are covered by section 12(b).',
  isWoman: 'Women are covered by section 12(c), whatever their income.',
  isChild: 'Children are covered by section 12(c).',
  hasDisability: 'Persons with disabilities are covered by section 12(d).',
  isVictimOfDisasterOrViolence:
    'Victims of a mass disaster, ethnic violence, caste atrocity, flood, drought, earthquake or industrial disaster are covered by section 12(e).',
  isIndustrialWorkman: 'Industrial workmen are covered by section 12(f).',
  isInCustody: 'Persons in custody, including a protective home, juvenile home or psychiatric hospital, are covered by section 12(g).',
};

const CATEGORY_KEYS = Object.keys(CATEGORY_REASONS).filter((key): key is CategoryKey => key in CATEGORY_REASONS);

function incomeReason(income: number | undefined): string {
  const limit = formatInr(COMMON_STATE_INCOME_LIMIT_INR);
  if (income === undefined) {
    return `None of the listed categories apply and no income was given. Under section 12(h), people below their state's income limit (often ${limit} a year) also qualify; the District Legal Services Authority can confirm yours.`;
  }
  if (income <= COMMON_STATE_INCOME_LIMIT_INR) {
    return `Your annual income of ${formatInr(income)} is within ${limit}, the limit many states set under section 12(h). Limits differ by state, so the District Legal Services Authority will confirm.`;
  }
  return `Your annual income of ${formatInr(income)} is above ${limit}, the limit many states set under section 12(h). Some states set higher limits, so the District Legal Services Authority can tell you yours.`;
}

/**
 * Screens free legal aid eligibility. Any section 12 category → eligible; otherwise an income
 * within the common state limit → likely; otherwise check with the District Legal Services Authority.
 * @example
 * checkLegalAidEligibility({ isWoman: true, isChild: false, isScheduledCasteOrTribe: false, hasDisability: false, isIndustrialWorkman: false, isInCustody: false, isVictimOfTraffickingOrBegar: false, isVictimOfDisasterOrViolence: false }).status; // 'eligible'
 */
export function checkLegalAidEligibility(input: EligibilityRequest): EligibilityResult {
  const law = LAWS['lsa-act-s12'];
  const reasons = CATEGORY_KEYS.filter((key) => input[key]).map((key) => CATEGORY_REASONS[key]);
  if (reasons.length > 0) return { status: 'eligible', reasons, law };
  const income = input.annualIncomeInr;
  const status = income !== undefined && income <= COMMON_STATE_INCOME_LIMIT_INR ? 'likely' : 'check-with-dlsa';
  return { status, reasons: [incomeReason(income)], law };
}
