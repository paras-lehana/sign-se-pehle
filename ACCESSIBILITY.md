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
| Visible focus ring on every interactive element (`:focus-visible`) | [`base.css`](apps/web/src/styles/base.css) | 2.4.7, 2.4.11 |
| Touch targets ≥ 44 × 44 CSS px | `--touch-target` token | 2.5.8 (and 2.5.5 AAA) |
| Reduced motion honoured (`prefers-reduced-motion`): animations off, smooth scrolling off, the X-ray jump is instant | [`primitives.css`](apps/web/src/styles/primitives.css), [`ReportWorkspace.tsx`](apps/web/src/components/report/ReportWorkspace.tsx) | 2.3.3 |
| Light and dark themes (system preference + toggle) | [`tokens.css`](apps/web/src/styles/tokens.css) | 1.4.3 |
| Reflows to 320 px wide without horizontal scrolling; text resizes to 200% | Mobile-first CSS with relative units | 1.4.10, 1.4.4 |
| `lang` on the document; explanations in 11 languages with Indic font fallbacks | `index.html`, language picker | 3.1.1, 3.1.2 |
| Report tabs follow the WAI-ARIA tabs pattern: roving tabindex, Arrow keys (wrapping), Home / End, `aria-controls` / `aria-labelledby` | [`components/ui/Tabs.tsx`](apps/web/src/components/ui/Tabs.tsx) | 2.1.1, 4.1.2 |
| A header button pauses all decorative motion (mesh drift, scan illustration, marquee); the choice is remembered | [`components/layout/MotionToggle.tsx`](apps/web/src/components/layout/MotionToggle.tsx) | 2.2.2 |
| X-ray highlights are real buttons named "Clause: …, high risk"; the document box is keyboard-scrollable | [`components/features/xray`](apps/web/src/components/features/xray) | 2.1.1, 1.3.1 |
| Glossary terms open popovers with `aria-expanded`; Escape, the close button or a click outside closes them and returns focus | [`components/features/glossary`](apps/web/src/components/features/glossary) | 1.4.13, 2.4.3 |
| Read-aloud buttons use `aria-pressed` and announce status; voice input only appears where the browser supports it | [`components/features/listen`](apps/web/src/components/features/listen) | 4.1.3 |
| Legal-aid check uses native checkboxes in a fieldset with a visible legend | [`components/features/next-steps`](apps/web/src/components/features/next-steps) | 1.3.1, 3.3.2 |
| Lint gate includes `eslint-plugin-jsx-a11y` (strict) | [`eslint.config.js`](eslint.config.js) | — |

## Token contrast (computed)

Dark is the default theme; light is the paper theme. Glass surfaces are translucent, so each is
composited over the page background before measuring.

| Pair | Dark | Ratio | Light | Ratio |
|---|---|---|---|---|
| Body text on page | `#f1efe8` on `#0b0c1d` | 16.83:1 | `#15132b` on `#f6f3ec` | 16.34:1 |
| Body text on glass card | `#f1efe8` on `#1a1b2b` | 14.77:1 | `#15132b` on `#fcfaf8` | 17.39:1 |
| Muted text on glass card | `#b9b6cc` on `#1a1b2b` | 8.60:1 | `#4b4763` on `#fcfaf8` | 8.47:1 |
| Links on glass card | `#b8b9ff` on `#1a1b2b` | 9.24:1 | `#3434a8` on `#fcfaf8` | 9.16:1 |
| Primary (indigo) text on page | `#a5a6ff` on `#0b0c1d` | 8.76:1 | `#3a3aa6` on `#f6f3ec` | 8.11:1 |
| Accent (saffron) text on page | `#f5b94d` on `#0b0c1d` | 11.00:1 | `#8f4a00` on `#f6f3ec` | 6.02:1 |
| Primary button text on its fill | `#1b1305` on `#f5b94d` | 10.45:1 | `#ffffff` on `#2e2f86` | 11.25:1 |
| High-risk chip | `#ffb4b8` on `#3b1822` | 9.31:1 | `#9b1c28` on `#fde2e3` | 6.63:1 |
| Medium-risk chip | `#ffd27d` on `#3a2a10` | 9.72:1 | `#7a4600` on `#fcecd0` | 6.68:1 |
| Low-risk chip | `#86e3b0` on `#0f3326` | 8.96:1 | `#1c6a3e` on `#dcf2e4` | 5.62:1 |
| Focus ring on page (non-text, needs 3:1) | `#f5b94d` on `#0b0c1d` | 11.00:1 | `#a14d00` on `#f6f3ec` | 5.30:1 |
| Input border on page (non-text, needs 3:1) | `#8e8aa8` on `#0b0c1d` | 5.86:1 | `#7d7893` on `#f6f3ec` | 3.81:1 |

Ratios are computed with the WCAG 2.x relative-luminance formula from the hex values in
[`tokens.css`](apps/web/src/styles/tokens.css).

## Keyboard map

| Context | Keys | Behaviour |
|---|---|---|
| Any page | `Tab` / `Shift+Tab` | Skip link first, then header navigation, then content in reading order |
| Clause list | `Enter` / `Space` on a clause heading | Expands or collapses the clause (native `<details>`/button semantics) |
| Forms | `Enter` in a single-line field | Submits the form |
| Theme toggle | `Enter` / `Space` | Switches light/dark and announces the new state |
| Report tabs | `←` / `→`, `Home` / `End` | Moves between tabs; the panel follows the selected tab |
| Glossary popover | `Enter` / `Space`, `Esc` | Opens a term's meaning; Escape closes it and returns focus to the term |
| Motion toggle | `Enter` / `Space` | Pauses or resumes decorative animation |
