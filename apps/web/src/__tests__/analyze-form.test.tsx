/**
 * Analyze form tests: empty start, the four input tabs, validation messages, the typed
 * payload, uploads, camera photos and samples (which fill the form but never submit, and
 * whose type and role never carry over to the reader's own document).
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { type AnalyzeRequest, MAX_UPLOAD_BYTES, MIN_DOCUMENT_CHARS } from '@sign-se-pehle/core';
import { AnalyzeForm } from '../components/analyze/AnalyzeForm';
import { SAMPLE_DOCUMENTS } from '../lib/samples';

/** A realistic clause long enough to pass the minimum-length check. */
const RENT_CLAUSE =
  '1. RENT. The Tenant shall pay a monthly rent of Rs. 20,000 (Rupees Twenty Thousand only) on or before the 5th day of every month.';

const INPUT_TABS = ['Paste', 'Upload', 'Camera', 'Samples'] as const;

/** The insurance sample: its kind and role differ from the rent clause the reader pastes. */
function insuranceSample(): (typeof SAMPLE_DOCUMENTS)[number] {
  const sample = SAMPLE_DOCUMENTS.find((candidate) => candidate.kind === 'insurance');
  if (sample === undefined) throw new Error('insurance sample missing');
  return sample;
}

function setup(): { onSubmit: ReturnType<typeof vi.fn<(payload: AnalyzeRequest) => void>> } {
  const onSubmit = vi.fn<(payload: AnalyzeRequest) => void>();
  render(<AnalyzeForm busy={false} onSubmit={onSubmit} />);
  return { onSubmit };
}

