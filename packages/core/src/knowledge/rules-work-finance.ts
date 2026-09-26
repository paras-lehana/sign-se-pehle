/**
 * Red-flag rules for jobs, loans, insurance and property purchases.
 *
 * Responsibility: employee, borrower, policyholder and buyer-side checks anchored to
 * the Contract Act, RBI, IRDAI and RERA entries in laws.ts, plus the notice-asymmetry
 * check shared by rentals and jobs. Boundary: facts and signals in, hedged copy out.
 */
import type { DocumentFacts, NumericFactKey } from '../schemas/facts.js';
import { formatDays, formatInr, formatMonths, formatPercent } from '../format.js';
import { clauseIdsInCategory, clauseIdsWithSignal, type RedFlagRule, type RuleContext, signalHit } from './rule-types.js';

/** Notice periods more than double the other side's are flagged as one-sided. */
const NOTICE_ASYMMETRY_FACTOR = 2;
/** 90 days is the longest notice common in Indian private-sector offer letters. */
const MAX_EMPLOYEE_NOTICE_DAYS = 90;
/** IRDAI 2024: new life and health policies get a 30-day free-look period. */
const MIN_FREE_LOOK_DAYS = 30;
/** IRDAI 2024 health master circular: pre-existing disease waiting capped at 36 months. */
const MAX_PRE_EXISTING_WAITING_MONTHS = 36;
/** RERA s.13: at most 10% of the cost before a registered agreement for sale. */
const MAX_BOOKING_SHARE = 0.1;
const PERCENT = 100;

interface NoticePair {
  readonly yours: NumericFactKey;
  readonly theirs: NumericFactKey;
}

const NOTICE_FACTS: Readonly<Partial<Record<RuleContext['kind'], NoticePair>>> = {
  rental: { yours: 'tenantNoticeDays', theirs: 'landlordNoticeDays' },
  employment: { yours: 'employeeNoticeDays', theirs: 'employerNoticeDays' },
};

function noticeDays(facts: DocumentFacts, key: NumericFactKey): number | undefined {
  return facts[key];
}

