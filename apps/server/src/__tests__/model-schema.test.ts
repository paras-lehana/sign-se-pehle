import { analysisModelOutputSchema } from '@sign-se-pehle/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { toModelResponseSchema } from '../services/model-schema.js';

describe('toModelResponseSchema', () => {
  it('removes array bounds everywhere but keeps property names and other keywords', () => {
    const schema = z.object({ maxItems: z.array(z.string().max(5)).max(3), nested: z.object({ list: z.array(z.number()).min(1) }) });
    const json = JSON.stringify(toModelResponseSchema(schema));
    expect(json).not.toMatch(/"(?:maxItems|minItems)":\d/);
    expect(json).toContain('"maxItems":{');
    expect(json).toContain('"maxLength":5');
  });

  it('produces a schema without $schema or additionalProperties for the analysis output', () => {
    const json = JSON.stringify(toModelResponseSchema(analysisModelOutputSchema));
    expect(json).not.toContain('$schema');
    expect(json).not.toContain('additionalProperties');
    expect(json).not.toContain('"maxItems"');
  });
});
