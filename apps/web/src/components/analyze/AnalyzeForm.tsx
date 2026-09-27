/**
 * The "explain this document" form: input tabs (paste, upload, camera, samples) beside
 * role, language and kind.
 *
 * Responsibility: collect input, validate it with the same core schema the server uses
 * and hand a typed AnalyzeRequest to the page. Boundary: no network here; the page owns
 * the request. The textarea always starts empty — samples fill it only when chosen.
 */
import { type FormEvent, type ReactElement, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { type AnalyzeRequest, analyzeRequestSchema } from '@sign-se-pehle/core';
import { prepareUpload, validateUpload } from '../../lib/file';
import type { SampleDocument } from '../../lib/samples';
import { Icon } from '../ui/Icon';
import { DocumentOptions } from './DocumentOptions';
import { type InputTabId, InputTabs } from './InputTabs';
import { SelectedFile } from './SelectedFile';
import { toRequestOptions, useDocumentOptions } from './use-document-options';

interface AnalyzeFormProps {
  readonly busy: boolean;
  readonly onSubmit: (payload: AnalyzeRequest) => void;
}

const EMPTY_INPUT_MESSAGE = 'Please paste the document text or upload a PDF or photo.';
const FILE_ERROR_ID = 'document-file-error';

export function AnalyzeForm({ busy, onSubmit }: AnalyzeFormProps): ReactElement {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<InputTabId>('paste');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [fileError, setFileError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const { options, setOptions, applySample, textChanged, leaveSample } = useDocumentOptions();

  function chooseFile(picked: File | null, error: string | null): void {
    if (picked !== null) leaveSample();
    setFile(picked);
    setFileError(error);
  }

  function clearFile(): void {
    chooseFile(null, null);
    setFileKey((key) => key + 1);
  }

  function takePhoto(photo: File): void {
    const checked = validateUpload(photo);
    chooseFile(checked.ok ? photo : null, checked.ok ? null : checked.error);
  }

  function pickSample(sample: SampleDocument): void {
    // flushSync so the Paste panel is visible before focus moves into its textarea.
    flushSync(() => {
      setText(sample.text);
      applySample(sample);
      clearFile();
      setFormError(null);
      setTab('paste');
      setStatus(`Sample loaded: ${sample.label}. Review it, then choose Explain this document.`);
    });
    textareaRef.current?.focus();
  }

  function changeText(next: string): void {
    setText(next);
    textChanged(next);
  }

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
    const parsed = analyzeRequestSchema.safeParse({ document, ...toRequestOptions(options) });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? EMPTY_INPUT_MESSAGE);
      return;
    }
    setFormError(null);
    onSubmit(parsed.data);
  }

  return (
    <form
      className="analyze-form glass glass--blur"
      aria-label="Your document"
      aria-busy={busy}
      noValidate
      onSubmit={(event) => void handleSubmit(event)}
    >
      <div className="analyze-form__input">
        <InputTabs
          selected={tab}
          onSelect={setTab}
          text={text}
          textInvalid={formError !== null && file === null}
          onTextChange={changeText}
          textareaRef={textareaRef}
          fileKey={fileKey}
          fileErrorId={FILE_ERROR_ID}
          fileInvalid={fileError !== null}
          onUpload={chooseFile}
          onPhoto={takePhoto}
          onPickSample={pickSample}
        />
        <SelectedFile file={file} error={fileError} errorId={FILE_ERROR_ID} onRemove={clearFile} />
        <p className="visually-hidden" role="status">
          {status}
        </p>
      </div>
      <div className="analyze-form__side">
        <DocumentOptions idPrefix="analyze" value={options} onChange={setOptions} />
        {formError !== null ? (
          <p className="field__error" role="alert">
            {formError}
          </p>
        ) : null}
        <button
          type="submit"
          className="button button--cta button--large button--block"
          aria-disabled={busy}
          aria-busy={busy}
        >
          {busy ? 'Explaining…' : 'Explain this document'}
        </button>
        <p className="analyze-form__privacy">
          <Icon name="lock" className="analyze-form__privacy-icon" />
          Aadhaar, PAN, phone and bank numbers are masked before any AI sees the text.
        </p>
      </div>
    </form>
  );
}