export const WORK_FINANCE_RULES: readonly RedFlagRule[] = [
  {
    id: 'notice-asymmetry',
    kinds: ['rental', 'employment'],
    severity: 'medium',
    test: (ctx) => {
      const pair = NOTICE_FACTS[ctx.kind];
      if (pair === undefined) return null;
      const yours = noticeDays(ctx.facts, pair.yours);
      const theirs = noticeDays(ctx.facts, pair.theirs);
      if (yours === undefined || theirs === undefined || yours <= theirs * NOTICE_ASYMMETRY_FACTOR) return null;
      return {
        title: 'You must give much longer notice than the other side',
        detail: `You must give ${formatDays(yours)} of notice, but the other side needs to give only ${formatDays(theirs)}.`,
        suggestion: 'Consider asking for equal notice periods for both sides.',
        clauseIds: clauseIdsInCategory(ctx, 'notice', 'termination'),
      };
    },
  },
  {
    id: 'employment-non-compete',
    kinds: ['employment'],
    severity: 'high',
    lawId: 'contract-act-s27',
    test: (ctx) => {
      const months = ctx.facts.nonCompeteMonths ?? 0;
      const signalled = clauseIdsWithSignal(ctx, 'post-employment-non-compete');
      if (months <= 0 && signalled.length === 0) return null;
      const clauseIds = [...new Set([...signalled, ...clauseIdsInCategory(ctx, 'non-compete')])];
      const span = months > 0 ? ` for ${formatMonths(months)}` : '';
      return {
        title: 'Non-compete after you leave the job',
        detail: `The contract stops you from working for competitors or in the same field${span} after leaving. Courts have generally held such post-employment restraints void.`,
        suggestion: 'Consider asking to limit it to not using confidential information or poaching clients.',
        clauseIds,
      };
    },
  },
  {
    id: 'employment-training-bond',
    kinds: ['employment'],
    severity: 'medium',
    lawId: 'contract-act-s74',
    test: (ctx) => {
      const bond = ctx.facts.trainingBondInr ?? 0;
      const signalled = clauseIdsWithSignal(ctx, 'training-bond');
      if (bond <= 0 && signalled.length === 0) return null;
      const amount = bond > 0 ? ` of ${formatInr(bond)}` : '';
      return {
        title: 'Training or service bond',
        detail: `Leaving early may require paying a bond${amount}. Courts generally allow recovery of actual, reasonable training costs rather than the full figure.`,
        suggestion: 'Consider asking how the amount was calculated and whether it reduces month by month.',
        clauseIds: signalled,
      };
    },
  },
  {
    id: 'employment-long-notice',
    kinds: ['employment'],
    severity: 'medium',
    test: (ctx) => {
      const days = ctx.facts.employeeNoticeDays;
      if (days === undefined || days <= MAX_EMPLOYEE_NOTICE_DAYS) return null;
      return {
        title: `Notice period of ${formatDays(days)} is long`,
        detail: `You must serve ${formatDays(days)} of notice before leaving, longer than the ${formatDays(MAX_EMPLOYEE_NOTICE_DAYS)} common in Indian offer letters.`,
        suggestion: 'Consider asking whether notice can be bought out or shortened by mutual agreement.',
        clauseIds: clauseIdsInCategory(ctx, 'notice', 'termination'),
      };
    },
  },
  {
    id: 'loan-floating-prepayment-charge',
    kinds: ['loan'],
    severity: 'high',
    lawId: 'rbi-foreclosure-floating',
    test: (ctx) => {
      const penalty = ctx.facts.prepaymentPenaltyPercent ?? 0;
      const signalled = clauseIdsWithSignal(ctx, 'foreclosure-charges');
      if (ctx.facts.isFloatingRate !== true || (penalty <= 0 && signalled.length === 0)) return null;
      const rate = penalty > 0 ? ` of ${formatPercent(penalty)}` : '';
      return {
        title: 'Prepayment charge on a floating-rate loan',
        detail: `This floating-rate loan charges a prepayment or foreclosure fee${rate}. RBI directs lenders not to levy such charges on floating-rate loans to individuals for non-business purposes.`,
        suggestion: 'Consider asking the lender to confirm in writing that no foreclosure charge applies.',
        clauseIds: [...new Set([...signalled, ...clauseIdsInCategory(ctx, 'fees')])],
      };
    },
  },
  {
    id: 'loan-penal-interest-compounding',
    kinds: ['loan'],
    severity: 'high',
    lawId: 'rbi-penal-charges',
    test: (ctx) =>
      signalHit(ctx, ['penal-interest-compounding'], {
        title: 'Penal interest is compounded or added to the loan',
        detail: 'Late-payment charges are added to the interest rate or compounded. RBI’s 2023 penal charges rules say penal charges must not be capitalised or compounded.',
        suggestion: 'Consider asking for penal charges to be shown as a flat, separate fee.',
      }),
  },
  {
    id: 'insurance-short-free-look',
    kinds: ['insurance'],
    severity: 'medium',
    lawId: 'irdai-free-look',
    test: (ctx) => {
      const days = ctx.facts.freeLookDays;
      if (days === undefined || days >= MIN_FREE_LOOK_DAYS) return null;
      return {
        title: `Free-look period is only ${formatDays(days)}`,
        detail: `You get ${formatDays(days)} to cancel for a refund. IRDAI generally provides ${formatDays(MIN_FREE_LOOK_DAYS)} for new life and health policies.`,
        suggestion: 'Consider asking the insurer to confirm the free-look period in writing.',
        clauseIds: clauseIdsInCategory(ctx, 'termination', 'coverage'),
      };
    },
  },
  {
    id: 'insurance-long-pre-existing-wait',
    kinds: ['insurance'],
    severity: 'high',
    lawId: 'irdai-pre-existing-waiting',
    test: (ctx) => {
      const months = ctx.facts.preExistingWaitingMonths;
      if (months === undefined || months <= MAX_PRE_EXISTING_WAITING_MONTHS) return null;
      return {
        title: 'Long wait before existing illnesses are covered',
        detail: `Existing illnesses are covered only after ${formatMonths(months)}. IRDAI’s 2024 rules generally cap this at ${formatMonths(MAX_PRE_EXISTING_WAITING_MONTHS)}.`,
        suggestion: 'Consider asking whether a shorter waiting-period option is available.',
        clauseIds: clauseIdsInCategory(ctx, 'exclusion', 'coverage'),
      };
    },
  },
  {
    id: 'property-booking-over-cap',
    kinds: ['property-purchase'],
    severity: 'high',
    lawId: 'rera-s13',
    test: (ctx) => {
      const { bookingAmountInr: booking, totalConsiderationInr: total } = ctx.facts;
      if (booking === undefined || total === undefined || total <= 0 || booking <= total * MAX_BOOKING_SHARE) return null;
      return {
        title: 'Booking amount is more than 10% of the price',
        detail: `The booking amount is ${formatInr(booking)}, which is ${formatPercent((booking / total) * PERCENT)} of the ${formatInr(total)} price. RERA limits advances to 10% before a registered agreement for sale.`,
        suggestion: 'Consider asking for the agreement for sale to be registered before paying more than 10%.',
        clauseIds: clauseIdsInCategory(ctx, 'payment'),
      };
    },
  },
];
