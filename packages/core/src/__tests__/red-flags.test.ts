import { describe, expect, it } from 'vitest';
import type { ClauseSignal } from '../domain/clauses.js';
import type { DocumentKind, UserRole } from '../domain/document-kinds.js';
import { KIND_PROFILES } from '../domain/document-kinds.js';
import { evaluateRedFlags, ruleApplies } from '../engine/red-flags.js';
import { LAWS, LAW_IDS } from '../knowledge/laws.js';
import { RED_FLAG_RULES } from '../knowledge/red-flag-rules.js';
import type { RuleContext } from '../knowledge/rule-types.js';
import { lawReferenceSchema, redFlagSchema } from '../schemas/analysis.js';
import type { DocumentFacts } from '../schemas/facts.js';
import { makeClause } from './fixtures.js';

function ctx(kind: DocumentKind, facts: DocumentFacts, signals: ClauseSignal[] = [], role?: UserRole): RuleContext {
  return {
    kind,
    role: role ?? KIND_PROFILES[kind].defaultRole,
    facts,
    clauses: signals.length === 0 ? [] : [makeClause({ id: 'c7', signals })],
  };
}

function ids(context: RuleContext): string[] {
  return evaluateRedFlags(context).map((flag) => flag.ruleId);
}

interface Case {
  readonly rule: string;
  readonly fires: RuleContext;
  readonly quiet: RuleContext;
}

const CASES: readonly Case[] = [
  { rule: 'rental-deposit-over-cap', fires: ctx('rental', { monthlyRentInr: 20_000, securityDepositInr: 60_000 }), quiet: ctx('rental', { monthlyRentInr: 20_000, securityDepositInr: 40_000 }) },
  { rule: 'rental-entry-without-notice', fires: ctx('rental', {}, ['entry-without-notice']), quiet: ctx('rental', {}) },
  { rule: 'rental-tenant-structural-repairs', fires: ctx('rental', {}, ['tenant-structural-repairs']), quiet: ctx('rental', {}) },
  { rule: 'rental-full-rent-for-lock-in', fires: ctx('rental', {}, ['full-rent-for-lock-in']), quiet: ctx('rental', { lockInMonths: 6 }) },
  { rule: 'notice-asymmetry', fires: ctx('rental', { tenantNoticeDays: 90, landlordNoticeDays: 30 }), quiet: ctx('rental', { tenantNoticeDays: 60, landlordNoticeDays: 30 }) },
  { rule: 'rental-high-escalation', fires: ctx('rental', { rentEscalationPercent: 12 }), quiet: ctx('rental', { rentEscalationPercent: 10 }) },
  { rule: 'rental-registration-needed', fires: ctx('rental', { agreementTermMonths: 12 }), quiet: ctx('rental', { agreementTermMonths: 11 }) },
  { rule: 'rental-late-fee-excessive', fires: ctx('rental', { lateFeePerDayInr: 100, monthlyRentInr: 20_000 }), quiet: ctx('rental', { lateFeePerDayInr: 50, monthlyRentInr: 20_000 }) },
  { rule: 'employment-non-compete', fires: ctx('employment', { nonCompeteMonths: 12 }), quiet: ctx('employment', { nonCompeteMonths: 0 }) },
  { rule: 'employment-training-bond', fires: ctx('employment', { trainingBondInr: 200_000 }), quiet: ctx('employment', {}) },
  { rule: 'employment-long-notice', fires: ctx('employment', { employeeNoticeDays: 120 }), quiet: ctx('employment', { employeeNoticeDays: 90 }) },
  { rule: 'loan-floating-prepayment-charge', fires: ctx('loan', { isFloatingRate: true, prepaymentPenaltyPercent: 2 }), quiet: ctx('loan', { isFloatingRate: false, prepaymentPenaltyPercent: 2 }) },
  { rule: 'loan-penal-interest-compounding', fires: ctx('loan', {}, ['penal-interest-compounding']), quiet: ctx('loan', {}) },
  { rule: 'insurance-short-free-look', fires: ctx('insurance', { freeLookDays: 15 }), quiet: ctx('insurance', { freeLookDays: 30 }) },
  { rule: 'insurance-long-pre-existing-wait', fires: ctx('insurance', { preExistingWaitingMonths: 48 }), quiet: ctx('insurance', { preExistingWaitingMonths: 36 }) },
  { rule: 'property-booking-over-cap', fires: ctx('property-purchase', { bookingAmountInr: 1_500_000, totalConsiderationInr: 10_000_000 }), quiet: ctx('property-purchase', { bookingAmountInr: 1_000_000, totalConsiderationInr: 10_000_000 }) },
  { rule: 'one-sided-arbitrator', fires: ctx('other', {}, ['one-sided-arbitrator']), quiet: ctx('other', {}) },
  { rule: 'waiver-of-legal-remedies', fires: ctx('online-terms', {}, ['waiver-of-legal-remedies']), quiet: ctx('online-terms', {}) },
  { rule: 'unilateral-changes', fires: ctx('online-terms', {}, ['auto-renewal']), quiet: ctx('online-terms', {}) },
  { rule: 'data-sharing-third-parties', fires: ctx('online-terms', {}, ['data-sharing-third-parties']), quiet: ctx('online-terms', {}) },
  { rule: 'refund-at-discretion', fires: ctx('service-contract', {}, ['refund-at-discretion']), quiet: ctx('service-contract', {}) },
];

