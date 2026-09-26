# Security

Sign Se Pehle handles documents people are about to sign — rent agreements, offer letters, loan
papers — so it is built to see as little as possible, keep nothing, and never let untrusted text
steer the AI.

## Threat model

| # | Threat | Mitigation | Where |
|---|---|---|---|
| 1 | Personal data (Aadhaar, PAN, phone, email, bank, card, UPI) reaching the AI provider or logs | Redacted **before** any Gemini analysis call; only redaction counts are returned and logged | [`packages/core/src/privacy/redact.ts`](packages/core/src/privacy/redact.ts) |
| 2 | Prompt injection inside a document or question ("ignore previous instructions…") | Untrusted text wrapped in per-request nonce delimiters; lookalike delimiters and fake role headers neutralised; system prompt declares fenced text as data; strict JSON output schema | [`genai/prompt-boundary.ts`](packages/core/src/genai/prompt-boundary.ts), [`genai/prompts.ts`](packages/core/src/genai/prompts.ts) |
| 3 | Hallucinated laws or quotes misleading a reader | The model is forbidden to cite law; references come only from the curated table via deterministic rules; every quote is located in the source text before it is shown as a quote | [`knowledge/laws.ts`](packages/core/src/knowledge/laws.ts), [`engine/quote-verify.ts`](packages/core/src/engine/quote-verify.ts) |
| 4 | Malformed or oversized input (crash, cost blow-up) | zod strict schemas on every endpoint (unknown keys rejected); text ≤ 60,000 chars; uploads ≤ 5 MB with a MIME allow-list **and a magic-byte signature check** (a renamed executable is rejected); JSON body 64 KB except 8 MB on `/api/analyze` | [`schemas/requests.ts`](packages/core/src/schemas/requests.ts), [`schemas/file-signature.ts`](packages/core/src/schemas/file-signature.ts), [`schemas/limits.ts`](packages/core/src/schemas/limits.ts) |
| 5 | Validation errors reflecting attacker input (XSS via error text) | Error messages are fixed, code-derived strings; input is never echoed | [`apps/server/src/middleware`](apps/server/src/middleware) |
| 6 | Abuse / cost exhaustion of the billable AI | Per-IP token-bucket rate limits (stricter on AI routes), in-flight concurrency cap, response cache for identical requests, `trust proxy` = 1 hop (spoofed `X-Forwarded-For` chains cannot mint new buckets) | [`apps/server/src/middleware/rate-limit.ts`](apps/server/src/middleware/rate-limit.ts) |
| 7 | XSS / clickjacking in the web app | Strict Content-Security-Policy with **no `unsafe-inline`** (`script-src 'self'; style-src 'self'`), `frame-ancestors 'none'`, COOP/CORP same-origin, HSTS, nosniff, Referrer-Policy, Permissions-Policy; React escapes all rendered text; no `dangerouslySetInnerHTML` | [`apps/server/src/server.ts`](apps/server/src/server.ts) |
| 8 | Secret leakage | Key only in Secret Manager, mounted by reference; `.env` gitignored; key never logged, never in URLs, never in error text; config is the only `process.env` reader | [`apps/server/src/config.ts`](apps/server/src/config.ts), [`scripts/deploy.sh`](scripts/deploy.sh) |
| 9 | Upstream error details leaking internals | Gemini failures mapped to `UPSTREAM_FAILURE` / `UPSTREAM_TIMEOUT` with user-safe copy; stack traces never sent | [`packages/core/src/errors.ts`](packages/core/src/errors.ts) |
| 10 | Supply chain | Lockfile + `npm ci`; `npm audit` reports 0 vulnerabilities (production and dev); CI audit gate; GitHub Actions pinned to commit SHAs with read-only tokens; minimal runtime image running as the non-root `node` user | [`.github/workflows/ci.yml`](.github/workflows/ci.yml), [`Dockerfile`](Dockerfile) |
| 11 | Vulnerable code or dependencies reaching `main` | CodeQL (`security-extended` queries) on every push, pull request and weekly; Dependabot weekly updates for npm, GitHub Actions and the Docker base image | [`.github/workflows/codeql.yml`](.github/workflows/codeql.yml), [`.github/dependabot.yml`](.github/dependabot.yml) |
| 12 | Protocol downgrade / cookie stripping | HSTS with `includeSubDomains` and `preload` (2-year max-age) | [`apps/server/src/server.ts`](apps/server/src/server.ts) |

## Data handling

- **Nothing is persisted.** No database, no file storage. A document exists only for the request
  and in a bounded in-memory cache (50 entries, 30 minutes) keyed by a SHA-256 of the redacted text.
- **Logs** are one structured JSON line per request: severity, method, route pattern, status and
  latency. Never bodies, never document text, never questions.
- **The browser keeps the report** in memory only; closing the tab discards it.

## Error envelope

Every error has the same shape and a status from one table
([`HTTP_STATUS_BY_CODE`](packages/core/src/errors.ts)):

```json
{ "error": { "code": "VALIDATION_FAILED", "message": "Some details look incomplete. Please check the highlighted fields." } }
```

## Responsible AI

- **Information, not advice.** Prompts forbid recommendations and outcome predictions; advice-seeking
  questions ("should I sign?", "will I win?") get a referral to an advocate or free legal aid (NALSA 15100).
- **Provenance everywhere.** Each response says whether Gemini or the offline rules produced it,
  which model answered and how long it took.
- **Hedged legal references.** Model laws (e.g. the Model Tenancy Act, 2021) are labelled as
  applying only where a state has adopted them.

## Reporting a vulnerability

Please open a private security advisory on GitHub (Security → Advisories → Report a vulnerability).
We aim to acknowledge within 7 days.
