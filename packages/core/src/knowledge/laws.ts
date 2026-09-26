/**
 * Curated Indian-law reference table.
 *
 * Responsibility: the ONLY source of legal citations in the product. Every red flag
 * links to one of these entries, each pointing at an official government or court
 * website. Boundary: summaries are hedged, factual one-liners — information, not advice;
 * the model is told never to cite laws itself.
 */
import type { LawReference } from '../schemas/analysis.js';

export const LAW_IDS = [
  'contract-act-s23',
  'contract-act-s27',
  'contract-act-s28',
  'contract-act-s74',
  'model-tenancy-act-s11',
  'model-tenancy-act-entry',
  'model-tenancy-act-repairs',
  'registration-act-s17',
  'arbitration-unilateral-appointment',
  'consumer-protection-unfair-contract',
  'dpdp-act-consent',
  'rbi-foreclosure-floating',
  'rbi-penal-charges',
  'irdai-free-look',
  'irdai-pre-existing-waiting',
  'rera-s13',
  'lsa-act-s12',
  'limitation-act',
] as const;

export type LawId = (typeof LAW_IDS)[number];

/** Official India Code record for the Indian Contract Act, 1872. */
const CONTRACT_ACT_URL = 'https://www.indiacode.nic.in/handle/123456789/2187';
/** Model Tenancy Act, 2021 as published by the Ministry of Housing and Urban Affairs. */
const MODEL_TENANCY_ACT_URL = 'https://mohua.gov.in/cms/model-tenancy-act.php';

