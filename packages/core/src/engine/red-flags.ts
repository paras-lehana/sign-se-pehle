/**
 * Red-flag engine — runs the rule table against one document.
 *
 * Responsibility: decide which rules apply to the reader (perspective), run them,
 * attach the curated law reference and sort by severity. Boundary: deterministic and
 * pure; rules themselves live in knowledge/.
 */
import { RISK_WEIGHT } from '../domain/clauses.js';
import { LAWS } from '../knowledge/laws.js';
import { RED_FLAG_RULES } from '../knowledge/red-flag-rules.js';
import type { RedFlagRule, RuleContext } from '../knowledge/rule-types.js';
import type { RedFlag } from '../schemas/analysis.js';
import { isDefaultPerspective } from '../schemas/facts.js';

/**
 * True when a rule should run for this reader: kind-specific rules protect the kind's
 * default (weaker) role, while 'all' rules protect every reader.
 * @example
 * ruleApplies(depositRule, { kind: 'rental', role: 'landlord', ... }); // false
 */
export function ruleApplies(rule: RedFlagRule, ctx: RuleContext): boolean {
  if (rule.kinds === 'all') return true;
  return rule.kinds.includes(ctx.kind) && isDefaultPerspective(ctx.kind, ctx.role);
}

/**
 * Evaluates every applicable rule and returns law-anchored flags, most severe first.
 * The sort is stable, so equally severe flags keep rule-table order.
 * @example
 * evaluateRedFlags({ kind: 'rental', role: 'tenant', facts: { monthlyRentInr: 20000, securityDepositInr: 200000 }, clauses: [] });
 */
export function evaluateRedFlags(ctx: RuleContext, rules: readonly RedFlagRule[] = RED_FLAG_RULES): RedFlag[] {
  const flags = rules.flatMap((rule): RedFlag[] => {
    if (!ruleApplies(rule, ctx)) return [];
    const hit = rule.test(ctx);
    if (hit === null) return [];
    const base = { ruleId: rule.id, severity: rule.severity, ...hit };
    return [rule.lawId === undefined ? base : { ...base, law: LAWS[rule.lawId] }];
  });
  return flags.sort((a, b) => RISK_WEIGHT[b.severity] - RISK_WEIGHT[a.severity]);
}
