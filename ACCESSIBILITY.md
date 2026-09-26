# Accessibility

**Target:** WCAG 2.2 Level AA. The people who most need help with legal documents include
first-time readers, older adults, people reading in a second language and people on low-end
phones — so the interface is built for keyboards, screen readers, zoom and small screens first.

## Decisions and evidence

| Decision | Implementation | WCAG |
|---|---|---|
| Skip link to main content, landmarks (`header`, `nav`, `main`, `footer`) | Layout components in [`apps/web/src/components/layout`](apps/web/src/components/layout) | 2.4.1, 1.3.1 |
| One `h1` per page; sections `h2`; items `h3` | Pages and report sections | 1.3.1, 2.4.6 |
| Every input has a visible `<label>`; hints linked with `aria-describedby` | Analyze and Compare forms | 1.3.1, 3.3.2 |
| Progress and results announced via a polite live region; errors use `role="alert"` | Analyze flow | 4.1.3 |
| Focus moves to the report heading when results load | Report view | 2.4.3 |
| Risk is never colour-only: every severity chip has text and an icon | Red flags, clause cards, score band | 1.4.1 |
| Verified vs paraphrased quotes labelled in text | Clause cards | 1.3.3 |
| Visible focus ring on every interactive element (`:focus-visible`) | [`global.css`](apps/web/src/styles/global.css) | 2.4.7, 2.4.11 |
| Touch targets ≥ 44 × 44 CSS px | `--touch-target` token | 2.5.8 (and 2.5.5 AAA) |
| Reduced motion honoured (`prefers-reduced-motion`) | [`global.css`](apps/web/src/styles/global.css) | 2.3.3 |
| Light and dark themes (system preference + toggle) | [`tokens.css`](apps/web/src/styles/tokens.css) | 1.4.3 |
| Reflows to 320 px wide without horizontal scrolling; text resizes to 200% | Mobile-first CSS with relative units | 1.4.10, 1.4.4 |
| `lang` on the document; explanations in 11 languages with Indic font fallbacks | `index.html`, language picker | 3.1.1, 3.1.2 |
| Lint gate includes `eslint-plugin-jsx-a11y` (strict) | [`eslint.config.js`](eslint.config.js) | — |

## Token contrast (computed)

| Pair | Light | Ratio | Dark | Ratio |
|---|---|---|---|---|
| Body text on page | `#1d1b2f` on `#fbf7ef` | 15.72:1 | `#f3efe6` on `#14152e` | 15.56:1 |
| Body text on card | `#1d1b2f` on `#ffffff` | 16.80:1 | `#f3efe6` on `#1d1f42` | 13.79:1 |
| Muted text on card | `#4f4a60` on `#ffffff` | 8.46:1 | `#c9c3d8` on `#1d1f42` | 9.26:1 |
| Muted text on alt surface | `#4f4a60` on `#f3ecdf` | 7.20:1 | `#c9c3d8` on `#262952` | 8.07:1 |
| Button text on primary | `#ffffff` on `#2b2d6e` | 12.33:1 | `#14152e` on `#b9bcff` | 9.95:1 |
| Text on accent | `#1d1b2f` on `#e8a33d` | 7.79:1 | `#14152e` on `#f2b85b` | 10.02:1 |
| Links on card | `#2f3aa8` on `#ffffff` | 9.16:1 | `#b9c2ff` on `#1d1f42` | 9.21:1 |
| High-risk chip | `#a1262c` on `#fbe3e3` | 6.08:1 | `#ffa4a4` on `#43222b` | 7.39:1 |
| Medium-risk chip | `#7a4f00` on `#fdf0d5` | 6.31:1 | `#f5c979` on `#3d3220` | 8.07:1 |
| Low-risk chip | `#25613a` on `#e1f2e5` | 6.33:1 | `#93dba5` on `#1f3a2c` | 7.60:1 |
| Focus ring on page (non-text, needs 3:1) | `#b35c00` on `#fbf7ef` | 4.42:1 | `#f2b85b` on `#14152e` | 10.02:1 |

Ratios are computed with the WCAG 2.x relative-luminance formula from the hex values in
[`tokens.css`](apps/web/src/styles/tokens.css).

## Keyboard map

| Context | Keys | Behaviour |
|---|---|---|
| Any page | `Tab` / `Shift+Tab` | Skip link first, then header navigation, then content in reading order |
| Clause list | `Enter` / `Space` on a clause heading | Expands or collapses the clause (native `<details>`/button semantics) |
| Forms | `Enter` in a single-line field | Submits the form |
| Theme toggle | `Enter` / `Space` | Switches light/dark and announces the new state |
