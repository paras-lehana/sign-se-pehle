# Sign Se Pehle — understand every clause before you sign

> **Version 0.3.0** — "Midnight glass" redesign, Document X-ray, Negotiate, Next steps, a lawyer brief, and Listen in any of 11 languages with a choice of voice (Google Translate’s free voice by default, Sarvam AI, or Gemini). Live on Google Cloud Run (asia-south1 Mumbai, mirrored in asia-south2 Delhi).

**Paste or photograph any Indian legal document — a rent agreement, job offer, loan, insurance policy
or app terms — and see what every clause means for _you_, in your language, before you sign it.**
Gemini reads and explains the document; a deterministic rule engine checks the document's own numbers
against a curated table of Indian laws; every quote is verified against your text; and a what-if
simulator shows the money at stake. _Information, not legal advice._

- **Live app:** https://sign-se-pehle-767171449038.asia-south1.run.app (mirror: https://sign-se-pehle-767171449038.asia-south2.run.app)
- **Health (shows the live Gemini chain):** https://sign-se-pehle-767171449038.asia-south1.run.app/api/health
- Built with **Google Antigravity + Gemini**.

**30-second check for evaluators**

1. `curl https://sign-se-pehle-767171449038.asia-south1.run.app/api/health` → `{"status":"ok","version":"0.3.0","ai":{"configured":true,…},"speech":{"voices":["google","sarvam","gemini"]}}`
2. Open the live app (or tap **Samples**), paste any clause (e.g. _"The tenant shall pay a security deposit of Rs. 1,50,000, refundable at the landlord's sole discretion."_), choose **Tenant**, press **Explain this document** — the report is labelled **Explained by Gemini** with the model name and timing.
3. Open the **Ask** tab and type a question — answers cite verified quotes or say _not in the document_. Then try **Negotiate** (fairer wording + a ready WhatsApp/email message) and **Next steps** (where to go, free legal aid check).
4. Clone and run with **zero keys**: `npm install && npm test && npm run build && npm start` → every feature works in labelled **offline mode**.

---

## Chosen Vertical

**AI for Legal Assistance & Access** — making legal documents understandable, comparable and
navigable for people who cannot easily reach a lawyer.

## The problem

- **Most Indians sign documents they cannot read.** Rent agreements, offer letters and loan papers
  are written in dense English legalese, while the ten Indic languages this app supports are the
  mother tongue of 87.8% of Indians (Census 2011).
- **One-sided clauses are routine and invisible.** Six-month deposits "refundable at the landlord's
  discretion", post-employment non-competes and foreclosure charges on floating-rate loans all
  conflict with Indian law or regulation — but nothing on the page says so.
- **Lawyers are expensive and far away.** Free legal aid exists (NALSA, Tele-Law, consumer
  commissions), yet people rarely know they qualify or what to ask.
- **Generic chatbots hallucinate.** An answer that invents a section number or a clause is worse
  than no answer when someone is about to sign.

## The solution

| Feature | What it does for the reader | Google service |
|---|---|---|
| **Explain any document** | Plain-language summary and clause-by-clause meaning, risk level and who each clause favours, in 11 languages | Gemini API (structured output) |
| **Read scans & photos** | Upload a PDF or a phone photo of a stamp-paper agreement; it is transcribed before analysis | Gemini multimodal (vision) |
| **Law-anchored red flags** | Deterministic rules check the document's numbers (deposit vs rent, notice periods, bonds, rates) against a curated table of Indian laws, each linked to India Code / RBI / IRDAI | — (tested core engine) |
| **Verified quotes** | Every quoted clause is located in your text; anything that cannot be found is labelled, never shown as a quote | — (tested core engine) |
| **Risk score & money at stake** | A 0–100 score with reasons and the rupees you could lose, computed from the document itself | — |
| **What-if simulator** | "What if I leave in month 4 / resign / prepay the loan?" — exact amounts from the document's numbers | — |
| **Ask this document** | Grounded Q&A that cites clauses, says "not in the document" when it is not, and refuses legal advice | Gemini API |
| **Compare two drafts** | What changed between versions, who each change favours, and a side-by-side table of the numbers | Gemini API |
| **Key dates → calendar** | Deadlines extracted from the document, one tap to add to Google Calendar | Google Calendar links |
| **Lawyer-ready questions** | A checklist before signing and questions to take to a lawyer or free legal-aid clinic | Gemini API |
| **Privacy shield** | Aadhaar, PAN, phone, email, bank and card numbers are redacted before any AI call; nothing is stored | — |
| **Document X-ray** | Your own text with every clause highlighted by risk; tap a highlight to jump to its plain-language explanation | — (verified quote spans) |
| **Negotiate** | Fairer wording for each risky clause plus a polite or firm message, ready for WhatsApp or email, in your language, with the official sources behind each request | Gemini API |
| **Next steps** | Where to go (legal aid, consumer commission, RBI, IRDAI, labour, cyber crime), nearest free legal aid on Google Maps, a free legal aid eligibility check that runs only on your device, and a reply-deadline countdown for legal notices | Google Maps links |
| **Listen & speak** | Hear the summary and answers read aloud in any of 11 Indian languages — independent of the language it was explained in — with a choice of voice (Google Translate’s free voice by default, Sarvam AI, or Gemini); ask questions by voice where the browser supports it | Google Translate (free) |
| **Lawyer brief** | A one-page printable brief (summary, red flags with sources, money, dates, questions) and a WhatsApp share of the questions | — |
| **Easy start** | One-tap sample documents, a camera button for phone photos, and plain meanings for legal jargon inside every clause | — |

