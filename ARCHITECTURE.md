# Architecture

Three layers with a strict dependency direction: **web → server → core**, and core depends on
nothing but zod. Everything that must be exact lives in core as pure functions; everything that
needs language understanding goes through one Gemini gateway in the server.

## Layer diagram

```
┌────────────────────────────── Cloud Run service (asia-south1) ──────────────────────────────┐
│                                                                                              │
│  apps/web (React 19 SPA, static)            apps/server (Express 5)                          │
│  ─ Analyze / Report / Ask / What-if    ──►   /api/analyze  /api/ask  /api/compare            │
│  ─ Compare / About                    same   /api/simulate /api/health /api/google-services  │
│  ─ validates responses with core zod  origin   │                                             │
│                                                ├─ middleware: helmet CSP · rate limit ·      │
│                                                │  validate (zod) · request log · errors      │
│                                                ├─ services/genai-client.ts ──► Gemini API    │
│                                                └─ services/analysis-service.ts               │
│                                                        │                                     │
│  packages/core (pure: no I/O, no clock, no randomness) ◄┘                                    │
│  ─ schemas (zod) · knowledge (laws, red-flag rules) · engine (red flags, score, money,       │
│    what-if, quote verification, amount-in-words, retrieval) · privacy (PII redaction) ·      │
│    genai (prompts, nonce boundary, output schemas) · offline analyser · pipeline assembly    │
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
| No UI framework CSS runtime; plain CSS tokens | `apps/web/src/styles` | Small bundle, strict CSP compatible |
| min 1 / max 3 Cloud Run instances, 512 MiB | `cloudbuild.yaml` | No cold start for judges; spend capped |
| asia-south1 (Mumbai) | `cloudbuild.yaml` | Closest region to Indian users |

## Error handling contract

Core returns `Result<T, AppError>`; the server maps `AppError.code` to an HTTP status in one table
and sends `{ error: { code, message } }`. `internalHint` is logged, never sent. The web client
turns every non-2xx into a typed `ApiError` and shows the user-safe message in an accessible alert.
