# Evaluation mapping

Where each evaluation area is delivered, with a path for every claim.

## 1. Code Quality

- Pure, deterministic domain package with no I/O, clock or randomness → [`packages/core/src`](packages/core/src)
- Errors as values with a closed error taxonomy mapped to HTTP statuses in one table → [`result.ts`](packages/core/src/result.ts), [`errors.ts`](packages/core/src/errors.ts)
- One schema per contract, shared by server validation, web forms and AI output validation → [`schemas/`](packages/core/src/schemas)
- Table-driven rules keyed by closed unions (a missing case is a compile error) → [`knowledge/red-flag-rules.ts`](packages/core/src/knowledge/red-flag-rules.ts), [`domain/document-kinds.ts`](packages/core/src/domain/document-kinds.ts)
- Dependency injection: `buildApp(config, deps)`; `config.ts` is the only environment reader → [`apps/server/src/server.ts`](apps/server/src/server.ts), [`config.ts`](apps/server/src/config.ts)
- Strict TypeScript 6 (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) → [`tsconfig.base.json`](tsconfig.base.json)
- Repo-wide ESLint (typescript-eslint strict, jsx-a11y strict, react-hooks), zero warnings, inline suppressions disabled → [`eslint.config.js`](eslint.config.js)
- Duplication check (jscpd, threshold 0) → `npm run dup-check`
- Accessible primitives reused by every panel (WAI-ARIA tabs, choice groups, feature panels) → [`components/ui/Tabs.tsx`](apps/web/src/components/ui/Tabs.tsx), [`features/common`](apps/web/src/components/features/common)

## 2. Security

- PII redaction before AI calls → [`privacy/redact.ts`](packages/core/src/privacy/redact.ts)
- Nonce-fenced prompts and delimiter neutralisation → [`genai/prompt-boundary.ts`](packages/core/src/genai/prompt-boundary.ts)
- Strict CSP without `unsafe-inline`, COOP/CORP, HSTS, Permissions-Policy → [`apps/server/src/server.ts`](apps/server/src/server.ts)
- Strict request schemas and size caps → [`schemas/requests.ts`](packages/core/src/schemas/requests.ts), [`schemas/limits.ts`](packages/core/src/schemas/limits.ts)
- Rate limiting with a trusted single proxy hop → [`middleware/rate-limit.ts`](apps/server/src/middleware/rate-limit.ts)
- Secret Manager deployment, non-root container, SHA-pinned CI → [`scripts/deploy.sh`](scripts/deploy.sh), [`Dockerfile`](Dockerfile), [`.github/workflows/ci.yml`](.github/workflows/ci.yml)
- Threat model → [`SECURITY.md`](SECURITY.md)
- Negotiation re-redacts clause text and never lets the model cite law; speech text travels only in the POST body, is redacted before any translator or voice sees it, responses are `no-store`, CSP adds only `media-src 'self' blob:` → [`negotiation-service.ts`](apps/server/src/services/negotiation-service.ts), [`routes/speech.ts`](apps/server/src/routes/speech.ts)
- The Sarvam key sits only in Secret Manager or a gitignored `.env`, sent only in a request header, never a URL or log line; Google's free voice needs no key at all → [`services/sarvam-client.ts`](apps/server/src/services/sarvam-client.ts)
- Legal-aid eligibility runs on the device, so income and category answers are never sent → [`engine/eligibility.ts`](packages/core/src/engine/eligibility.ts)

## 3. Efficiency

- One Gemini call per analysis, flash-lite first, response cache, concurrency cap → [`services/analysis-service.ts`](apps/server/src/services/analysis-service.ts)
- Deterministic engine for rules, money and dates (no extra AI calls) → [`packages/core/src/engine`](packages/core/src/engine)
- Single stateless service, min 1 / max 3 instances → [`cloudbuild.yaml`](cloudbuild.yaml)
- Route- and tab-level code splitting (Compare, About, Next steps, Negotiate, Brief) → [`App.tsx`](apps/web/src/App.tsx), [`report/lazy-panels.ts`](apps/web/src/components/report/lazy-panels.ts)
- X-ray, glossary, eligibility and reply deadline computed in the browser from core (zero requests) → [`engine/xray.ts`](packages/core/src/engine/xray.ts), [`knowledge/glossary.ts`](packages/core/src/knowledge/glossary.ts)
- Self-hosted variable fonts, no third-party requests → [`main.tsx`](apps/web/src/main.tsx)
- Read-aloud's default voice needs no API key; long text is split and fetched a few parts at a time, not one huge call → [`services/google-free-client.ts`](apps/server/src/services/google-free-client.ts)
- Decisions table → [`ARCHITECTURE.md`](ARCHITECTURE.md#efficiency-decisions)

## 4. Testing

- Core unit tests, one file per module → [`packages/core/src/**/__tests__`](packages/core/src)
- Server integration tests (supertest against the real app with a fake Gemini client) → [`apps/server/src/__tests__`](apps/server/src)
- Web component tests (Testing Library, fixtures derived from core) → [`apps/web/src/__tests__`](apps/web/src)
- Browser journeys and axe scans of every report tab in both themes, desktop and phone (Playwright) → [`e2e/`](e2e)
- Details and counts → [`TESTING.md`](TESTING.md)

## 5. Accessibility

- Semantic structure, skip link, labelled controls, live regions, focus management, AA tokens, reduced motion, dark mode → [`apps/web/src`](apps/web/src), [`styles/tokens.css`](apps/web/src/styles/tokens.css)
- `eslint-plugin-jsx-a11y` strict in the lint gate → [`eslint.config.js`](eslint.config.js)
- Keyboard tabs (arrows, Home/End), a pause control for decorative motion (WCAG 2.2.2), glossary popovers that close on Escape, read-aloud in a choice of voice and language (independent of the language it was explained in) and voice input for low-literacy readers → [`ACCESSIBILITY.md`](ACCESSIBILITY.md#decisions-and-evidence)
- Details → [`ACCESSIBILITY.md`](ACCESSIBILITY.md)

## 6. Google Services

- Gemini on Vertex AI for OCR, analysis, Q&A, comparison and negotiation drafts, structured output, failover chain → [`services/genai-client.ts`](apps/server/src/services/genai-client.ts), [`GENAI_ARCHITECTURE.md`](GENAI_ARCHITECTURE.md)
- Gemini text-to-speech is one of three read-aloud voices → [`services/speech-client.ts`](apps/server/src/services/speech-client.ts)
- Google Translate's free web API is the default read-aloud voice and translator (no key, 10 of 11 languages) → [`services/google-free-client.ts`](apps/server/src/services/google-free-client.ts), [`google/service-catalog.ts`](packages/core/src/google/service-catalog.ts)
- Cloud Run, Cloud Build, Artifact Registry, Secret Manager, Cloud Logging → [`cloudbuild.yaml`](cloudbuild.yaml), [`scripts/deploy.sh`](scripts/deploy.sh)
- Google Calendar and Maps links (including nearest legal-aid office) → [`integrations/google-links.ts`](packages/core/src/integrations/google-links.ts)
- Machine-readable catalog served at `GET /api/google-services` → [`google/service-catalog.ts`](packages/core/src/google/service-catalog.ts)

## 7. Problem Statement Alignment

All seven suggested use cases map to working features — see the table in [`README.md`](README.md#problem-statement-alignment).
Beyond explaining, v0.2 helps the reader act: Document X-ray, a negotiation draft to send the other
side, a next-steps navigator (where to complain, free legal-aid check, legal-notice reply
countdown), read-aloud (in a choice of voice and any of 11 languages) and a one-page lawyer brief.
