import { describe, expect, it } from 'vitest';
import { SCENARIO_IDS } from '../domain/document-kinds.js';
import { compareFacts } from '../engine/compare-facts.js';
import { monthlyEmi, outstandingPrincipal } from '../engine/emi.js';
import { DEFAULT_DAYS_LATE, runScenario } from '../engine/simulate.js';
import { compareOffline } from '../offline/compare-offline.js';
import { scenarioResultSchema } from '../schemas/features.js';

const LOAN = { loanPrincipalInr: 500_000, interestRatePercentAnnual: 10, loanTenureMonths: 60 };

describe('emi', () => {
  it('matches the amortisation identity: EMIs repay principal plus interest exactly', () => {
    const emi = monthlyEmi(LOAN.loanPrincipalInr, LOAN.interestRatePercentAnnual, LOAN.loanTenureMonths);
    expect(outstandingPrincipal(LOAN.loanPrincipalInr, LOAN.interestRatePercentAnnual, LOAN.loanTenureMonths, LOAN.loanTenureMonths)).toBeCloseTo(0, 4);
    expect(emi * LOAN.loanTenureMonths).toBeGreaterThan(LOAN.loanPrincipalInr);
  });

  it('divides evenly at 0% interest', () => {
    expect(monthlyEmi(120_000, 0, 12)).toBe(10_000);
    expect(outstandingPrincipal(120_000, 0, 12, 3)).toBe(90_000);
  });

  it('returns 0 for a non-positive tenure or principal', () => {
    expect(monthlyEmi(100_000, 10, 0)).toBe(0);
    expect(monthlyEmi(0, 10, 12)).toBe(0);
  });

  it('outstanding principal falls as months are paid', () => {
    const after12 = outstandingPrincipal(LOAN.loanPrincipalInr, 10, 60, 12);
    const after24 = outstandingPrincipal(LOAN.loanPrincipalInr, 10, 60, 24);
    expect(after24).toBeLessThan(after12);
    expect(after12).toBeLessThan(LOAN.loanPrincipalInr);
  });
});

describe('runScenario', () => {
  it('rental-leave-early charges rent for the remaining lock-in', () => {
    const facts = { monthlyRentInr: 20_000, lockInMonths: 6 };
    const result = runScenario('rental-leave-early', facts, { monthsCompleted: 2 });
    expect(result.ok && result.value.totalInr).toBe(facts.monthlyRentInr * (facts.lockInMonths - 2));
  });

  it('rental-leave-early adds notice rent once the lock-in is over', () => {
    const facts = { monthlyRentInr: 30_000, lockInMonths: 6, tenantNoticeDays: 30 };
    const result = runScenario('rental-leave-early', facts, { monthsCompleted: 8 });
    expect(result.ok && result.value.totalInr).toBe(facts.monthlyRentInr);
  });

  it('rental-late-rent uses the default days late when none given', () => {
    const result = runScenario('rental-late-rent', { lateFeePerDayInr: 100, monthlyRentInr: 20_000 }, {});
    expect(result.ok && result.value.totalInr).toBe(100 * DEFAULT_DAYS_LATE);
  });

  it('employment-resign charges unserved notice and the bond', () => {
    const facts = { monthlySalaryInr: 60_000, employeeNoticeDays: 90, trainingBondInr: 100_000 };
    const result = runScenario('employment-resign', facts, { noticeServedDays: 30 });
    expect(result.ok && result.value.totalInr).toBe(Math.round((facts.monthlySalaryInr * 60) / 30) + facts.trainingBondInr);
  });

  it('loan-total-cost equals EMI times tenure plus the processing fee', () => {
    const facts = { ...LOAN, processingFeePercent: 1 };
    const emi = monthlyEmi(facts.loanPrincipalInr, facts.interestRatePercentAnnual, facts.loanTenureMonths);
    const result = runScenario('loan-total-cost', facts, {});
    const expected = Math.round(facts.loanPrincipalInr) + Math.round(emi * facts.loanTenureMonths - facts.loanPrincipalInr) + Math.round(facts.loanPrincipalInr * 0.01);
    expect(result.ok && result.value.totalInr).toBe(expected);
  });

  it('loan-prepay charges the penalty on a fixed-rate loan', () => {
    const facts = { ...LOAN, prepaymentPenaltyPercent: 2, isFloatingRate: false };
    const outstanding = outstandingPrincipal(LOAN.loanPrincipalInr, 10, 60, 12);
    const result = runScenario('loan-prepay', facts, { monthsCompleted: 12 });
    expect(result.ok && result.value.totalInr).toBe(Math.round(outstanding) + Math.round((outstanding * 2) / 100));
  });

  it('loan-prepay charges nothing extra on a floating-rate loan', () => {
    const facts = { ...LOAN, prepaymentPenaltyPercent: 2, isFloatingRate: true };
    const result = runScenario('loan-prepay', facts, { monthsCompleted: 12, prepayAmountInr: 100_000 });
    expect(result.ok && result.value.lines[1]?.amountInr).toBe(0);
  });

  it('insurance-cancel-free-look refunds the premium', () => {
    const result = runScenario('insurance-cancel-free-look', { annualPremiumInr: 15_000, freeLookDays: 30 }, {});
    expect(result.ok && result.value.totalInr).toBe(15_000);
  });

  it.each(SCENARIO_IDS)('%s fails with VALIDATION_FAILED when facts are missing', (id) => {
    const result = runScenario(id, {}, {});
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe('VALIDATION_FAILED');
    expect(!result.ok && result.error.message).toMatch(/does not state/);
  });

  it('every successful result satisfies the wire schema', () => {
    const facts = { ...LOAN, monthlyRentInr: 10_000, lockInMonths: 3, lateFeePerDayInr: 50, monthlySalaryInr: 40_000, employeeNoticeDays: 30, annualPremiumInr: 9_000, freeLookDays: 30 };
    for (const id of SCENARIO_IDS) {
      const result = runScenario(id, facts, {});
      expect(result.ok && scenarioResultSchema.safeParse(result.value).success).toBe(true);
    }
  });
});

