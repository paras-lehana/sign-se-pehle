# Architecture

Three layers with a strict dependency direction: **web → server → core**, and core depends on
nothing but zod. Everything that must be exact lives in core as pure functions; understanding a
document's meaning goes through one Gemini gateway in the server, while read-aloud (which only
needs to speak, not understand) goes through whichever of three interchangeable voice engines the
reader picked.

## Layer diagram

```
┌──────────────────── Cloud Run service (asia-south1, mirrored in asia-south2) ────────────────┐
│                                                                                              │
│  apps/web (React 19 SPA, static)             apps/server (Express 5)                         │
│  ─ Workspace: input tabs, X-ray + report ──► /api/analyze  /api/ask  /api/compare           │
│    tabs (Overview · Red flags · Clauses · same /api/simulate /api/negotiate /api/speech     │
│    Ask · What if · Next steps · Negotiate origin /api/health /api/google-services           │
│    · Brief) · Compare / About (lazy)              │                                          │
│  ─ validates responses with core zod              ├─ middleware: helmet CSP · rate limit ·   │
│  ─ on-device: eligibility, deadline, X-ray,       │  validate (zod) · request log · errors   │
│    glossary (core functions, no request)          ├─ services/genai-client.ts ──► Gemini     │
│                                                   ├─ services/speech-service.ts (voice +     │
│                                                   │  translator: Google free · Sarvam ·       │
│                                                   │  Gemini, chosen by the reader)             │
│                                                   └─ services/analysis- · negotiation-service │
│                                                           │                                  │
│  packages/core (pure: no I/O, no clock, no randomness) ◄──┘                                  │
│  ─ schemas (zod) · knowledge (laws, red-flag rules, glossary, forums) · engine (red flags,   │
│    score, money, what-if, quote verification, X-ray segments, legal-aid eligibility, reply   │
│    deadline, retrieval) · privacy (PII redaction) · genai (prompts, nonce boundary, output   │
│    schemas) · offline analyser + negotiator · pipeline assembly · audio (PCM → WAV)          │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```
**Why this shape**

- **One deployable.** The web build is served by the same Express process as the API, so the
  browser only ever calls relative `/api/*` paths. There is no cross-service URL to bake in or
  misconfigure, and no CORS surface at all.
- **Core is the product.** Rules, money maths, quote verification and redaction are pure and
  unit-tested; the server is a thin adapter and the web is a view. The same zod schemas validate
  requests on the server, form input in the browser and every AI response.
- **Dependency injection.** `buildApp(config, deps)` receives the Gemini client, clock and log sink,
  so tests run the real app against fakes with no network.

## Analysis data flow

```
request ─► zod validate ─► (file? Gemini vision transcription) ─► redactPii ─► cache lookup
        ─► Gemini structured output (failover chain) ──┐
                         └─ failure/unconfigured ─► analyzeOffline (same shape, labelled)
        ─► assembleAnalysis: ids · locateQuote (verify + spans) · amount-in-words mismatches
                             · evaluateRedFlags (curated law refs) · computeScore · money at stake
        ─► analysisSchema.parse (wire contract guaranteed) ─► response with provenance
```

**Negotiate** reuses the same gate: the risky clauses from the report are re-redacted, one Gemini
call proposes fairer wording plus a ready message, `assembleNegotiation` keeps only changes whose
`current` text matches a real clause quote and attaches law references from the curated table
(the model never cites law), and `negotiateOffline` answers with the same shape if Gemini fails.

**Speech** takes at most 1,500 characters in the POST body and is redacted like any document
text. If the reader's listening language differs from the text's own language, it is translated
first (Sarvam's own translator for the Sarvam voice, Google Translate's free translator
otherwise); then the reader's chosen voice speaks — Google Translate's free voice (default, no
key, all languages but Odia), Sarvam (all 11, including Odia), or Gemini text-to-speech (PCM
wrapped as WAV by `pcmToWav`) — falling back through the others, in order, on any failure. The
response names which voice actually spoke and whether the text was translated
(`X-Speech-Voice`, `X-Speech-Translated`) and is `Cache-Control: no-store`. If every voice fails,
the browser falls back to its own device speech synthesis.

## Efficiency decisions

| Decision | Where | Why |
|---|---|---|
| One Gemini call per analysis (plus one transcription call only for uploads) | `analysis-service.ts` | Latency and cost scale with calls, not features — rules, score and money are local |
| Flash-lite model first, failover chain | `config.ts`, `genai-client.ts` | ~4 s full analysis in our benchmark vs ~27 s for a thinking model |
| Response cache keyed by SHA-256 of redacted text + role + language (LRU 50, 30 min) | `analysis-service.ts` | Re-opening or re-running the same document costs nothing |
| In-flight concurrency cap per instance, 429 beyond | `analysis-service.ts` | Bounded memory and spend under bursts |
| Input caps (60k chars, 5 MB) and output token caps | `schemas/limits.ts`, `genai-client.ts` | Bounded work per request |
| Stateless server, no database | whole server | Horizontal scaling with no sessions; nothing to secure at rest |
| Deterministic engine in core, not LLM | `packages/core/src/engine` | Exact, instant, free, testable |
| Static assets with immutable caching + gzip | `server.ts` | Repeat visits load from cache |
| Route- and tab-level code splitting (`React.lazy`): Compare, About, Next steps, Negotiate, Brief | `App.tsx`, `report/lazy-panels.ts` | The first report paint ships only what it shows |
| Eligibility, reply deadline, X-ray segments and glossary run in the browser from core | `features/*`, `packages/core/src/engine` | Zero requests, instant, and sensitive answers never leave the device |
| Negotiation works from the report already in memory (no re-analysis); one call, offline fallback | `negotiation-service.ts` | One extra call only when the reader asks for it |
| Speech is on demand, capped at 1,500 characters; the default voice needs no API key at all | `routes/speech.ts`, `services/google-free-client.ts` | Audio is generated only for what the reader presses Listen on, and read-aloud works even with zero keys configured |
| Long read-aloud text is split at sentence ends and its parts fetched a few at a time, not one huge call | `speech/chunks.ts`, `google-free-client.ts` | Bounded per-request size against Google's free endpoint; still one JS event loop tick, not N sequential round trips |
| Self-hosted variable fonts (npm `@fontsource-variable`), no external requests | `apps/web/src/main.tsx` | No third-party round trip; CSP stays `'self'` |
| No UI framework CSS runtime; plain CSS tokens | `apps/web/src/styles` | Small bundle, strict CSP compatible |
| min 1 / max 3 Cloud Run instances, 512 MiB | `cloudbuild.yaml` | No cold start for judges; spend capped |
| asia-south1 (Mumbai) | `cloudbuild.yaml` | Closest region to Indian users |

## Error handling contract

Core returns `Result<T, AppError>`; the server maps `AppError.code` to an HTTP status in one table
and sends `{ error: { code, message } }`. `internalHint` is logged, never sent. The web client
turns every non-2xx into a typed `ApiError` and shows the user-safe message in an accessible alert.
