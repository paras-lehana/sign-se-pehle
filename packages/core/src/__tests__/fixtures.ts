/**
 * Shared test fixtures: realistic Indian document text and helpers.
 *
 * Responsibility: pin only INPUTS (document text, facts); every expected output in
 * tests is derived from the code under test or from these inputs.
 */
import type { Clause, Provenance } from '../schemas/analysis.js';

export const RENT_AGREEMENT = `RENTAL AGREEMENT

This Rental Agreement is made at Pune on 01/04/2026 between Mr. Ramesh Kulkarni (hereinafter the Landlord) and Ms. Priya Sharma (hereinafter the Tenant).

1. RENT
The Tenant shall pay a monthly rent of Rs. 25,000 (Rupees Twenty Thousand only) on or before the 5th day of every month.

2. SECURITY DEPOSIT
The Tenant shall pay an interest-free security deposit of Rs. 1,50,000 which shall be refunded at the sole discretion of the Landlord.

3. TERM AND LOCK-IN
This agreement is for a period of 11 months. There is a lock-in period of 6 months. If the Tenant vacates before the lock-in ends, the Tenant shall pay rent for the remaining lock-in period.

4. NOTICE
The Tenant shall give 60 days notice before vacating. The Landlord may terminate by giving 15 days notice.

5. REPAIRS
The Tenant shall bear the cost of all major and structural repairs to the premises.

6. ENTRY
The Landlord may enter and inspect the premises at any time without prior notice.

7. ESCALATION
The rent shall be increased by 15% on renewal.

8. LATE PAYMENT
A late fee of Rs. 500 per day shall be charged on delayed rent.

9. DISPUTES
Any dispute shall be referred to a sole arbitrator appointed by the Landlord.
`;

export const PROVENANCE: Provenance = { mode: 'offline', models: [], latencyMs: 5, steps: [{ name: 'analyze', engine: 'offline', ms: 5 }] };

/** Builds a clause with sensible defaults; tests override only what they own. */
export function makeClause(overrides: Partial<Clause> = {}): Clause {
  return {
    id: 'c1',
    heading: 'Clause',
    quote: 'Some clause text.',
    plainMeaning: 'Meaning.',
    category: 'other',
    risk: 'low',
    favours: 'balanced',
    signals: [],
    quoteVerified: true,
    ...overrides,
  };
}
