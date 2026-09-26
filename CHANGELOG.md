# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

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
