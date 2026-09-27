/**
 * Report fixture built by the real core pipeline (offline analyser + assembler).
 *
 * Responsibility: give report tests an Analysis whose flags, clauses and score are
 * produced by the code under test, never hand-typed. Only the input text and the
 * provenance timing are pinned here.
 */
import {
  type Analysis,
  type DocumentKind,
  type Provenance,
  type UserRole,
  analyzeOffline,
  assembleAnalysis,
} from '@sign-se-pehle/core';

/** A short but realistic Indian leave-and-licence agreement with several one-sided terms. */
export const RENT_AGREEMENT = [
  'LEAVE AND LICENCE AGREEMENT',
  '',
  'This agreement is made at Pune between Mr. Ramesh Kulkarni (Licensor/Landlord) and Ms. Priya Sharma (Licensee/Tenant).',
  '',
  '1. TERM. This agreement is for a period of 11 months starting from 01/10/2026.',
  '',
  '2. RENT. The Tenant shall pay a monthly rent of Rs. 25,000 (Rupees Twenty Five Thousand only) on or before the 5th of every month.',
  '',
  '3. SECURITY DEPOSIT. The Tenant shall pay an interest-free refundable security deposit of Rs. 1,50,000 (Rupees One Lakh Fifty Thousand only).',
  '',
  '4. LOCK-IN. There is a lock-in period of 11 months. If the Tenant leaves before the lock-in period ends, the Tenant shall pay the full rent for the remaining lock-in period.',
  '',
  '5. NOTICE. The Tenant shall give 90 days notice to vacate. The Landlord may terminate this agreement by giving 15 days notice.',
  '',
  '6. ENTRY. The Landlord may enter the premises at any time without prior notice for inspection.',
  '',
  '7. REPAIRS. All repairs including structural repairs shall be done by the Tenant at the Tenant’s own cost.',
  '',
  '8. ESCALATION. The rent shall increase by 15% on every renewal.',
].join('\n');

export const OFFLINE_PROVENANCE: Provenance = {
  mode: 'offline',
  models: [],
  latencyMs: 12,
  steps: [],
};

/** App terms with one-sided clauses — a kind that has no what-if scenarios. */
export const APP_TERMS = [
  'TERMS OF SERVICE',
  '',
  '1. CHANGES. We may change these terms at any time without notice to you.',
  '',
  '2. DATA. We may share your personal data with our partners for marketing.',
  '',
  '3. LIABILITY. We are not liable for any loss, however caused, even if we were negligent.',
  '',
  '4. DISPUTES. Any dispute shall be decided by a sole arbitrator appointed by us, seated in Mumbai.',
].join('\n');

/** Builds the report the server would return for `text` in offline mode. */
export function buildAnalysis(text: string, kind: DocumentKind, role: UserRole): Analysis {
  const output = analyzeOffline({ text, kindHint: kind, language: 'en' });
  return assembleAnalysis({
    id: `fixture-${kind}`,
    output,
    text,
    source: 'text',
    redactions: [],
    role,
    kindHint: kind,
    language: 'en',
    provenance: OFFLINE_PROVENANCE,
  });
}

/** Builds the report the server would return for {@link RENT_AGREEMENT} in offline mode. */
export function buildRentalAnalysis(): Analysis {
  return buildAnalysis(RENT_AGREEMENT, 'rental', 'tenant');
}
