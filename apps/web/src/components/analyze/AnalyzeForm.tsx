/**
 * The "explain this document" form: paste or upload, role, language and kind.
 *
 * Responsibility: collect input, validate it with the same core schema the server
 * uses and hand a typed AnalyzeRequest to the page. Boundary: no network here; the
 * page owns the request. The textarea always starts empty — nothing is prefilled.
 */
import { type FormEvent, type ReactElement, useState } from 'react';
import {
  type AnalyzeRequest,
  DEFAULT_LANGUAGE,
  MAX_DOCUMENT_CHARS,
  analyzeRequestSchema,
} from '@sign-se-pehle/core';
import { prepareUpload } from '../../lib/file';
import { DocumentOptions, type DocumentOptionsValue } from './DocumentOptions';
import { FileField } from './FileField';

interface AnalyzeFormProps {
  readonly busy: boolean;
  readonly onSubmit: (payload: AnalyzeRequest) => void;
}

const NUMBER_FORMAT = new Intl.NumberFormat('en-IN');
const EMPTY_INPUT_MESSAGE = 'Please paste the document text or upload a PDF or photo.';

export function AnalyzeForm({ busy, onSubmit }: AnalyzeFormProps): ReactElement {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [options, setOptions] = useState<DocumentOptionsValue>({
    role: undefined,
    language: DEFAULT_LANGUAGE,
    kind: undefined,
  });

  async function buildDocument(): Promise<AnalyzeRequest['document'] | string> {
    if (file !== null) {
      const prepared = await prepareUpload(file);
      return prepared.ok ? { type: 'file', ...prepared.value } : prepared.error;
    }
    return text.trim().length === 0 ? EMPTY_INPUT_MESSAGE : { type: 'text', text };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (busy) return;
    const document = await buildDocument();
    if (typeof document === 'string') {
      setFormError(document);
      return;
    }
    const parsed = analyzeRequestSchema.safeParse({
      document,
      language: options.language,
      ...(options.role === undefined ? {} : { role: options.role }),
      ...(options.kind === undefined ? {} : { kindHint: options.kind }),
    });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? EMPTY_INPUT_MESSAGE);
      return;
    }
    setFormError(null);
    onSubmit(parsed.data);
  }

  return (
    <form
      className="card analyze-form"
      aria-busy={busy}
      noValidate
      onSubmit={(event) => void handleSubmit(event)}
    >
      <h2>Your document</h2>
      <div className="field">
        <label htmlFor="document-text">Paste the document text</label>
        <textarea
          id="document-text"
          value={text}
          rows={10}
          spellCheck={false}
          placeholder="Paste the full text of your rent agreement, offer letter, loan or insurance document…"
          aria-describedby="document-text-count"
          aria-invalid={formError !== null && file === null}
          onChange={(event) => setText(event.target.value)}
        />
        <p id="document-text-count" className="field__hint field__counter">
          {NUMBER_FORMAT.format(text.length)} / {NUMBER_FORMAT.format(MAX_DOCUMENT_CHARS)}{' '}
          characters
        </p>
      </div>
      <FileField
        id="document-file"
        file={file}
        error={fileError}
        onChange={(picked, error) => {
          setFile(picked);
          setFileError(error);
        }}
      />
      <DocumentOptions idPrefix="analyze" value={options} onChange={setOptions} />
      {formError !== null ? (
        <p className="field__error" role="alert">
          {formError}
        </p>
      ) : null}
      <button
        type="submit"
        className="button button--primary button--large"
        aria-disabled={busy}
        aria-busy={busy}
      >
        {busy ? 'Explaining…' : 'Explain this document'}
      </button>
    </form>
  );
}
