/**
 * Lazily loaded report panels.
 *
 * Responsibility: split the heavier tab panels into their own chunks. Boundary: each is
 * rendered inside a Suspense boundary by the report tabs, and only once its tab is opened.
 */
import { lazy } from 'react';

// Efficiency: Next steps (forum routes, eligibility, deadline maths) loads only when opened.
export const LazyNextStepsPanel = lazy(async () => {
  const module = await import('../features/next-steps/NextStepsPanel');
  return { default: module.NextStepsPanel };
});

// Efficiency: Negotiate (drafting form + result table) loads only when opened.
export const LazyNegotiatePanel = lazy(async () => {
  const module = await import('../features/negotiate/NegotiatePanel');
  return { default: module.NegotiatePanel };
});

// Efficiency: the printable brief loads with the Brief tab, not with the first report paint.
export const LazyLawyerBrief = lazy(async () => {
  const module = await import('../features/brief/LawyerBrief');
  return { default: module.LawyerBrief };
});