describe('compareFacts', () => {
  it('judges lower deposits better for the tenant', () => {
    const [delta] = compareFacts('rental', 'tenant', { securityDepositInr: 100_000 }, { securityDepositInr: 50_000 });
    expect(delta).toMatchObject({ key: 'securityDepositInr', first: 100_000, second: 50_000, betterFor: 'second' });
  });

  it('flips the direction for the landlord', () => {
    const [delta] = compareFacts('rental', 'landlord', { securityDepositInr: 100_000 }, { securityDepositInr: 50_000 });
    expect(delta?.betterFor).toBe('first');
  });

  it('judges higher values better when betterWhen is higher', () => {
    const [delta] = compareFacts('insurance', 'policyholder', { freeLookDays: 15 }, { freeLookDays: 30 });
    expect(delta?.betterFor).toBe('second');
  });

  it('reports equal, unknown (one side missing) and neutral facts', () => {
    const deltas = compareFacts('loan', 'borrower', { interestRatePercentAnnual: 10, loanTenureMonths: 60, loanPrincipalInr: 1 }, { interestRatePercentAnnual: 10, loanTenureMonths: 72 });
    const byKey = new Map(deltas.map((delta) => [delta.key, delta.betterFor]));
    expect(byKey.get('interestRatePercentAnnual')).toBe('equal');
    expect(byKey.get('loanTenureMonths')).toBe('unknown');
    expect(byKey.get('loanPrincipalInr')).toBe('unknown');
  });

  it('omits facts neither draft states', () => {
    expect(compareFacts('rental', 'tenant', {}, {})).toEqual([]);
  });

  it('compareOffline summarises differing deltas', () => {
    const deltas = compareFacts('rental', 'tenant', { securityDepositInr: 100_000, monthlyRentInr: 20_000 }, { securityDepositInr: 50_000, monthlyRentInr: 20_000 });
    const output = compareOffline(deltas);
    expect(output.changes).toHaveLength(1);
    expect(output.changes[0]?.favours).toBe('second');
    expect(output.verdict).toMatch(/second/);
    expect(compareOffline([]).verdict).toMatch(/neither/);
  });
});