## Approach and Logic

1. **GenAI reads; code decides; GenAI explains.** Gemini extracts structure (clauses, verbatim
   quotes, facts such as "deposit = ₹1,50,000", clause signals such as `entry-without-notice`).
   Deterministic, unit-tested rules turn those facts into warnings, and every warning's legal
   reference comes from a curated table — so the model can never invent a law.
2. **Trust layer.** Quotes are verified against the (redacted) source text with a normalised
   match plus a fuzzy window fallback; answers without a verified citation are downgraded to
   "not in the document".
3. **Honest fallback.** If Gemini is unavailable, a deterministic offline analyser produces the
   same report shape, clearly labelled **Offline rules**. It never returns sample data.
4. **Legal boundary by design.** Prompts forbid advice and outcome predictions; the Ask flow
   detects advice-seeking questions and points to a lawyer or free legal aid instead.

## How the Solution Works

```
Browser (React SPA, same origin)
   │  POST /api/analyze { document: text | PDF | photo, role, language }
   ▼
Cloud Run service (Express)                              packages/core (pure, tested)
   ├─ validate (zod, strict, size caps) ── rate limit ──┐
   ├─ file? → Gemini vision transcription               │
   ├─ redactPii() ──────────────────────────────────────┼─► privacy/redact.ts
   ├─ cache (SHA-256 key, LRU, 30 min)                  │
   ├─ Gemini structured output (failover chain) ────────┼─► genai/prompts.ts, model-output.ts
   │     └─ on failure → analyzeOffline() ──────────────┼─► offline/*
   └─ assembleAnalysis() ───────────────────────────────┴─► quote-verify, red-flags, score, money
   ▼
Report tabs: Overview · Red flags · Clauses · Ask · What if · Next steps · Negotiate · Brief
(+ Document X-ray beside the tabs; POST /api/negotiate calls Gemini again on demand;
POST /api/speech translates when needed and speaks with the reader's chosen voice)
```

## Assumptions Made

- Readers are ordinary people, not lawyers; explanations target a 14-year-old reading level.
- Indian law is the frame of reference. The Model Tenancy Act 2021 is a model law that applies
  only where a state has adopted it — the app says so wherever it cites it.
- Documents are up to ~60,000 characters (a 20–25 page agreement) or a 5 MB upload.
- Nothing is stored: documents live only in the request and a short in-memory cache.
- The app informs and prepares; it never tells anyone to sign, not sign, or sue.

## Problem Statement Alignment

