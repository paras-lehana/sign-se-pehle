/**
 * Plain-language glossary of the legal terms Indian agreements use most.
 *
 * Responsibility: one curated list of terms with short, hedged meanings, plus a matcher
 * that finds where those terms appear in a text so the reader can tap them.
 * Boundary: meanings are general information written for a first-time reader — never
 * advice about a particular document.
 */

export interface GlossaryEntry {
  readonly id: string;
  readonly term: string;
  /** Other spellings or forms that mean the same thing (hyphen and spacing variants are automatic). */
  readonly aliases: readonly string[];
  readonly meaning: string;
}

export const GLOSSARY: readonly GlossaryEntry[] = [
  { id: 'indemnity', term: 'indemnity', aliases: ['indemnify', 'indemnified', 'indemnification'], meaning: 'A promise to cover the other side’s losses or legal costs if something goes wrong. A broad indemnity can make you pay even for things you did not cause.' },
  { id: 'lock-in-period', term: 'lock-in period', aliases: ['lock-in'], meaning: 'A fixed time during which you generally cannot end the agreement without paying a charge, often the rent or fee for the remaining months.' },
  { id: 'arbitration', term: 'arbitration', aliases: ['arbitrator', 'arbitral'], meaning: 'A private way of settling disputes outside court. The arbitrator’s decision is generally binding and can be challenged in court only on narrow grounds.' },
  { id: 'sole-arbitrator', term: 'sole arbitrator', aliases: [], meaning: 'One person who alone decides a dispute instead of a court. The Supreme Court has held that one side alone generally cannot pick that person, who must be independent.' },
  { id: 'security-deposit', term: 'security deposit', aliases: [], meaning: 'Money paid upfront and held as security. It is usually refundable at the end, minus lawful deductions such as unpaid rent or damage.' },
  { id: 'notice-period', term: 'notice period', aliases: [], meaning: 'How much advance warning one side must give before ending the agreement or acting on it, for example before vacating a flat or resigning.' },
  { id: 'leave-and-licence', term: 'leave and licence', aliases: ['leave and license', 'leave & licence'], meaning: 'Permission to use a property for a fixed period, often 11 months. It generally does not create a tenancy or any interest in the property. Common in Maharashtra.' },
  { id: 'licensor', term: 'licensor', aliases: [], meaning: 'The owner who gives permission to use the property under a leave and licence agreement — in everyday words, the landlord.' },
  { id: 'licensee', term: 'licensee', aliases: [], meaning: 'The person allowed to use the property under a leave and licence agreement — in everyday words, the occupant or tenant.' },
  { id: 'force-majeure', term: 'force majeure', aliases: [], meaning: 'Events outside anyone’s control, such as floods, war or an epidemic, that may excuse a party while they last. What counts depends on the clause’s wording.' },
  { id: 'liquidated-damages', term: 'liquidated damages', aliases: [], meaning: 'A fixed sum named in the contract as compensation for a breach. Courts generally allow only reasonable compensation up to that sum, not the full figure automatically.' },
  { id: 'penalty', term: 'penalty', aliases: ['penalties'], meaning: 'An extra charge for breaking a term, such as paying late. Even when a contract names a penalty, courts generally allow only reasonable compensation.' },
  { id: 'jurisdiction', term: 'jurisdiction', aliases: [], meaning: 'Which city’s courts or which authority can hear a dispute. A far-away city can make going to court costly for you.' },
  { id: 'stamp-duty', term: 'stamp duty', aliases: [], meaning: 'A state tax paid on many agreements. A document without enough stamp duty may not be accepted as evidence until the duty, and any penalty, is paid.' },
  { id: 'registration', term: 'registration', aliases: [], meaning: 'Recording a document at the sub-registrar’s office. Leases of a year or more generally must be registered, or they may not be accepted as proof of their terms.' },
  { id: 'escalation', term: 'escalation', aliases: [], meaning: 'A planned increase in rent or fees, usually a percentage every year or at each renewal.' },
  { id: 'sub-letting', term: 'sub-letting', aliases: ['sublet', 'sub-lease'], meaning: 'Renting out all or part of your rented place to someone else. Most rent agreements forbid it without the owner’s written consent.' },
  { id: 'termination', term: 'termination', aliases: ['terminate', 'terminated'], meaning: 'Ending the agreement before its natural end date. Check who can end it, with how much notice, and what it costs.' },
  { id: 'waiver', term: 'waiver', aliases: ['waive', 'waived'], meaning: 'Giving up a right, such as the right to claim money or go to court. A term that fully bars you from going to court is generally not enforceable.' },
  { id: 'non-compete', term: 'non-compete', aliases: ['non-competition'], meaning: 'A promise not to work for competitors or run a similar business. Indian courts have generally refused to enforce such terms after a job ends.' },
  { id: 'training-bond', term: 'training bond', aliases: ['service bond', 'employment bond'], meaning: 'A promise to stay for a set time or repay a sum if you leave early. Courts generally allow recovery of reasonable, actual costs rather than any figure written.' },
  { id: 'probation', term: 'probation', aliases: ['probationary'], meaning: 'A trial period at the start of a job. Notice periods and benefits are often shorter or different while it lasts.' },
  { id: 'gratuity', term: 'gratuity', aliases: [], meaning: 'A lump sum an employer pays when you leave, generally after at least five years of continuous service, under the Payment of Gratuity Act, 1972.' },
  { id: 'foreclosure', term: 'foreclosure', aliases: ['pre-closure'], meaning: 'Closing a loan fully before its term ends. RBI rules generally bar foreclosure charges on floating-rate loans taken by individuals for non-business use.' },
  { id: 'prepayment', term: 'prepayment', aliases: ['part-payment'], meaning: 'Paying back part or all of a loan early to save interest. Some fixed-rate loans charge a fee for it; check the percentage.' },
  { id: 'emi', term: 'EMI', aliases: ['equated monthly instalment'], meaning: 'Equated monthly instalment: the fixed amount paid every month on a loan, covering part of the loan amount and the interest.' },
  { id: 'guarantor', term: 'guarantor', aliases: ['surety'], meaning: 'Someone who promises to repay if the borrower does not. The lender can generally recover the dues from the guarantor directly.' },
  { id: 'hypothecation', term: 'hypothecation', aliases: ['hypothecated'], meaning: 'Offering a movable asset, such as a car, as security for a loan while you keep using it. The lender can generally take it over if you default.' },
  { id: 'moratorium', term: 'moratorium', aliases: [], meaning: 'A period when loan repayments are paused or reduced. Interest usually keeps adding up during it, so the total cost can rise.' },
  { id: 'sum-insured', term: 'sum insured', aliases: ['sum assured'], meaning: 'The most the insurer will pay under the policy, for a year or for a claim, as the policy states.' },
  { id: 'co-payment', term: 'co-payment', aliases: ['co-pay'], meaning: 'The share of each claim you pay yourself, such as 20%, while the insurer pays the rest.' },
  { id: 'waiting-period', term: 'waiting period', aliases: [], meaning: 'Time after buying a policy during which some illnesses or treatments are not covered.' },
  { id: 'free-look-period', term: 'free-look period', aliases: ['free-look'], meaning: 'A window, generally 30 days for new life and health policies, to cancel for a refund minus limited deductions.' },
  { id: 'exclusion', term: 'exclusion', aliases: ['excluded'], meaning: 'Something the policy or contract does not cover. Claims for excluded items are generally rejected, so read this list closely.' },
  { id: 'pre-existing-disease', term: 'pre-existing disease', aliases: ['pre-existing condition', 'pre-existing illness'], meaning: 'An illness you had before buying the policy. Health policies generally cover it only after a waiting period, now generally capped at 36 months.' },
  { id: 'possession', term: 'possession', aliases: [], meaning: 'Handing over the property so the buyer can move in. Check the promised date and what compensation applies if it is late.' },
  { id: 'carpet-area', term: 'carpet area', aliases: [], meaning: 'The net usable floor area inside a flat, excluding external walls and common areas. It is usually smaller than the built-up or super built-up area.' },
  { id: 'booking-amount', term: 'booking amount', aliases: ['application money'], meaning: 'Money paid upfront to reserve a flat or plot. Under RERA, a builder generally cannot take more than 10% of the cost before a registered agreement for sale.' },
];

