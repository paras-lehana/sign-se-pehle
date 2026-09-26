/**
 * Response-schema adapter for Gemini structured output.
 *
 * Responsibility: turn a core zod schema into a JSON Schema the Gemini API accepts.
 * Verified live: array bounds (`maxItems`/`minItems`) on the nested analysis schema make
 * every Gemini 3 model reject the request with HTTP 400, while the same schema without
 * them works. Boundary: bounds are still enforced afterwards by the zod parse.
 */
import { toGeminiSchema } from '@sign-se-pehle/core';
import type { z } from 'zod';

/** JSON Schema keywords removed before sending (see file header for why). */
const UNSUPPORTED_KEYWORDS: ReadonlySet<string> = new Set(['maxItems', 'minItems']);

/** Keywords whose value maps property names to schemas — those names are data, not keywords. */
const PROPERTY_MAP_KEYWORD = 'properties';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stripKeywords(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(stripKeywords);
  if (!isRecord(node)) return node;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === PROPERTY_MAP_KEYWORD && isRecord(value)) {
      result[key] = Object.fromEntries(Object.entries(value).map(([name, child]) => [name, stripKeywords(child)]));
    } else if (!UNSUPPORTED_KEYWORDS.has(key)) {
      result[key] = stripKeywords(value);
    }
  }
  return result;
}

/**
 * Builds the JSON Schema sent as `responseJsonSchema`.
 * @example
 * const jsonSchema = toModelResponseSchema(askModelOutputSchema);
 */
export function toModelResponseSchema(schema: z.ZodType): unknown {
  return stripKeywords(toGeminiSchema(schema));
}
