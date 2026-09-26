/**
 * Client-side upload checks and base64 reading.
 *
 * Responsibility: reject wrong types and oversize files before any bytes leave the
 * device, then read accepted files as base64 for the analyze request. Boundary: the
 * server re-validates everything; these checks exist for fast, friendly feedback.
 */
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  type Result,
  err,
  ok,
} from '@sign-se-pehle/core';

export type UploadMimeType = (typeof ALLOWED_UPLOAD_MIME_TYPES)[number];

/** Mirrors the 120-character fileName bound in core's documentInputSchema. */
const MAX_FILE_NAME_CHARS = 120;

const BYTES_PER_MEGABYTE = 1024 * 1024;

/** The upload limit in whole megabytes, for messages and hints. */
export const MAX_UPLOAD_MEGABYTES = Math.round(MAX_UPLOAD_BYTES / BYTES_PER_MEGABYTE);

/** The `accept` attribute value for the file input. */
export const UPLOAD_ACCEPT = ALLOWED_UPLOAD_MIME_TYPES.join(',');

/** An upload that passed client checks and is ready to send. */
export interface PreparedUpload {
  readonly mimeType: UploadMimeType;
  readonly fileName: string;
  readonly dataBase64: string;
}

/**
 * Checks type and size; returns the narrowed MIME type or a reader-facing message.
 * @example
 * validateUpload({ type: 'text/plain', size: 10 }); // err('Please choose a PDF…')
 */
export function validateUpload(file: {
  readonly type: string;
  readonly size: number;
}): Result<UploadMimeType, string> {
  const mimeType = ALLOWED_UPLOAD_MIME_TYPES.find((allowed) => allowed === file.type);
  if (mimeType === undefined) {
    return err('Please choose a PDF or a photo (JPG, PNG or WebP).');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return err(`That file is larger than ${MAX_UPLOAD_MEGABYTES} MB. Please choose a smaller one.`);
  }
  if (file.size === 0) return err('That file is empty. Please choose another one.');
  return ok(mimeType);
}

function readAsDataUrl(file: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

/**
 * Validates and reads a file as base64 (the data-URL prefix is stripped).
 * @example
 * const prepared = await prepareUpload(input.files[0]);
 */
export async function prepareUpload(file: File): Promise<Result<PreparedUpload, string>> {
  const checked = validateUpload(file);
  if (!checked.ok) return checked;
  const dataUrl = await readAsDataUrl(file);
  const base64 = dataUrl?.split(',')[1];
  if (base64 === undefined || base64.length === 0) {
    return err('We could not read that file. Please try again or paste the text instead.');
  }
  return ok({
    mimeType: checked.value,
    fileName: file.name.slice(0, MAX_FILE_NAME_CHARS) || 'document',
    dataBase64: base64,
  });
}
