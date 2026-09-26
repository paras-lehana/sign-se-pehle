# GenAI Architecture

Sign Se Pehle uses **Google Gemini** for the four jobs that need language understanding, and
deterministic, unit-tested code for everything that must be exact (law references, money,
dates, quote verification). Gemini is called **only from the server**; the browser never sees a
key or a prompt.

## Where Gemini is used

| # | Job | Endpoint | Prompt builder | Output contract | Post-processing |
|---|---|---|---|---|---|
| 1 | Read PDFs and phone photos (OCR) | `POST /api/analyze` (file input) | `buildTranscriptionPrompt` in [`packages/core/src/genai/prompts.ts`](packages/core/src/genai/prompts.ts) | Plain text | PII redaction ([`privacy/redact.ts`](packages/core/src/privacy/redact.ts)) before any further AI call |
| 2 | Explain the document clause by clause | `POST /api/analyze` | `buildAnalysisPrompt` | `analysisModelOutputSchema` in [`genai/model-output.ts`](packages/core/src/genai/model-output.ts), sent as `responseJsonSchema` | Quote verification, law-anchored red flags, score, money at stake ([`pipeline/assemble-analysis.ts`](packages/core/src/pipeline/assemble-analysis.ts)) |
| 3 | Answer questions about the document | `POST /api/ask` | `buildAskPrompt` | `askModelOutputSchema` | Cited quotes verified; unverified answers downgraded to "not in the document" ([`pipeline/assemble-ask.ts`](packages/core/src/pipeline/assemble-ask.ts)) |
| 4 | Compare two drafts | `POST /api/compare` | `buildComparePrompt` | `compareModelOutputSchema` | Numbers compared deterministically ([`engine/compare-facts.ts`](packages/core/src/engine/compare-facts.ts)) |

All calls go through one gateway: [`apps/server/src/services/genai-client.ts`](apps/server/src/services/genai-client.ts)
(`@google/genai` SDK, `models.generateContent`).

## Models and failover

| Setting | Value | Why |
|---|---|---|
| Primary | `gemini-3.5-flash-lite` | ~4 s for a full structured analysis of a two-page agreement in our benchmark |
| Fallbacks | `gemini-3.1-flash-lite`, `gemini-3.5-flash` | Tried in order on 429 / 5xx / timeout; the last healthy model is remembered |
| Output | `responseMimeType: application/json` + `responseJsonSchema` generated from zod (`z.toJSONSchema`) | One schema is the source of truth for the model contract and runtime validation |
| Validation | Every response is parsed with the same zod schema | Malformed output never reaches the reader |
| Fallback | Deterministic offline analyser ([`packages/core/src/offline`](packages/core/src/offline)) | Same report shape, labelled **Offline rules** in the UI |

## Safety and grounding

- **Untrusted text is fenced.** The document and the question are wrapped in per-request nonce
  delimiters ([`genai/prompt-boundary.ts`](packages/core/src/genai/prompt-boundary.ts)); lookalike
  delimiters and fake "system" headers are neutralised first.
- **The model cannot cite law.** Prompts forbid legal citations; every legal reference shown to
  the reader comes from the curated table in [`knowledge/laws.ts`](packages/core/src/knowledge/laws.ts),
  selected by deterministic rules in [`knowledge/red-flag-rules.ts`](packages/core/src/knowledge/red-flag-rules.ts).
- **No advice.** System instructions forbid recommendations and outcome predictions; advice-seeking
  questions are answered with a referral to an advocate or free legal aid.
- **Provenance on every response.** `provenance.mode` (`gemini` | `offline`), the model that
  answered and per-step timings are returned and displayed.

## Google Cloud around the model

| Service | Role |
|---|---|
| Cloud Run (asia-south1) | Hosts the single service (API + web, same origin), min 1 instance so there is no cold start |
| Cloud Build + Artifact Registry | Builds the image from [`Dockerfile`](Dockerfile) via [`cloudbuild.yaml`](cloudbuild.yaml) and runs a post-deploy smoke test |
| Secret Manager | Holds `GEMINI_API_KEY`, mounted by reference; least-privilege accessor binding ([`scripts/deploy.sh`](scripts/deploy.sh)) |
| Cloud Logging | Structured JSON request logs (severity, route pattern, status, latency — never document text) |
| Google Calendar / Maps links | Key dates open a pre-filled Google Calendar event; legal-aid search opens Google Maps |
