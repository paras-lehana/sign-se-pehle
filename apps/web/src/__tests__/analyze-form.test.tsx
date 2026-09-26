/**
 * Analyze form tests: empty start, validation messages and the typed payload.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { type AnalyzeRequest, MAX_UPLOAD_BYTES, MIN_DOCUMENT_CHARS } from '@sign-se-pehle/core';
import { AnalyzeForm } from '../components/analyze/AnalyzeForm';

/** A realistic clause long enough to pass the minimum-length check. */
const RENT_CLAUSE =
  '1. RENT. The Tenant shall pay a monthly rent of Rs. 20,000 (Rupees Twenty Thousand only) on or before the 5th day of every month.';

function setup(): { onSubmit: ReturnType<typeof vi.fn<(payload: AnalyzeRequest) => void>> } {
  const onSubmit = vi.fn<(payload: AnalyzeRequest) => void>();
  render(<AnalyzeForm busy={false} onSubmit={onSubmit} />);
  return { onSubmit };
}

describe('AnalyzeForm', () => {
  it('starts empty with no sample text', () => {
    setup();
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
    const input = screen.getByLabelText('Or upload a PDF or photo');
    await user.upload(input, new File(['hello'], 'notes.txt', { type: 'text/plain' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/PDF or a photo/);
    const big = new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], 'scan.pdf', {
      type: 'application/pdf',
    });
    await user.upload(input, big);
    expect(screen.getByRole('alert')).toHaveTextContent(/larger than/);
  });

  it('sends an accepted file as base64', async () => {
    const { onSubmit } = setup();
    const user = userEvent.setup();
    const pdfBytes = '%PDF-1.4 sample';
    await user.upload(
      screen.getByLabelText('Or upload a PDF or photo'),
      new File([pdfBytes], 'agreement.pdf', { type: 'application/pdf' }),
    );
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
  });
});
