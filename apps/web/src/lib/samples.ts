/**
 * Sample documents a first-time visitor can load with one tap.
 *
 * Responsibility: five short, realistic Indian documents that each exercise a different
 * part of the analyser (lock-in rent, bonds, floating-rate prepayment, waiting periods,
 * data sharing). Boundary: every name, company, number and ID here is fictional; the
 * loan sample carries a dummy PAN and phone so readers can watch redaction work.
 */
import type { DocumentKind, UserRole } from '@sign-se-pehle/core';

/** One ready-to-analyse sample: the form fills text, kind and role from it. */
export interface SampleDocument {
  readonly id: string;
  /** Chip label, e.g. "Rent agreement". */
  readonly label: string;
  /** One line under the label saying what the sample shows off. */
  readonly teaser: string;
  readonly kind: DocumentKind;
  readonly role: UserRole;
  readonly text: string;
}

const RENTAL_TEXT = `LEAVE AND LICENCE AGREEMENT

This agreement is made at Mumbai between Mr. Suresh Nair (Licensor) and Ms. Kavya Iyer (Licensee) for Flat 502, Sai Heights, Andheri East.

1. TERM. The licence is for a period of 11 months from 01/10/2026.

2. LICENCE FEE. The Licensee shall pay a monthly rent of Rs. 32,000 on or before the 5th of every month. A late fee of Rs. 500 per day applies after the 5th.

3. DEPOSIT. The Licensee shall pay an interest-free refundable security deposit of Rs. 3,20,000, returned within 60 days of vacating after deductions decided by the Licensor.

4. LOCK-IN. Lock-in period of 11 months. If the Licensee vacates early, the rent for the remaining lock-in period shall be payable.

5. NOTICE. The Licensee shall give 2 months notice. The Licensor may terminate this licence at any time without notice.

6. ENTRY. The Licensor may enter the premises at any time without prior notice.

7. ESCALATION. The licence fee shall increase by 10% on every renewal.`;

const JOB_OFFER_TEXT = `OFFER OF EMPLOYMENT

Dear Mr. Arjun Mehta,

Brightloop Technologies Pvt. Ltd. is pleased to offer you the position of Software Engineer at our Pune office.

1. REMUNERATION. Your monthly gross salary of Rs. 85,000 is payable on the last working day of each month.

2. PROBATION. You will be on probation for 6 months.

3. NOTICE PERIOD. After confirmation, the employee must give 90 days notice. The Company may end your employment with 15 days notice.

4. TRAINING BOND. You agree to a training bond of Rs. 2,00,000. If you resign within a bond period of 24 months, you must repay the full training cost.

5. NON-COMPETE. For 12 months after leaving the Company, you shall not join any competitor or similar business anywhere in India.

6. CONFIDENTIALITY. You will keep all client information confidential during and after employment.

Please sign and return a copy by 15 October 2026.`;

const LOAN_TEXT = `PERSONAL LOAN AGREEMENT - KEY TERMS

Borrower: Ms. Neha Deshpande, PAN ABCPD1234K, mobile +91 98765 43210
Lender: Swiftcash Finance Ltd.

1. LOAN. The lender sanctions a loan amount of Rs. 5,00,000 for a tenure of 48 months.

2. INTEREST. The rate of interest is 14.5% per annum on a floating rate linked to the lender's benchmark, which the lender may revise at its sole discretion.

3. PROCESSING FEE. A processing fee of 3% of the loan amount is deducted upfront and is non-refundable.

4. PREPAYMENT. Foreclosure or part-prepayment is allowed after 12 EMIs with a prepayment charge of 4% of the outstanding principal.

5. DEFAULT. Overdue EMIs attract penal interest of 2% per month, compounded monthly.

6. DISPUTES. Disputes shall be referred to a sole arbitrator appointed by the lender at Mumbai.`;

const INSURANCE_TEXT = `HEALTH INSURANCE POLICY - SCHEDULE AND KEY CLAUSES

Policyholder: Mr. Rohan Verma, Lucknow. Plan: FamilyShield Gold.

1. SUM INSURED. The sum insured is Rs. 10,00,000 per policy year for the family.

2. PREMIUM. The annual premium of Rs. 24,500 is payable before the renewal date.

3. PRE-EXISTING DISEASES. Pre-existing diseases are covered only after a waiting period of 48 months of continuous coverage.

4. CO-PAYMENT. A co-payment of 20% applies to every claim.

5. FREE-LOOK. You may cancel the policy within a free-look period of 15 days from receipt and get a refund, less stamp duty and medical check-up costs.

6. EXCLUSIONS. Any condition not disclosed in the proposal form is not covered, and the insurer may reject such a claim at its sole discretion.`;

const APP_TERMS_TEXT = `TERMS OF USE AND PRIVACY POLICY - QUICKKART APP

By creating an account on the QuickKart app, you (the user) agree to these terms.

1. DATA WE COLLECT. We collect your name, phone number, location, contacts and purchase history.

2. SHARING. We may share your personal data with our affiliates, advertising partners and other third parties for marketing and credit profiling.

3. CHANGES. QuickKart reserves the right to modify these terms at any time without prior notice. Continued use of the app means you accept the changes.

4. SUBSCRIPTION. QuickKart Plus is automatically renewed every month and the fee is non-refundable.

5. LIABILITY. You shall indemnify QuickKart against any and all claims arising from your use of the platform.

6. DISPUTES. You waive your right to approach any consumer forum or court; all disputes will be decided by arbitration in Bengaluru.`;

/** The chips shown under "Try a sample", in the order most visitors recognise them. */
export const SAMPLE_DOCUMENTS: readonly SampleDocument[] = [
  {
    id: 'rent-leave-licence',
    label: 'Rent agreement',
    teaser: 'Mumbai leave and licence with a lock-in and a 10-month deposit',
    kind: 'rental',
    role: 'tenant',
    text: RENTAL_TEXT,
  },
  {
    id: 'job-offer-bond',
    label: 'Job offer letter',
    teaser: 'Pune offer with a training bond and a 12-month non-compete',
    kind: 'employment',
    role: 'employee',
    text: JOB_OFFER_TEXT,
  },
  {
    id: 'personal-loan-floating',
    label: 'Personal loan',
    teaser: 'Floating-rate loan with prepayment charges (includes a dummy PAN and phone)',
    kind: 'loan',
    role: 'borrower',
    text: LOAN_TEXT,
  },
  {
    id: 'health-insurance',
    label: 'Health insurance',
    teaser: '48-month pre-existing disease wait and a 15-day free-look',
    kind: 'insurance',
    role: 'policyholder',
    text: INSURANCE_TEXT,
  },
  {
    id: 'app-terms-data-sharing',
    label: 'App terms',
    teaser: 'Shopping app that shares data with third parties and changes terms at will',
    kind: 'online-terms',
    role: 'user',
    text: APP_TERMS_TEXT,
  },
];