/** Law id → reference. A `Record` keyed by the tuple makes a missing entry a compile error. */
export const LAWS: Readonly<Record<LawId, LawReference>> = {
  'contract-act-s23': {
    id: 'contract-act-s23',
    act: 'Indian Contract Act, 1872',
    section: 'Section 23',
    summary:
      'An agreement whose object or consideration is unlawful, fraudulent or against public policy is generally void.',
    url: CONTRACT_ACT_URL,
  },
  'contract-act-s27': {
    id: 'contract-act-s27',
    act: 'Indian Contract Act, 1872',
    section: 'Section 27',
    summary:
      'Agreements that restrain someone from a lawful profession, trade or business are void. Courts have generally refused to enforce non-compete terms that apply after a job ends.',
    url: CONTRACT_ACT_URL,
  },
  'contract-act-s28': {
    id: 'contract-act-s28',
    act: 'Indian Contract Act, 1872',
    section: 'Section 28',
    summary:
      'An agreement that absolutely stops a party from enforcing their rights through courts, or cuts short the time to do so, is generally void (arbitration clauses are an exception).',
    url: CONTRACT_ACT_URL,
  },
  'contract-act-s74': {
    id: 'contract-act-s74',
    act: 'Indian Contract Act, 1872',
    section: 'Section 74',
    summary:
      'When a contract names a penalty or fixed sum for breach, courts generally allow only reasonable compensation up to that amount, not the full figure automatically.',
    url: CONTRACT_ACT_URL,
  },
  'model-tenancy-act-s11': {
    id: 'model-tenancy-act-s11',
    act: 'Model Tenancy Act, 2021',
    section: 'Section 11',
    summary:
      'Caps the security deposit for residential premises at two months’ rent. It is a model law and applies only in states that have adopted it.',
    url: MODEL_TENANCY_ACT_URL,
  },
  'model-tenancy-act-entry': {
    id: 'model-tenancy-act-entry',
    act: 'Model Tenancy Act, 2021',
    section: 'Section 17',
    summary:
      'A landlord may enter the rented premises only after giving at least 24 hours’ written notice, at reasonable times. Applies where a state has adopted the model law.',
    url: MODEL_TENANCY_ACT_URL,
  },
  'model-tenancy-act-repairs': {
    id: 'model-tenancy-act-repairs',
    act: 'Model Tenancy Act, 2021',
    section: 'Section 15 and Second Schedule',
    summary:
      'Structural repairs such as walls, roof, plumbing lines and wiring are generally the landlord’s responsibility; tenants handle day-to-day upkeep. Applies where adopted.',
    url: MODEL_TENANCY_ACT_URL,
  },
  'registration-act-s17': {
    id: 'registration-act-s17',
    act: 'Registration Act, 1908',
    section: 'Section 17(1)(d)',
    summary:
      'Leases of immovable property from year to year, or for more than one year, must be registered. An unregistered lease may not be accepted as evidence of its terms.',
    url: 'https://www.indiacode.nic.in/handle/123456789/15400',
  },
  'arbitration-unilateral-appointment': {
    id: 'arbitration-unilateral-appointment',
    act: 'Arbitration and Conciliation Act, 1996 (Supreme Court rulings)',
    section: 'Perkins Eastman v HSCC (2019); CORE v ECI SPIC-SMO-MCML (2024)',
    summary:
      'The Supreme Court has held that one party alone cannot appoint a sole arbitrator, because the arbitrator must be independent and impartial.',
    url: 'https://www.sci.gov.in/',
  },
  'consumer-protection-unfair-contract': {
    id: 'consumer-protection-unfair-contract',
    act: 'Consumer Protection Act, 2019',
    section: 'Section 2(46)',
    summary:
      'Defines unfair contract terms, such as one-sided changes, excessive security deposits or unreasonable charges, which consumer commissions can declare null and void.',
    url: 'https://www.indiacode.nic.in/handle/123456789/15256',
  },
  'dpdp-act-consent': {
    id: 'dpdp-act-consent',
    act: 'Digital Personal Data Protection Act, 2023',
    section: 'Sections 6 and 12',
    summary:
      'Consent to use personal data must be free, specific, informed and limited to a stated purpose, and people can ask for their data to be corrected or erased.',
    url: 'https://www.meity.gov.in/data-protection-framework',
  },
  'rbi-foreclosure-floating': {
    id: 'rbi-foreclosure-floating',
    act: 'Reserve Bank of India directions',
    section: 'Foreclosure charges on floating rate loans',
    summary:
      'RBI directs banks and NBFCs not to levy foreclosure or prepayment charges on floating-rate term loans to individual borrowers for purposes other than business.',
    url: 'https://www.rbi.org.in/Scripts/NotificationUser.aspx',
  },
  'rbi-penal-charges': {
    id: 'rbi-penal-charges',
    act: 'Reserve Bank of India, Fair Lending Practice – Penal Charges (2023)',
    section: 'Penal charges in loan accounts',
    summary:
      'Lenders may levy reasonable penal charges for default, but not penal interest added to the interest rate, and such charges must not be capitalised or compounded.',
    url: 'https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=12527',
  },
  'irdai-free-look': {
    id: 'irdai-free-look',
    act: 'IRDAI regulations and master circulars (2024)',
    section: 'Free-look period',
    summary:
      'New life and health policies generally come with a 30-day free-look period to cancel for a refund, minus limited deductions such as proportionate risk premium and stamp duty.',
    url: 'https://irdai.gov.in/',
  },
  'irdai-pre-existing-waiting': {
    id: 'irdai-pre-existing-waiting',
    act: 'IRDAI Master Circular on Health Insurance (2024)',
    section: 'Pre-existing disease waiting period',
    summary:
      'The waiting period before pre-existing diseases are covered in a health policy is generally capped at 36 months.',
    url: 'https://irdai.gov.in/',
  },
  'rera-s13': {
    id: 'rera-s13',
    act: 'Real Estate (Regulation and Development) Act, 2016',
    section: 'Section 13',
    summary:
      'A promoter cannot accept more than 10% of the property cost as advance or application fee before signing a registered agreement for sale.',
    url: 'https://www.indiacode.nic.in/handle/123456789/2158',
  },
  'lsa-act-s12': {
    id: 'lsa-act-s12',
    act: 'Legal Services Authorities Act, 1987',
    section: 'Section 12',
    summary:
      'Women, children, SC/ST members, people with disabilities, industrial workers, people in custody and low-income persons are generally eligible for free legal aid.',
    url: 'https://nalsa.gov.in/',
  },
  'limitation-act': {
    id: 'limitation-act',
    act: 'Limitation Act, 1963',
    section: 'Schedule (Articles 55 and 113)',
    summary:
      'Most claims arising from a contract must generally be filed within three years, so waiting too long can end the right to go to court.',
    url: 'https://www.indiacode.nic.in/handle/123456789/1565',
  },
};
