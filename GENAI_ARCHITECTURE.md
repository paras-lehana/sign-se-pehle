# GenAI Architecture

Sign Se Pehle uses **Google Gemini** for the five jobs that need language understanding (reading,
explaining, answering, comparing, negotiating), and deterministic, unit-tested code for everything
that must be exact (law references, money, dates, quote verification). Gemini is called **only
from the server**; the browser never sees a key or a prompt. Read-aloud (below) is a sixth job but
deliberately is not Gemini-exclusive: Google Translate's free voice is the default so listening
never depends on any key at all, Sarvam AI is an opt-in alternative, and Gemini text-to-speech is
the third choice.

## Where Gemini is used

| # | Job | Endpoint | Prompt builder | Output contract | Post-processing |
|---|---|---|---|---|---|
| 1 | Read PDFs and phone photos (OCR) | `POST /api/analyze` (file input) | `buildTranscriptionPrompt` in [`packages/core/src/genai/prompts.ts`](packages/core/src/genai/prompts.ts) | Plain text | PII redaction ([`privacy/redact.ts`](packages/core/src/privacy/redact.ts)) before any further AI call |
| 2 | Explain the document clause by clause | `POST /api/analyze` | `buildAnalysisPrompt` | `analysisModelOutputSchema` in [`genai/model-output.ts`](packages/core/src/genai/model-output.ts), sent as `responseJsonSchema` | Quote verification, law-anchored red flags, score, money at stake ([`pipeline/assemble-analysis.ts`](packages/core/src/pipeline/assemble-analysis.ts)) |
| 3 | Answer questions about the document | `POST /api/ask` | `buildAskPrompt` | `askModelOutputSchema` | Cited quotes verified; unverified answers downgraded to "not in the document" ([`pipeline/assemble-ask.ts`](packages/core/src/pipeline/assemble-ask.ts)) |
| 4 | Compare two drafts | `POST /api/compare` | `buildComparePrompt` | `compareModelOutputSchema` | Numbers compared deterministically ([`engine/compare-facts.ts`](packages/core/src/engine/compare-facts.ts)) |
| 5 | Fairer wording + a ready message | `POST /api/negotiate` | `buildNegotiationPrompt` | `negotiationModelOutputSchema` | Each proposed change must match a real clause quote; law references are attached from the flags, never from the model ([`pipeline/assemble-negotiation.ts`](packages/core/src/pipeline/assemble-negotiation.ts)); offline drafter if Gemini is unavailable |

Text calls go through one gateway, [`apps/server/src/services/genai-client.ts`](apps/server/src/services/genai-client.ts).
It uses the `@google/genai` SDK (`models.generateContent`); in production the SDK is pointed at
**Vertex AI** (`GOOGLE_GENAI_USE_VERTEXAI=true`), so usage is billed and governed by the Google
Cloud project.

## Read-aloud: translate, then speak, in one of three voices

`POST /api/speech` is not a Gemini-only feature — [`services/speech-service.ts`](apps/server/src/services/speech-service.ts)
orchestrates a translator and a voice, both chosen from a shared table in
[`packages/core/src/speech/voices.ts`](packages/core/src/speech/voices.ts):

| Step | What happens | Where |
|---|---|---|
| 1. Redact | The text is masked the same way as any document text, before any third party sees it | [`privacy/redact.ts`](packages/core/src/privacy/redact.ts) |
| 2. Translate (only if needed) | When the reader's listening language differs from the language the text is already in, it is translated first — Sarvam's own translator for the Sarvam voice, Google Translate's free translator otherwise | [`services/google-free-client.ts`](apps/server/src/services/google-free-client.ts), [`services/sarvam-client.ts`](apps/server/src/services/sarvam-client.ts) |
| 3. Speak | The chosen voice speaks; if it cannot (wrong language, no key, an upstream failure) the service falls back through the other voices that speak that language, in a fixed order | [`services/speech-service.ts`](apps/server/src/services/speech-service.ts) |
| 4. Label | The response carries which voice actually spoke (`X-Speech-Voice`) and whether the text was translated (`X-Speech-Translated`), so the UI's status line is always accurate | [`routes/speech.ts`](apps/server/src/routes/speech.ts) |

| Voice | Engine | Key required | Languages | Notes |
|---|---|---|---|---|
| Google Translate (free, default) | Google's public web endpoints (no API, no key) | None | 10 of 11 (no Odia) | Long text is split at sentence ends and fetched a few parts at a time; MP3 parts are joined |
| Sarvam AI | Sarvam's Bulbul TTS (`bulbul:v3`) | `SARVAM_API_KEY` (optional) | All 11, including Odia | The only voice Odia readers can use |
| Gemini | Gemini text-to-speech | `GEMINI_API_KEY` | 6 of 11 | PCM wrapped as WAV ([`audio/wav.ts`](packages/core/src/audio/wav.ts)) |

The browser's own `speechSynthesis` is the last-resort fallback when every server voice fails or
the network is down (`apps/web/src/lib/speech.ts`); this is unchanged from earlier versions.

## Models and failover

| Setting | Value | Why |
|---|---|---|
| Primary | `gemini-3.5-flash-lite` | ~4 s for a full structured analysis of a two-page agreement in our benchmark |
| Fallbacks | `gemini-3.1-flash-lite`, `gemini-3.5-flash` | Tried in order on 429 / 5xx / timeout; the last healthy model is remembered |
| Speech (Gemini voice only) | `gemini-3.1-flash-tts-preview`, then `gemini-2.5-flash-preview-tts` | ≈3 s for a short summary in our tests; voice "Kore" |
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
| Vertex AI | Serves every Gemini text call and the Gemini voice for the deployed app |
| Cloud Run (asia-south1, mirror in asia-south2) | Hosts the single service (API + web, same origin), min 1 instance so there is no cold start |
| Cloud Build + Artifact Registry | Builds the image from [`Dockerfile`](Dockerfile) via [`cloudbuild.yaml`](cloudbuild.yaml) and runs a post-deploy smoke test |
| Secret Manager | Holds `GEMINI_API_KEY` and, optionally, `SARVAM_API_KEY`, both mounted by reference; least-privilege accessor bindings ([`scripts/deploy.sh`](scripts/deploy.sh)) |
| Cloud Logging | Structured JSON request logs (severity, route pattern, status, latency — never document text) |
| Google Calendar / Maps links | Key dates open a pre-filled Google Calendar event; legal-aid search opens Google Maps |