| Suggested use case | Where it lives |
|---|---|
| Simplifying complex legal documents | Clause explanations + summary — `POST /api/analyze`, [`genai/prompts.ts`](packages/core/src/genai/prompts.ts) |
| Comparing contracts, agreements or policies | `/compare` page — `POST /api/compare`, [`engine/compare-facts.ts`](packages/core/src/engine/compare-facts.ts) |
| Highlighting clauses, obligations, risks, inconsistencies | Document X-ray, red flags, obligations, amount-in-words mismatch detector — [`engine/xray.ts`](packages/core/src/engine/xray.ts), [`engine/red-flags.ts`](packages/core/src/engine/red-flags.ts), [`engine/amount-words.ts`](packages/core/src/engine/amount-words.ts) |
| Answering questions from provided documents | Ask panel — `POST /api/ask`, [`pipeline/assemble-ask.ts`](packages/core/src/pipeline/assemble-ask.ts) |
| Understanding options and next steps | What-if simulator, Next steps tab (where to go, eligibility, reply deadline), Negotiate — [`engine/simulate.ts`](packages/core/src/engine/simulate.ts), [`knowledge/forums.ts`](packages/core/src/knowledge/forums.ts), [`engine/eligibility.ts`](packages/core/src/engine/eligibility.ts), [`engine/deadline.ts`](packages/core/src/engine/deadline.ts) |
| Summaries, checklists, actionable outputs | Checklist, key dates → Google Calendar, money at stake — [`integrations/google-links.ts`](packages/core/src/integrations/google-links.ts) |
| Preparing questions for a legal professional | Brief tab: lawyer questions, one-page printable brief, WhatsApp share — [`components/features/brief`](apps/web/src/components/features/brief) |

## GenAI Architecture

See [GENAI_ARCHITECTURE.md](GENAI_ARCHITECTURE.md) for the full mapping. In short: **Google Gemini
API** (`@google/genai`), server-side only, in [`apps/server/src/services/genai-client.ts`](apps/server/src/services/genai-client.ts),
used for (1) OCR of PDFs/photos, (2) structured clause-by-clause analysis, (3) grounded Q&A,
(4) draft comparison and (5) fairer wording and negotiation messages, plus (6) one of three
read-aloud voices ([`services/speech-client.ts`](apps/server/src/services/speech-client.ts)). Every
call has a model failover chain and a labelled fallback. In production Gemini is served through
**Vertex AI** on Google Cloud.

Read-aloud (item 6) is not Gemini-only: **Google Translate's free web API** speaks and translates
all 11 languages with no key and is the default voice; **Sarvam AI** (`bulbul:v3`) is an opt-in
Indian-voice alternative and the only voice that speaks Odia; **Gemini text-to-speech** is the
third option. The reader picks a voice and a listening language independently of the language the
document was explained in — see [`services/speech-service.ts`](apps/server/src/services/speech-service.ts),
[`services/google-free-client.ts`](apps/server/src/services/google-free-client.ts) and
[`services/sarvam-client.ts`](apps/server/src/services/sarvam-client.ts).

## Tech stack

| Layer | Choice |
|---|---|
| Language | TypeScript 6 (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) |
| Domain | `packages/core` — pure functions, zod 4 schemas shared by server and web |
| Server | Node 24, Express 5, helmet, compression, `@google/genai` |
| Web | React 19, Vite 8, React Router 7, plain CSS design tokens (no inline styles — strict CSP), self-hosted Inter + Fraunces variable fonts, route and panel code splitting |
| Testing | Vitest 5, Testing Library, supertest, Playwright + axe-core |
| Quality | ESLint 9 flat config (typescript-eslint strict, jsx-a11y strict, zero warnings), Prettier, jscpd |
| Delivery | One Docker image → Cloud Run (asia-south1) via Cloud Build; Secret Manager for the key |

## Quick start

```bash
npm install
npm test          # core + server + web suites
npm run build     # core → web → server
npm start         # http://localhost:8080 (offline mode without a key)
```

For live Gemini locally, copy `.env.example` to `apps/server/.env` and set `GEMINI_API_KEY`
(add `GOOGLE_GENAI_USE_VERTEXAI=true` when the key is a Vertex AI key). Read-aloud works with no
keys at all (Google Translate's free voice); add `SARVAM_API_KEY` for the Sarvam voice too.
Deploy: `scripts/deploy.sh <project-id> asia-south1` (Secret Manager + Cloud Build + smoke test).

## For evaluators

[ARCHITECTURE.md](ARCHITECTURE.md) · [GENAI_ARCHITECTURE.md](GENAI_ARCHITECTURE.md) ·
[SECURITY.md](SECURITY.md) · [TESTING.md](TESTING.md) · [ACCESSIBILITY.md](ACCESSIBILITY.md) ·
[EVALUATION_MAPPING.md](EVALUATION_MAPPING.md) · [CHANGELOG.md](CHANGELOG.md)

## License

MIT — see [LICENSE](LICENSE). Built for Google PromptWars (Hack2Skill) with Google Antigravity + Gemini.

> **Disclaimer:** Sign Se Pehle provides legal information to help you understand documents. It is
> not a law firm and does not give legal advice. For advice on your situation, consult an advocate
> or contact free legal aid (NALSA helpline **15100**).