describe('AnalyzeForm', () => {
  it('starts empty on the Paste tab with no sample text', () => {
    setup();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([...INPUT_TABS]);
    expect(screen.getByRole('tab', { name: 'Paste' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Paste the document text')).toHaveValue('');
  });

  it('asks for input when nothing is provided', async () => {
    const { onSubmit } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Explain this document' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/paste the document text or upload/i);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the core minimum-length message for short text', async () => {
    const { onSubmit } = setup();
    await userEvent.type(screen.getByLabelText('Paste the document text'), 'Too short');
    await userEvent.click(screen.getByRole('button', { name: 'Explain this document' }));
    expect(screen.getByRole('alert')).toHaveTextContent(String(MIN_DOCUMENT_CHARS));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a typed text payload with role, language and kind', async () => {
    const { onSubmit } = setup();
    const user = userEvent.setup();
    await user.click(screen.getByLabelText('Paste the document text'));
    await user.paste(RENT_CLAUSE);
    await user.selectOptions(screen.getByLabelText(/Document type/), 'rental');
    await user.selectOptions(screen.getByLabelText(/I am the/), 'tenant');
    await user.selectOptions(screen.getByLabelText('Explain in'), 'hi');
    await user.click(screen.getByRole('button', { name: 'Explain this document' }));
    expect(onSubmit).toHaveBeenCalledWith({
      document: { type: 'text', text: RENT_CLAUSE },
      language: 'hi',
      role: 'tenant',
      kindHint: 'rental',
    });
  });

  it('rejects unsupported and oversize files before upload', async () => {
    setup();
    const user = userEvent.setup({ applyAccept: false });
    await user.click(screen.getByRole('tab', { name: 'Upload' }));
    const input = screen.getByLabelText('Upload a PDF or photo');
    await user.upload(input, new File(['hello'], 'notes.txt', { type: 'text/plain' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/PDF or a photo/);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const big = new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], 'scan.pdf', {
      type: 'application/pdf',
    });
    await user.upload(input, big);
    expect(screen.getByRole('alert')).toHaveTextContent(/larger than/);
  });

  it('sends an accepted file as base64 and lets the reader remove it', async () => {
    const { onSubmit } = setup();
    const user = userEvent.setup();
    const pdfBytes = '%PDF-1.4 sample';
    await user.click(screen.getByRole('tab', { name: 'Upload' }));
    await user.upload(
      screen.getByLabelText('Upload a PDF or photo'),
      new File([pdfBytes], 'agreement.pdf', { type: 'application/pdf' }),
    );
    expect(screen.getByText('agreement.pdf')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Explain this document' }));
    expect(onSubmit).toHaveBeenCalledWith({
      document: {
        type: 'file',
        mimeType: 'application/pdf',
        fileName: 'agreement.pdf',
        dataBase64: btoa(pdfBytes),
      },
      language: 'en',
    });
    await user.click(screen.getByRole('button', { name: 'Remove file' }));
    expect(screen.queryByText('agreement.pdf')).not.toBeInTheDocument();
  });

  it('uses a camera photo as the chosen file', async () => {
    setup();
    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: 'Camera' }));
    await user.upload(
      screen.getByLabelText(/Take a photo/),
      new File(['jpeg-bytes'], 'page-1.jpg', { type: 'image/jpeg' }),
    );
    expect(screen.getByText('page-1.jpg')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove file' })).toBeInTheDocument();
  });

  it('fills text, kind and role from a sample without submitting', async () => {
    const { onSubmit } = setup();
    const user = userEvent.setup();
    const sample = SAMPLE_DOCUMENTS[0];
    expect(sample).toBeDefined();
    if (sample === undefined) return;
    await user.click(screen.getByRole('tab', { name: 'Samples' }));
    await user.click(screen.getByRole('button', { name: new RegExp(`^${sample.label}`) }));
    const textarea = screen.getByLabelText('Paste the document text');
    expect(textarea).toHaveValue(sample.text);
    expect(textarea).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Paste' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText(/Document type/)).toHaveValue(sample.kind);
    expect(screen.getByLabelText(/I am the/)).toHaveValue(sample.role);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('drops the sample type and role once the reader pastes their own document', async () => {
    const { onSubmit } = setup();
    const user = userEvent.setup();
    const sample = insuranceSample();
    await user.click(screen.getByRole('tab', { name: 'Samples' }));
    await user.click(screen.getByRole('button', { name: new RegExp(`^${sample.label}`) }));
    await user.clear(screen.getByLabelText('Paste the document text'));
    await user.paste(RENT_CLAUSE);
    expect(screen.getByLabelText(/Document type/)).toHaveValue('');
    await user.click(screen.getByRole('button', { name: 'Explain this document' }));
    expect(onSubmit).toHaveBeenCalledWith({ document: { type: 'text', text: RENT_CLAUSE }, language: 'en' });
  });

  it('keeps the sample type and role while the reader edits a detail', async () => {
    setup();
    const user = userEvent.setup();
    const sample = insuranceSample();
    await user.click(screen.getByRole('tab', { name: 'Samples' }));
    await user.click(screen.getByRole('button', { name: new RegExp(`^${sample.label}`) }));
    await user.type(screen.getByLabelText('Paste the document text'), ' Extra clause.');
    expect(screen.getByLabelText(/Document type/)).toHaveValue(sample.kind);
    expect(screen.getByLabelText(/I am the/)).toHaveValue(sample.role);
  });

  it('keeps choices the reader made when a photo replaces the sample', async () => {
    setup();
    const user = userEvent.setup();
    const sample = insuranceSample();
    await user.click(screen.getByRole('tab', { name: 'Samples' }));
    await user.click(screen.getByRole('button', { name: new RegExp(`^${sample.label}`) }));
    await user.selectOptions(screen.getByLabelText(/Document type/), 'rental');
    await user.selectOptions(screen.getByLabelText('Explain in'), 'hi');
    await user.click(screen.getByRole('tab', { name: 'Camera' }));
    await user.upload(
      screen.getByLabelText(/Take a photo/),
      new File(['jpeg-bytes'], 'page-1.jpg', { type: 'image/jpeg' }),
    );
    expect(screen.getByLabelText(/Document type/)).toHaveValue('rental');
    expect(screen.getByLabelText(/I am the/)).toHaveValue('');
    expect(screen.getByLabelText('Explain in')).toHaveValue('hi');
  });
});
