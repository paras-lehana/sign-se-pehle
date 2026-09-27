# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [0.2.0] — 2026-09-27

"Midnight glass" redesign and the features that set Sign Se Pehle apart.

### Added

- Document X-ray: the reader's own text with every clause highlighted by risk; tap a highlight to
  open its explanation.
- Negotiate (`POST /api/negotiate`): fairer wording for each risky clause and a polite or firm
  message ready for WhatsApp or email, with the official sources behind each request; offline
  drafter when Gemini is unavailable.
- Next steps: where to go per document type (legal aid, e-Jagriti consumer commission, RBI CMS,
  Bima Bharosa, Insurance Ombudsman, SAMADHAN, MSME Samadhaan, cyber crime), nearest free legal aid
  on Google Maps, a free legal aid eligibility check (Legal Services Authorities Act, 1987, s.12)
  that runs only in the browser, a reply-deadline countdown for legal notices, and the Limitation
  Act reminder.
- New document type: legal notice / demand letter (notice date and response days extracted).
- Listen (`POST /api/speech`): Gemini text-to-speech in 11 languages with the browser voice as
  fallback; voice questions where the browser supports speech recognition.
- Lawyer brief: one-page printable brief and WhatsApp sharing of the red-flag titles and questions.
- Sample documents, legal-jargon popovers inside clauses, and a camera button for phone photos.

### Changed

- Complete visual redesign: dark-first glass theme with a refined light theme, animated hero,
  bento feature grid, split workspace with keyboard-accessible report tabs, self-hosted fonts.
- Route and panel code splitting; Gemini served through Vertex AI in production.
- The score is called "Risk score" everywhere.

### Verified

- `npm run type-check`, `npm run lint` (zero warnings), `npm run dup-check` (0 clones).
- `npm run test:coverage`: 544 tests (core 344, server 83, web 117).
- `npx playwright test`: 32 tests (journeys + axe, desktop and Pixel 7, both themes).

## [0.1.0] — 2026-09-26

First public release for Google PromptWars (AI for Legal Assistance & Access).

### Added

- Document analysis (`POST /api/analyze`): pasted text, PDFs and phone photos; Gemini structured
  output explains every clause in 11 languages; server-side quote verification; PII redaction
  before any AI call.
- Deterministic Indian-law red-flag engine with a curated law table (Contract Act, Model Tenancy
  Act, Registration Act, Arbitration case law, Consumer Protection Act, DPDP Act, RBI, IRDAI, RERA).
- Risk score with reasons, money at stake, amount-in-words mismatch detection, key dates with
  Google Calendar links, obligations, checklist and lawyer questions.
- Grounded Q&A (`POST /api/ask`) with verified citations and an advice boundary.
- Draft comparison (`POST /api/compare`) with deterministic fact deltas.
- What-if simulator (`POST /api/simulate`): leaving a rental early, late rent, resigning, loan
  total cost and prepayment, insurance free-look cancellation.
- Labelled offline analyser used when Gemini is unavailable.
- Single Cloud Run service (API + web), Cloud Build pipeline with smoke test, Secret Manager.
