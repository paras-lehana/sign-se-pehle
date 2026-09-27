import { describe, expect, it } from 'vitest';
import { checkLegalAidEligibility, COMMON_STATE_INCOME_LIMIT_INR } from '../engine/eligibility.js';
import { formatInr } from '../format.js';
import { LAWS } from '../knowledge/laws.js';
import { type EligibilityRequest, eligibilityRequestSchema } from '../schemas/requests.js';

/** No category ticked; parsed so a new schema field without a default fails here first. */
const NONE: EligibilityRequest = eligibilityRequestSchema.parse({
  isWoman: false,
  isChild: false,
  isScheduledCasteOrTribe: false,
  hasDisability: false,
  isIndustrialWorkman: false,
  isInCustody: false,
  isVictimOfTraffickingOrBegar: false,
  isVictimOfDisasterOrViolence: false,
});

const CATEGORY_CLAUSES = [
  ['isScheduledCasteOrTribe', '12(a)'],
  ['isVictimOfTraffickingOrBegar', '12(b)'],
  ['isWoman', '12(c)'],
  ['isChild', '12(c)'],
  ['hasDisability', '12(d)'],
  ['isVictimOfDisasterOrViolence', '12(e)'],
  ['isIndustrialWorkman', '12(f)'],
  ['isInCustody', '12(g)'],
] as const;

describe('checkLegalAidEligibility', () => {
  it.each(CATEGORY_CLAUSES)('%s alone makes a reader eligible under section %s', (key, clause) => {
    const result = checkLegalAidEligibility({ ...NONE, [key]: true });
    expect(result.status).toBe('eligible');
    expect(result.reasons).toHaveLength(1);
    expect(result.reasons[0]).toContain(`section ${clause}`);
    expect(result.law).toEqual(LAWS['lsa-act-s12']);
  });

  it('lists every matching category in the order of the Act, ignoring income', () => {
    const result = checkLegalAidEligibility({ ...NONE, isWoman: true, isScheduledCasteOrTribe: true, annualIncomeInr: 10 * COMMON_STATE_INCOME_LIMIT_INR });
    expect(result.status).toBe('eligible');
    expect(result.reasons.map((reason) => /12\((\w)\)/.exec(reason)?.[1])).toEqual(['a', 'c']);
  });

  it('is likely for an income at or below the common state limit', () => {
    for (const income of [0, COMMON_STATE_INCOME_LIMIT_INR - 1, COMMON_STATE_INCOME_LIMIT_INR]) {
      const result = checkLegalAidEligibility({ ...NONE, annualIncomeInr: income });
      expect(result.status).toBe('likely');
      expect(result.reasons[0]).toContain(formatInr(COMMON_STATE_INCOME_LIMIT_INR));
      expect(result.reasons[0]).toContain('12(h)');
    }
  });

  it('points to the District Legal Services Authority above the limit or without an income', () => {
    const above = checkLegalAidEligibility({ ...NONE, annualIncomeInr: COMMON_STATE_INCOME_LIMIT_INR + 1 });
    const unknown = checkLegalAidEligibility(NONE);
    expect(above.status).toBe('check-with-dlsa');
    expect(unknown.status).toBe('check-with-dlsa');
    expect(above.reasons[0]).toContain(formatInr(COMMON_STATE_INCOME_LIMIT_INR + 1));
    expect(unknown.reasons[0]).not.toBe(above.reasons[0]);
    for (const result of [above, unknown]) expect(result.reasons[0]).toContain('District Legal Services Authority');
  });
});
