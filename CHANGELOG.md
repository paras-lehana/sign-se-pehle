# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [0.3.0] — 2026-09-28

Read-aloud in a choice of voice and language, and the feature bento moved above the workspace.

### Added

- Read-aloud now has three voices, picked by the reader (`ListenSettings`, stored per device):
  **Google Translate's free web API** (default, no key, speaks 10 of 11 languages), **Sarvam AI**
  (`bulbul:v3`, all 11 languages including Odia, opt-in), and **Gemini text-to-speech** (unchanged
  from 0.2.0). Each falls back to the next that speaks the language if it fails.
- Listen in a different language than the document was explained in (`X-Speech-Translated`
  response header): the text is translated first, using Sarvam's own translator for the Sarvam
  voice and Google Translate's free translator otherwise, before the chosen voice speaks it.
- `POST /api/speech` gains `voice` and `textLanguage`, and its response carries `X-Speech-Voice`
  (which voice actually spoke) and `X-Speech-Translated`.
- The bento grid ("Everything you need before you sign") now renders above "Your workspace" /
  "Check a document", so a first-time reader sees what the report contains before pasting anything.

### Changed

- `services/speech-client.ts`'s Gemini client is now one of three interchangeable voice engines
  behind a shared contract (`services/voice-engine.ts`); `services/speech-service.ts` orchestrates
  translation and the voice fallback order from a table in `packages/core/src/speech/voices.ts`.
- Read-aloud text is redacted the same way document text is before any translator or voice
  (including Sarvam and Google's free endpoints) ever sees it.

### Verified

- `npm run type-check`, `npm run lint` (zero warnings), `npm run dup-check` (0 clones).
- `npm run test:coverage`: 598 tests (core 360, server 108, web 130); every new speech module at
  100% statement, branch and line coverage.
- `npx playwright test`: 32 tests (journeys + axe, desktop and Pixel 7, both themes) — unchanged
  from 0.2.0; the voice/language picker was verified in a live browser pass instead (see
  `docs/tasks/2026-09-28-listen-11-languages/`).

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

### Fixed

- A sample's document type and role no longer carry over when the reader pastes their own
  document, uploads a file or takes a photo (the type hint overrides Gemini's classification,
  so a rent agreement could have been checked against insurance rules). Choices the reader
  made themselves are kept.

### Verified

- `npm run type-check`, `npm run lint` (zero warnings), `npm run dup-check` (0 clones).
- `npm run test:coverage`: 547 tests (core 344, server 83, web 120).
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
