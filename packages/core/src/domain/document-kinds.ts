/**
 * Document kinds and the roles a reader can hold in each.
 *
 * Responsibility: the single table that says which documents Sign Se Pehle
 * understands, who the parties are, and which what-if scenarios apply.
 * Boundary: presentation copy lives here so web and server never re-type it.
 */

/** Every document family the analyser recognises. `other` still gets a full generic analysis. */
export const DOCUMENT_KINDS = [
  'rental',
  'employment',
  'loan',
  'insurance',
  'online-terms',
  'property-purchase',
  'service-contract',
  'other',
] as const;

export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

/** Every role a reader can pick. Roles are per-kind (see {@link KIND_PROFILES}). */
export const USER_ROLES = [
  'tenant',
  'landlord',
  'employee',
  'employer',
  'borrower',
  'lender',
  'policyholder',
  'insurer',
  'user',
  'company',
  'buyer',
  'builder',
  'client',
  'freelancer',
  'party',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

/** What-if scenarios the deterministic simulator can run (see engine/simulate.ts). */
export const SCENARIO_IDS = [
  'rental-leave-early',
  'rental-late-rent',
  'employment-resign',
  'loan-total-cost',
  'loan-prepay',
  'insurance-cancel-free-look',
] as const;

export type ScenarioId = (typeof SCENARIO_IDS)[number];

/** Presentation and routing metadata for one document kind. */
export interface KindProfile {
  readonly label: string;
  /** One line shown under the kind picker, written for a first-time reader. */
  readonly examples: string;
  /** The role most readers hold — the weaker party, because that is who needs help. */
  readonly defaultRole: UserRole;
  readonly roles: readonly UserRole[];
  readonly scenarios: readonly ScenarioId[];
}

/** Kind → profile. A `Record` keyed by the union makes a missing kind a compile error. */
export const KIND_PROFILES: Readonly<Record<DocumentKind, KindProfile>> = {
  rental: {
    label: 'Rent / leave & licence agreement',
    examples: 'Flat or room rent agreements, PG agreements, 11-month leave and licence',
    defaultRole: 'tenant',
    roles: ['tenant', 'landlord'],
    scenarios: ['rental-leave-early', 'rental-late-rent'],
  },
  employment: {
    label: 'Job offer / employment contract',
    examples: 'Offer letters, appointment letters, service bonds, internship agreements',
    defaultRole: 'employee',
    roles: ['employee', 'employer'],
    scenarios: ['employment-resign'],
  },
  loan: {
    label: 'Loan / credit agreement',
    examples: 'Personal, home, vehicle, gold, education and app-based loans',
    defaultRole: 'borrower',
    roles: ['borrower', 'lender'],
    scenarios: ['loan-total-cost', 'loan-prepay'],
  },
  insurance: {
    label: 'Insurance policy',
    examples: 'Health, life, motor and travel policy wordings',
    defaultRole: 'policyholder',
    roles: ['policyholder', 'insurer'],
    scenarios: ['insurance-cancel-free-look'],
  },
  'online-terms': {
    label: 'App terms / privacy policy',
    examples: 'Terms of service, privacy policies, subscription terms',
    defaultRole: 'user',
    roles: ['user', 'company'],
    scenarios: [],
  },
  'property-purchase': {
    label: 'Property purchase / builder-buyer agreement',
    examples: 'Allotment letters, agreements for sale, builder-buyer agreements',
    defaultRole: 'buyer',
    roles: ['buyer', 'builder'],
    scenarios: [],
  },
  'service-contract': {
    label: 'Service / freelance contract',
    examples: 'Freelance, consulting, vendor and maintenance contracts',
    defaultRole: 'freelancer',
    roles: ['freelancer', 'client'],
    scenarios: [],
  },
  other: {
    label: 'Other legal document',
    examples: 'Notices, NDAs, partnership deeds, affidavits and anything else',
    defaultRole: 'party',
    roles: ['party'],
    scenarios: [],
  },
};

/** Human label for every role. */
export const ROLE_LABELS: Readonly<Record<UserRole, string>> = {
  tenant: 'Tenant',
  landlord: 'Landlord',
  employee: 'Employee',
  employer: 'Employer',
  borrower: 'Borrower',
  lender: 'Lender',
  policyholder: 'Policyholder',
  insurer: 'Insurer',
  user: 'User',
  company: 'Company',
  buyer: 'Buyer',
  builder: 'Builder / seller',
  client: 'Client',
  freelancer: 'Freelancer / service provider',
  party: 'One of the parties',
};

/**
 * Returns the role to analyse from when the reader has not chosen one, or chose one that
 * does not belong to the detected kind.
 * @example
 * resolveRole('rental', 'employee'); // 'tenant'
 */
export function resolveRole(kind: DocumentKind, requested: UserRole | undefined): UserRole {
  const profile = KIND_PROFILES[kind];
  return requested !== undefined && profile.roles.includes(requested)
    ? requested
    : profile.defaultRole;
}
