/**
 * Sample documents: data quality (valid requests, realistic length, flags found) and the
 * chips that load them without submitting.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MIN_DOCUMENT_CHARS, analyzeRequestSchema, redactPii } from '@sign-se-pehle/core';
import { SampleDocuments } from '../../components/features/samples/SampleDocuments';
import { SAMPLE_DOCUMENTS } from '../../lib/samples';
import { analyseText } from './feature-fixtures';

/** The samples are meant to read like real documents: 500–1,000 characters each. */
const MIN_SAMPLE_CHARS = 500;
const MAX_SAMPLE_CHARS = 1_000;
const EXPECTED_SAMPLES = 5;

describe('SAMPLE_DOCUMENTS', () => {
  it('has five samples with unique ids and kinds', () => {
    expect(SAMPLE_DOCUMENTS).toHaveLength(EXPECTED_SAMPLES);
    expect(new Set(SAMPLE_DOCUMENTS.map((sample) => sample.id)).size).toBe(EXPECTED_SAMPLES);
    expect(new Set(SAMPLE_DOCUMENTS.map((sample) => sample.kind)).size).toBe(EXPECTED_SAMPLES);
  });

  it.each(SAMPLE_DOCUMENTS)('$id is a valid analyse request of realistic length', (sample) => {
    expect(sample.text.length).toBeGreaterThanOrEqual(
      Math.max(MIN_DOCUMENT_CHARS, MIN_SAMPLE_CHARS),
    );
    expect(sample.text.length).toBeLessThanOrEqual(MAX_SAMPLE_CHARS);
    const parsed = analyzeRequestSchema.safeParse({
      document: { type: 'text', text: sample.text },
      language: 'en',
      role: sample.role,
      kindHint: sample.kind,
    });
    expect(parsed.success).toBe(true);
  });

  it.each(SAMPLE_DOCUMENTS)('$id shows off at least two red flags offline', (sample) => {
    const analysis = analyseText(sample.text, sample.kind, sample.role);
    expect(analysis.kind).toBe(sample.kind);
    expect(analysis.flags.length).toBeGreaterThanOrEqual(2);
  });

  it('includes one sample whose dummy PAN and phone number get redacted', () => {
    const withPii = SAMPLE_DOCUMENTS.filter((sample) => {
      const types = redactPii(sample.text).redactions.map((count) => count.type);
      return types.includes('pan') && types.includes('phone');
    });
    expect(withPii).toHaveLength(1);
  });
});

describe('SampleDocuments', () => {
  it('fills the form through onPick and never submits it', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    const onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault());
    render(
      <form aria-label="Workspace" onSubmit={(event) => onSubmit(event.nativeEvent)}>
        <SampleDocuments onPick={onPick} />
      </form>,
    );
    const [first] = SAMPLE_DOCUMENTS;
    if (first === undefined) throw new Error('No samples');
    const chip = screen.getByRole('button', { name: new RegExp(`^${first.label}`) });
    expect(chip).toHaveAttribute('aria-pressed', 'false');

    await user.click(chip);

    expect(onPick).toHaveBeenCalledWith(first);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('status')).toHaveTextContent(
      `Loaded the ${first.label.toLowerCase()} sample`,
    );
  });

  it('renders one chip per sample', () => {
    render(<SampleDocuments onPick={vi.fn()} />);
    for (const sample of SAMPLE_DOCUMENTS) {
      expect(
        screen.getByRole('button', { name: new RegExp(`^${sample.label}`) }),
      ).toBeInTheDocument();
    }
  });
});
