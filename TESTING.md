# Testing

Every layer is tested against the real code paths with no network: the server suite builds the
production Express app with a fake Gemini client and a fake clock, and web tests render real
components with fixtures produced by the core engine itself.

## Layer matrix

| Layer | Tooling | Lives in | What it proves | Run |
|---|---|---|---|---|
| Core unit | Vitest | [`packages/core/src/**/__tests__`](packages/core/src) | Rules fire at the right thresholds, money/what-if arithmetic, quote verification, amount-in-words parsing, PII redaction, prompt boundary, offline analyser, assembly pipeline | `npm run test:core` |
| Server integration | Vitest + supertest | [`apps/server/src/__tests__`](apps/server/src) | Validation envelopes never echo input, size limits, Gemini path and offline fallback, cache hits, verified citations, rate limiting, security headers, SPA fallback, model failover | `npm run test:server` |
| Web component | Vitest + Testing Library + jsdom | [`apps/web/src/__tests__`](apps/web/src) | Form validation and payloads, report rendering, ask and what-if panels, compare page, API response validation and error mapping | `npm run test:web` |
| End-to-end | Playwright (desktop + Pixel 7) | [`e2e/journey.spec.ts`](e2e/journey.spec.ts) | Live typing into an empty form → report, ask with citation, advice boundary, empty-input error, compare | `npm run e2e` |
| Accessibility | Playwright + axe-core (WCAG 2.0/2.1/2.2 A/AA) | [`e2e/a11y.spec.ts`](e2e/a11y.spec.ts) | No serious/critical violations on every route and the report, in light and dark themes | `npm run a11y` |

**Latest local run:** 298 automated tests pass — core 215 (7 files), server 52 (8 files), web 31 (7 files). Coverage: core 97.5% lines / 90.2% branches; server 99.2% lines / 87.4% branches.

`npm run type-check` compiles sources, tests and e2e specs under the same strict settings, and
`npm run test:coverage` enforces per-workspace coverage thresholds.

## Design choices that make tests honest

- **Fixtures are derived, not typed in.** Expected values come from the engine under test
  (for example `monthlyEmi(...)` or `assembleAnalysis(analyzeOffline(...))`), so a fixture can
  never silently disagree with the code.
- **No clock mocking in core.** Core never reads the clock; time is a parameter.
- **The real app, fake edges.** `buildApp(config, deps)` is the production factory; tests inject
  a fake Gemini client, clock and log sink.
- **Offline mode is a first-class fixture.** The deterministic analyser gives stable,
  realistic reports for component and e2e tests without any key.
- **E2E can target production.** `E2E_BASE_URL=https://… npm run e2e` runs the same journeys
  against the deployed Cloud Run service.
