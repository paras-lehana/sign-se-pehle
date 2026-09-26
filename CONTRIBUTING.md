# Contributing

## Setup

```bash
npm install
npm run build
npm start            # http://localhost:8080
```

`npm run dev` runs the API with hot reload and the Vite dev server (proxying `/api`).

## Before you open a pull request

```bash
npm run type-check   # source, tests and e2e specs under strict TypeScript
npm run lint         # ESLint, zero warnings, no inline suppressions allowed
npm test             # core, server and web suites
npm run format:check
npm run dup-check    # jscpd: no copy-pasted blocks
```

## House rules

- **Errors are values.** Core returns `Result<T, AppError>`; nothing in core throws for expected failures.
- **One source per fact.** Limits live in `schemas/limits.ts`, laws in `knowledge/laws.ts`, kinds in
  `domain/document-kinds.ts`. Never re-type a number the core exports.
- **Comments say why.** Every file opens with its responsibility and boundary; numbers carry a reason or source.
- **The model explains; code decides.** Never let model output choose a law reference, an amount or a date calculation.
- **Tests ride along.** Every module has a test file; fixtures are derived from the code under test.
- **Legal boundary.** Copy informs and prepares — it never tells a reader to sign, refuse or sue.

## Reporting security issues

See [SECURITY.md](SECURITY.md).