describe('red-flag rules', () => {
  it.each(CASES)('$rule fires when its condition holds', ({ rule, fires }) => {
    expect(ids(fires)).toContain(rule);
  });

  it.each(CASES)('$rule stays quiet when its condition does not hold', ({ rule, quiet }) => {
    expect(ids(quiet)).not.toContain(rule);
  });

  it('covers every rule in the table with a case', () => {
    expect(new Set(CASES.map((entry) => entry.rule))).toEqual(new Set(RED_FLAG_RULES.map((rule) => rule.id)));
  });

  it('has unique rule ids', () => {
    expect(new Set(RED_FLAG_RULES.map((rule) => rule.id)).size).toBe(RED_FLAG_RULES.length);
  });

  it('produces flags that satisfy the wire schema', () => {
    for (const { fires } of CASES) {
      for (const flag of evaluateRedFlags(fires)) expect(redFlagSchema.safeParse(flag).success).toBe(true);
    }
  });

  it('attaches the curated law for rules that name one', () => {
    const [flag] = evaluateRedFlags(ctx('insurance', { freeLookDays: 10 }));
    expect(flag?.law).toEqual(LAWS['irdai-free-look']);
  });

  it('interpolates the document numbers into the detail', () => {
    const [flag] = evaluateRedFlags(ctx('rental', { monthlyRentInr: 20_000, securityDepositInr: 200_000 }));
    expect(flag?.detail).toContain('2,00,000');
  });

  it('skips kind rules for the stronger role but keeps all-kind rules', () => {
    const landlord = ctx('rental', { monthlyRentInr: 10_000, securityDepositInr: 100_000 }, ['one-sided-arbitrator'], 'landlord');
    expect(ids(landlord)).toEqual(['one-sided-arbitrator']);
  });

  it('ruleApplies rejects rules for a different kind', () => {
    const depositRule = RED_FLAG_RULES.find((rule) => rule.id === 'rental-deposit-over-cap');
    expect(depositRule === undefined ? true : ruleApplies(depositRule, ctx('loan', {}))).toBe(false);
  });

  it('sorts flags by severity, most severe first', () => {
    const flags = evaluateRedFlags(ctx('rental', { agreementTermMonths: 24, rentEscalationPercent: 20, monthlyRentInr: 10_000, securityDepositInr: 90_000 }));
    const order = flags.map((flag) => flag.severity);
    expect(order).toEqual([...order].sort((a, b) => ['high', 'medium', 'low'].indexOf(a) - ['high', 'medium', 'low'].indexOf(b)));
  });

  it('points signal flags at the clauses carrying the signal', () => {
    const [flag] = evaluateRedFlags(ctx('rental', {}, ['entry-without-notice']));
    expect(flag?.clauseIds).toEqual(['c7']);
  });
});

describe('laws', () => {
  it.each(LAW_IDS)('%s has a matching id, a valid shape and an official URL', (id) => {
    const law = LAWS[id];
    expect(law.id).toBe(id);
    expect(lawReferenceSchema.safeParse(law).success).toBe(true);
    expect(new URL(law.url).hostname).toMatch(/(indiacode\.nic\.in|mohua\.gov\.in|rbi\.org\.in|irdai\.gov\.in|nalsa\.gov\.in|sci\.gov\.in|meity\.gov\.in)$/);
  });
});
