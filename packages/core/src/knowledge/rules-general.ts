/**
 * Red-flag rules that apply to every kind of document.
 *
 * Responsibility: signal-driven checks for one-sided arbitration, waived remedies,
 * unilateral changes, data sharing and discretionary refunds. Boundary: these run for
 * every reader because the harm does not depend on which side of the table you sit.
 */
import { type RedFlagRule, signalHit } from './rule-types.js';

export const GENERAL_RULES: readonly RedFlagRule[] = [
  {
    id: 'one-sided-arbitrator',
    kinds: 'all',
    severity: 'high',
    lawId: 'arbitration-unilateral-appointment',
    test: (ctx) =>
      signalHit(ctx, ['one-sided-arbitrator'], {
        title: 'Only the other side picks the arbitrator',
        detail: 'Disputes go to an arbitrator chosen by one party alone. The Supreme Court has held that one party cannot unilaterally appoint a sole arbitrator.',
        suggestion: 'Consider asking for an arbitrator appointed jointly or by an independent institution.',
      }),
  },
  {
    id: 'waiver-of-legal-remedies',
    kinds: 'all',
    severity: 'high',
    lawId: 'contract-act-s28',
    test: (ctx) =>
      signalHit(ctx, ['waiver-of-legal-remedies'], {
        title: 'You give up your right to go to court',
        detail: 'The document asks you to waive legal remedies or not approach any court or authority. Agreements that absolutely bar legal proceedings are generally void.',
        suggestion: 'Consider asking to remove the waiver or limit it to a fair dispute process.',
      }),
  },
  {
    id: 'unilateral-changes',
    kinds: 'all',
    severity: 'medium',
    lawId: 'consumer-protection-unfair-contract',
    test: (ctx) =>
      signalHit(ctx, ['unilateral-changes', 'auto-renewal'], {
        title: 'Terms can change or renew without your say',
        detail: 'The other side can change the terms, or the agreement renews automatically, without your fresh consent. One-sided terms like this can be unfair contract terms under consumer law.',
        suggestion: 'Consider asking for advance written notice of changes and an easy way to opt out.',
      }),
  },
  {
    id: 'data-sharing-third-parties',
    kinds: 'all',
    severity: 'medium',
    lawId: 'dpdp-act-consent',
    test: (ctx) =>
      signalHit(ctx, ['data-sharing-third-parties'], {
        title: 'Your personal data may be shared with others',
        detail: 'The document allows sharing your personal data with third parties. Under the DPDP Act, consent must be free, specific and informed, and you can ask for erasure.',
        suggestion: 'Consider asking which companies receive your data, why, and how to withdraw consent.',
      }),
  },
  {
    id: 'refund-at-discretion',
    kinds: 'all',
    severity: 'medium',
    lawId: 'consumer-protection-unfair-contract',
    test: (ctx) =>
      signalHit(ctx, ['refund-at-discretion', 'no-refund'], {
        title: 'Refunds are at the other side’s discretion',
        detail: 'Whether you get money back is left to the other party’s sole discretion, or refunds are ruled out entirely.',
        suggestion: 'Consider asking for clear refund conditions and a fixed refund timeline in writing.',
      }),
  },
];
