/**
 * Offline explanation templates.
 *
 * Responsibility: plain-English sentences the offline analyser uses in place of model
 * explanations — one per clause category, one per signal, and per-kind checklists.
 * Boundary: copy only; informative wording, never advice.
 */
import type { ClauseCategory, ClauseSignal } from '../domain/clauses.js';
import type { DocumentKind } from '../domain/document-kinds.js';

export const CATEGORY_MEANING: Readonly<Record<ClauseCategory, string>> = {
  parties: 'This clause is about who is signing the agreement and how each side is named in it.',
  payment: 'This clause is about money you pay or receive: how much, when and how.',
  deposit: 'This clause is about the deposit: how much is paid upfront and when it comes back.',
  term: 'This clause is about how long the agreement lasts and when it starts.',
  termination: 'This clause is about how the agreement can end early and what that costs.',
  notice: 'This clause is about how much warning each side must give before acting.',
  renewal: 'This clause is about renewing the agreement and any increase when it renews.',
  penalty: 'This clause is about penalties or extra charges if something is late or broken.',
  interest: 'This clause is about the interest charged and how it is calculated.',
  fees: 'This clause is about fees and charges on top of the main amount.',
  maintenance: 'This clause is about who repairs and maintains things, and who pays for it.',
  liability: 'This clause is about who is responsible if something goes wrong.',
  indemnity: 'This clause is about covering the other side’s losses or legal costs.',
  confidentiality: 'This clause is about keeping information secret.',
  'non-compete': 'This clause limits working with competitors or starting a similar business.',
  'intellectual-property': 'This clause is about who owns the work, ideas or content created.',
  'data-privacy': 'This clause is about how your personal data is collected, used and shared.',
  coverage: 'This clause is about what the policy or service covers.',
  exclusion: 'This clause is about what is NOT covered, or covered only after a waiting period.',
  'dispute-resolution': 'This clause is about how disagreements are settled, for example by arbitration.',
  'governing-law': 'This clause is about which law and which city’s courts apply.',
  other: 'This clause sets out other terms of the agreement.',
};

export const SIGNAL_NOTE: Readonly<Record<ClauseSignal, string>> = {
  'one-sided-termination': 'Only one side can end it easily.',
  'sole-discretion': 'The other side decides on its own.',
  'refund-at-discretion': 'Refunds are up to the other side.',
  'entry-without-notice': 'The landlord can come in without warning.',
  'tenant-structural-repairs': 'You pay even for major repairs.',
  'full-rent-for-lock-in': 'Leaving early can cost the rent for all remaining lock-in months.',
  'unilateral-changes': 'The other side can change terms without asking you.',
  'auto-renewal': 'It renews automatically unless you act.',
  'post-employment-non-compete': 'It restricts your work after you leave.',
  'training-bond': 'Leaving early can mean paying a bond.',
  'one-sided-arbitrator': 'The other side picks who decides disputes.',
  'waiver-of-legal-remedies': 'You give up rights to complain or go to court.',
  'unlimited-liability': 'Your responsibility for losses has no upper limit.',
  'broad-indemnity': 'You may have to cover all of the other side’s losses.',
  'data-sharing-third-parties': 'Your data can be shared with other companies.',
  'penal-interest-compounding': 'Late charges grow on top of each other.',
  'foreclosure-charges': 'Repaying early costs extra.',
  'no-refund': 'Money paid may not come back.',
  'blanket-exclusion': 'Very broad things are excluded from cover.',
};

const COMMON_CHECKS = [
  'Read every page and make sure no page or blank space is left unsigned or unfilled.',
  'Keep a signed copy of every page for yourself.',
];

export const KIND_CHECKLIST: Readonly<Record<DocumentKind, readonly string[]>> = {
  rental: ['Check the deposit refund timeline and allowed deductions.', 'Record the flat’s condition with dated photos before moving in.', 'Confirm who pays maintenance, electricity and society charges.'],
  employment: ['Check the notice period and whether it can be bought out.', 'Confirm the salary break-up (fixed, variable, deductions).', 'Look for any bond or non-compete before accepting.'],
  loan: ['Compare the total repayment, not just the EMI.', 'Check prepayment and foreclosure charges.', 'Ask for the Key Fact Statement with the all-in annual rate.'],
  insurance: ['Note the free-look period end date.', 'List waiting periods and exclusions that matter to you.', 'Disclose existing illnesses honestly in the proposal form.'],
  'online-terms': ['Check what data is collected and who it is shared with.', 'Find how to cancel and delete your account.'],
  'property-purchase': ['Check the RERA registration number of the project.', 'Match the carpet area and possession date with the brochure.'],
  'service-contract': ['Check payment milestones and late-payment terms.', 'Confirm who owns the work once it is paid for.'],
  other: ['Make sure every blank is filled before signing.'],
};

/**
 * Checklist for a kind, followed by the checks that apply to every document.
 * @example
 * checklistFor('rental').length > 2; // true
 */
export function checklistFor(kind: DocumentKind): string[] {
  return [...KIND_CHECKLIST[kind], ...COMMON_CHECKS];
}

/** Whose obligations are whose, per kind: [reader-side words, other-side words]. */
export const OBLIGATION_PARTIES: Readonly<Partial<Record<DocumentKind, readonly [RegExp, RegExp]>>> = {
  rental: [/\b(?:tenant|licensee|lessee)s?\b/i, /\b(?:landlord|licensor|lessor|owner)s?\b/i],
  employment: [/\bemployee\b/i, /\b(?:employer|company)\b/i],
  loan: [/\bborrowers?\b/i, /\b(?:lender|bank)\b/i],
  insurance: [/\b(?:insured|policyholder|proposer)\b/i, /\b(?:insurer|company)\b/i],
  'online-terms': [/\b(?:user|you)\b/i, /\b(?:company|we)\b/i],
  'property-purchase': [/\b(?:allottee|buyer|purchaser)\b/i, /\b(?:promoter|builder|developer)\b/i],
  'service-contract': [/\b(?:service provider|freelancer|consultant|contractor)\b/i, /\bclient\b/i],
};