/** Where one glossary term appears in a text (offsets into that text). */
export interface GlossaryMatch {
  readonly entryId: string;
  readonly start: number;
  readonly end: number;
}

const REGEX_SPECIAL = /[.*+?^${}()|[\]\\]/g;
/** Letters and digits in any script, so "indemnity" inside "indemnityclause" is not a match. */
const NOT_WORD_BEFORE = '(?<![\\p{L}\\p{N}])';
const NOT_WORD_AFTER = '(?![\\p{L}\\p{N}])';

/** Hyphens may be dropped or spaced ("sub-letting", "subletting"); spaces may be hyphens. */
function phrasePattern(phrase: string): string {
  return phrase
    .trim()
    .split(/(\s+|-)/)
    .map((part) => {
      if (part === '-') return '[\\s-]?';
      if (/^\s+$/.test(part)) return '[\\s-]+';
      return part.replace(REGEX_SPECIAL, '\\$&');
    })
    .join('');
}

/** Longest spelling first so "pre-existing condition" wins over a shorter form at the same place. */
function entryPattern(entry: GlossaryEntry): RegExp {
  const spellings = [entry.term, ...entry.aliases].sort((a, b) => b.length - a.length).map(phrasePattern);
  return new RegExp(`${NOT_WORD_BEFORE}(?:${spellings.join('|')})s?${NOT_WORD_AFTER}`, 'giu');
}

const ENTRY_PATTERNS: readonly (readonly [GlossaryEntry, RegExp])[] = GLOSSARY.map((entry) => [entry, entryPattern(entry)]);

/**
 * Finds the first non-overlapping occurrence of each glossary term, case-insensitively and on
 * whole words, sorted by position. Where two terms overlap, the earlier and then longer one wins.
 * @example
 * findGlossaryTerms('The Indemnity clause'); // [{ entryId: 'indemnity', start: 4, end: 13 }]
 */
export function findGlossaryTerms(text: string): GlossaryMatch[] {
  const candidates = ENTRY_PATTERNS.flatMap(([entry, pattern]) =>
    Array.from(text.matchAll(pattern), (match): GlossaryMatch => ({ entryId: entry.id, start: match.index, end: match.index + match[0].length })),
  ).sort((a, b) => a.start - b.start || b.end - a.end);
  const used = new Set<string>();
  const picked: GlossaryMatch[] = [];
  let reachedEnd = 0;
  for (const candidate of candidates) {
    if (used.has(candidate.entryId) || candidate.start < reachedEnd) continue;
    picked.push(candidate);
    used.add(candidate.entryId);
    reachedEnd = candidate.end;
  }
  return picked;
}
