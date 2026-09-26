import { describe, expect, it } from 'vitest';
import { computeMoneyAtStake } from '../engine/money.js';
import { BALANCED_MIN, CLAUSE_PENALTY, computeScore, FLAG_PENALTY, REVIEW_MIN, scoreBand } from '../engine/score.js';
import type { RedFlag } from '../schemas/analysis.js';
import { makeClause } from './fixtures.js';

function flag(severity: RedFlag['severity'], clauseIds: string[] = [], title = `A ${severity} flag`): RedFlag {
  return { ruleId: `r-${severity}`, severity, title, detail: 'd', suggestion: 's', clauseIds };
}

describe('computeScore', () => {
  it('starts at 100 and is balanced with nothing to report', () => {
    const score = computeScore([], []);
    expect(score.value).toBe(100);
    expect(score.band).toBe('balanced');
    expect(score.reasons.length).toBe(1);
  });

  it('subtracts the named penalty for each flag severity', () => {
    const flags = [flag('high'), flag('medium'), flag('low')];
    expect(computeScore(flags, []).value).toBe(100 - FLAG_PENALTY.high - FLAG_PENALTY.medium - FLAG_PENALTY.low);
  });

  it('penalises risky clauses not already covered by a flag', () => {
    const clauses = [makeClause({ id: 'c1', risk: 'high' }), makeClause({ id: 'c2', risk: 'medium' })];
    expect(computeScore([flag('low', ['c1'])], clauses).value).toBe(100 - FLAG_PENALTY.low - CLAUSE_PENALTY.medium);
  });

  it('clamps at zero', () => {
    const flags = Array.from({ length: 10 }, () => flag('high'));
    expect(computeScore(flags, []).value).toBe(0);
    expect(computeScore(flags, []).band).toBe('high-risk');
  });

  it('lists flag titles as reasons, most severe first as given', () => {
    const flags = [flag('high', [], 'First'), flag('medium', [], 'Second')];
    expect(computeScore(flags, []).reasons.slice(0, 2)).toEqual(['First', 'Second']);
  });

  it('mentions uncovered risky clauses in the reasons', () => {
    const reasons = computeScore([], [makeClause({ risk: 'high' })]).reasons;
    expect(reasons.join(' ')).toContain('1 more clause');
  });

  it.each([
    [BALANCED_MIN, 'balanced'],
    [BALANCED_MIN - 1, 'review'],
    [REVIEW_MIN, 'review'],
    [REVIEW_MIN - 1, 'high-risk'],
  ] as const)('scoreBand(%i) is %s', (value, band) => {
    expect(scoreBand(value)).toBe(band);
  });
});

describe('computeMoneyAtStake', () => {
  it('adds deposit and lock-in exposure for rentals', () => {
    const facts = { securityDepositInr: 100_000, monthlyRentInr: 20_000, lockInMonths: 6 };
    const money = computeMoneyAtStake('rental', facts);
    expect(money.items.map((item) => item.amountInr)).toEqual([facts.securityDepositInr, facts.monthlyRentInr * facts.lockInMonths]);
    expect(money.totalInr).toBe(facts.securityDepositInr + facts.monthlyRentInr * facts.lockInMonths);
  });

  it('only includes items whose facts exist', () => {
    expect(computeMoneyAtStake('rental', { monthlyRentInr: 20_000 }).items).toEqual([]);
  });

  it('ignores facts that belong to another kind', () => {
    expect(computeMoneyAtStake('loan', { securityDepositInr: 50_000 }).totalInr).toBe(0);
  });

  it('computes loan charges as a percentage of principal', () => {
    const facts = { loanPrincipalInr: 500_000, processingFeePercent: 2, prepaymentPenaltyPercent: 4 };
    const money = computeMoneyAtStake('loan', facts);
    expect(money.totalInr).toBe((facts.loanPrincipalInr * (facts.processingFeePercent + facts.prepaymentPenaltyPercent)) / 100);
  });

  it('lists bond, booking amount and premium for their kinds', () => {
    expect(computeMoneyAtStake('employment', { trainingBondInr: 75_000 }).totalInr).toBe(75_000);
    expect(computeMoneyAtStake('property-purchase', { bookingAmountInr: 300_000 }).totalInr).toBe(300_000);
    expect(computeMoneyAtStake('insurance', { annualPremiumInr: 18_000 }).totalInr).toBe(18_000);
  });
});
