/**
 * Risk words and icons for feature panels.
 *
 * Responsibility: one wording of each RiskLevel for the X-ray, brief and share text, so
 * risk is always spelled out in words next to any colour. Boundary: presentation copy only.
 */
import type { RiskLevel } from '@sign-se-pehle/core';

/** "High" / "Medium" / "Low" — combined with "risk" by callers where a sentence needs it. */
export const RISK_WORDS: Readonly<Record<RiskLevel, string>> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

/** Shape icons differ per level so the meaning survives greyscale printing and colour blindness. */
export const RISK_ICONS: Readonly<Record<RiskLevel, string>> = {
  high: '⚠',
  medium: '◆',
  low: 'ℹ',
};
