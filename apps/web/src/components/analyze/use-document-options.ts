/**
 * Role, language and kind for the analyze form, plus the rule that a sample's own type and
 * role apply only while the sample's text is still in the box.
 *
 * Responsibility: own the options state so a sample's choices never carry over to the
 * reader's own document — the kind hint overrides Gemini's classification, so a stale
 * "Health insurance" would analyse a rent agreement against the wrong rules. Boundary: text
 * and files stay in AnalyzeForm, which reports changes here.
 */
import { useState } from 'react';
import { type AnalyzeRequest, DEFAULT_LANGUAGE } from '@sign-se-pehle/core';
import type { SampleDocument } from '../../lib/samples';
import type { DocumentOptionsValue } from './DocumentOptions';

/** The opening characters identify a sample; editing a detail further down keeps its options. */
const SAMPLE_OPENING_CHARS = 40;

interface SampleChoice {
  readonly opening: string;
  readonly kind: SampleDocument['kind'];
  readonly role: SampleDocument['role'];
}

export interface DocumentOptionsState {
  readonly options: DocumentOptionsValue;
  readonly setOptions: (next: DocumentOptionsValue) => void;
  /** Applies a sample's kind and role, keeping the reader's language. */
  readonly applySample: (sample: SampleDocument) => void;
  /** Reports new text: once the sample's opening is gone, the sample's choices reset. */
  readonly textChanged: (text: string) => void;
  /** Reports that the reader chose their own file or photo. */
  readonly leaveSample: () => void;
}

/**
 * The request fields the options produce; "automatic" choices are simply left out.
 * @example
 * toRequestOptions({ language: 'en', role: undefined, kind: 'rental' }); // { language: 'en', kindHint: 'rental' }
 */
export function toRequestOptions(
  options: DocumentOptionsValue,
): Pick<AnalyzeRequest, 'language' | 'role' | 'kindHint'> {
  return {
    language: options.language,
    ...(options.role === undefined ? {} : { role: options.role }),
    ...(options.kind === undefined ? {} : { kindHint: options.kind }),
  };
}

/**
 * Options state for the analyze form.
 * @example
 * const { options, applySample, textChanged } = useDocumentOptions();
 */
export function useDocumentOptions(): DocumentOptionsState {
  const [options, setOptions] = useState<DocumentOptionsValue>({
    role: undefined,
    language: DEFAULT_LANGUAGE,
    kind: undefined,
  });
  const [sample, setSample] = useState<SampleChoice | null>(null);

  function leaveSample(): void {
    if (sample === null) return;
    // Only the sample's own choices go back to automatic; anything the reader changed stays.
    setOptions({
      language: options.language,
      kind: options.kind === sample.kind ? undefined : options.kind,
      role: options.role === sample.role ? undefined : options.role,
    });
    setSample(null);
  }

  return {
    options,
    setOptions,
    applySample(picked) {
      setOptions({ language: options.language, kind: picked.kind, role: picked.role });
      setSample({
        opening: picked.text.slice(0, SAMPLE_OPENING_CHARS),
        kind: picked.kind,
        role: picked.role,
      });
    },
    textChanged(text) {
      if (sample !== null && !text.includes(sample.opening)) leaveSample();
    },
    leaveSample,
  };
}
