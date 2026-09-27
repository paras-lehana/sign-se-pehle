/**
 * Where to go — official help and complaint forums for each kind of document.
 *
 * Responsibility: one curated table of government or regulator-run forums (each URL was
 * checked to load, 27 Sep 2026) and which of them fit each document kind.
 * Boundary: this says where help exists and when it is generally used; it never predicts an
 * outcome or tells the reader to file anything. Phone numbers are listed only when certain.
 */
import type { DocumentKind } from '../domain/document-kinds.js';

export interface ForumRoute {
  readonly id: string;
  readonly name: string;
  /** When readers generally turn to this forum, in one plain sentence. */
  readonly when: string;
  readonly url: string;
  readonly phone?: string;
}

type ForumId =
  | 'nalsa'
  | 'tele-law'
  | 'consumer-helpline'
  | 'e-jagriti'
  | 'rbi-cms'
  | 'cyber-crime'
  | 'bima-bharosa'
  | 'insurance-ombudsman'
  | 'labour-samadhan'
  | 'msme-samadhaan';

/** Forum id → route. A `Record` keyed by the union makes a missing forum a compile error. */
const FORUMS: Readonly<Record<ForumId, ForumRoute>> = {
  nalsa: {
    id: 'nalsa',
    name: 'Free legal aid (NALSA and your District Legal Services Authority)',
    when: 'Free legal advice, and a lawyer if you qualify. Women, children, SC/ST members, industrial workers and low-income people generally do.',
    url: 'https://nalsa.gov.in/',
    phone: '15100',
  },
  'tele-law': {
    id: 'tele-law',
    name: 'Tele-Law (Ministry of Law and Justice)',
    when: 'Free advice from a panel lawyer by phone or video, arranged through Common Service Centres across India.',
    url: 'https://www.tele-law.in/',
  },
  'consumer-helpline': {
    id: 'consumer-helpline',
    name: 'National Consumer Helpline',
    when: 'A company, app, builder or service provider is not resolving your complaint; the helpline helps settle it before any case is filed.',
    url: 'https://consumerhelpline.gov.in/',
    phone: '1915',
  },
  'e-jagriti': {
    id: 'e-jagriti',
    name: 'Consumer commissions online (e-Jagriti)',
    when: 'Filing a consumer complaint about deficient service, unfair terms or unpaid refunds. For RERA-registered projects, your state RERA authority also hears complaints.',
    url: 'https://e-jagriti.gov.in/',
  },
  'rbi-cms': {
    id: 'rbi-cms',
    name: 'RBI Complaint Management System (RBI Ombudsman)',
    when: 'A bank or NBFC rejected your complaint or did not reply within 30 days, for example about loan charges or recovery conduct.',
    url: 'https://cms.rbi.org.in/',
  },
  'cyber-crime': {
    id: 'cyber-crime',
    name: 'National Cyber Crime Reporting Portal',
    when: 'Online fraud, a loan app harassing you or your contacts, or misuse of your personal data. The 1930 helpline is for money lost to online fraud.',
    url: 'https://cybercrime.gov.in/',
    phone: '1930',
  },
  'bima-bharosa': {
    id: 'bima-bharosa',
    name: 'Bima Bharosa (IRDAI grievance portal)',
    when: 'Registering and tracking a complaint against an insurer, for example a rejected or delayed claim.',
    url: 'https://bimabharosa.irdai.gov.in/',
  },
  'insurance-ombudsman': {
    id: 'insurance-ombudsman',
    name: 'Insurance Ombudsman',
    when: 'The insurer rejected your complaint or did not reply within 30 days; a free forum for claim and policy disputes.',
    url: 'https://www.cioins.co.in/',
  },
  'labour-samadhan': {
    id: 'labour-samadhan',
    name: 'SAMADHAN (Ministry of Labour and Employment)',
    when: 'Disputes about termination, lay-off, dismissal or working conditions handled by central labour authorities; many states run their own labour offices.',
    url: 'https://samadhan.labour.gov.in/',
  },
  'msme-samadhaan': {
    id: 'msme-samadhaan',
    name: 'MSME Samadhaan (delayed payments)',
    when: 'You are registered as a micro or small enterprise (Udyam) and a buyer has not paid within the agreed time, which is generally at most 45 days.',
    url: 'https://samadhaan.msme.gov.in/',
  },
};

/** Kind → forums, most specific first; free legal aid is listed wherever it fits. */
const KIND_FORUMS: Readonly<Record<DocumentKind, readonly ForumId[]>> = {
  rental: ['nalsa', 'tele-law'],
  employment: ['labour-samadhan', 'nalsa', 'tele-law'],
  loan: ['rbi-cms', 'cyber-crime', 'nalsa'],
  insurance: ['bima-bharosa', 'insurance-ombudsman', 'e-jagriti', 'nalsa'],
  'online-terms': ['consumer-helpline', 'e-jagriti', 'cyber-crime'],
  'property-purchase': ['e-jagriti', 'consumer-helpline', 'nalsa'],
  'service-contract': ['msme-samadhaan', 'nalsa', 'tele-law'],
  'legal-notice': ['nalsa', 'tele-law'],
  other: ['nalsa', 'tele-law'],
};

/**
 * The official forums that generally fit a document kind (two to four, most specific first).
 * @example
 * routesForKind('insurance')[0]?.id; // 'bima-bharosa'
 */
export function routesForKind(kind: DocumentKind): readonly ForumRoute[] {
  return KIND_FORUMS[kind].map((id) => FORUMS[id]);
}
