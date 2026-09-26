/**
 * Role, explanation-language and document-kind pickers.
 *
 * Responsibility: three labelled selects driven by the core vocabularies so the web
 * never re-types a role, language or kind. Boundary: controlled inputs; the parent
 * owns the values and turns "not chosen" into an omitted request field.
 */
import type { ReactElement } from 'react';
import {
  DOCUMENT_KINDS,
  type DocumentKind,
  KIND_PROFILES,
  LANGUAGE_CODES,
  LANGUAGES,
  type LanguageCode,
  ROLE_LABELS,
  USER_ROLES,
  type UserRole,
} from '@sign-se-pehle/core';

export interface DocumentOptionsValue {
  readonly role: UserRole | undefined;
  readonly language: LanguageCode;
  readonly kind: DocumentKind | undefined;
}

interface DocumentOptionsProps {
  readonly idPrefix: string;
  readonly value: DocumentOptionsValue;
  readonly onChange: (next: DocumentOptionsValue) => void;
  /** Compare has no kind picker; the analyser detects it from both drafts. */
  readonly showKind?: boolean;
}

const AUTO = '';

function parseRole(raw: string): UserRole | undefined {
  return USER_ROLES.find((role) => role === raw);
}

function parseKind(raw: string): DocumentKind | undefined {
  return DOCUMENT_KINDS.find((kind) => kind === raw);
}

function parseLanguage(raw: string, fallback: LanguageCode): LanguageCode {
  return LANGUAGE_CODES.find((code) => code === raw) ?? fallback;
}

export function DocumentOptions({
  idPrefix,
  value,
  onChange,
  showKind = true,
}: DocumentOptionsProps): ReactElement {
  const roles = value.kind === undefined ? USER_ROLES : KIND_PROFILES[value.kind].roles;

  return (
    <div className="options-grid">
      <div className="field">
        <label htmlFor={`${idPrefix}-role`}>I am the…</label>
        <select
          id={`${idPrefix}-role`}
          value={value.role ?? AUTO}
          onChange={(event) => onChange({ ...value, role: parseRole(event.target.value) })}
        >
          <option value={AUTO}>Work it out from the document</option>
          {roles.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-language`}>Explain in</label>
        <select
          id={`${idPrefix}-language`}
          value={value.language}
          onChange={(event) =>
            onChange({ ...value, language: parseLanguage(event.target.value, value.language) })
          }
        >
          {LANGUAGE_CODES.map((code) => (
            <option key={code} value={code} lang={LANGUAGES[code].bcp47}>
              {code === 'en'
                ? LANGUAGES[code].englishName
                : `${LANGUAGES[code].nativeName} (${LANGUAGES[code].englishName})`}
            </option>
          ))}
        </select>
      </div>
      {showKind ? (
        <div className="field">
          <label htmlFor={`${idPrefix}-kind`}>Document type (optional)</label>
          <select
            id={`${idPrefix}-kind`}
            value={value.kind ?? AUTO}
            onChange={(event) => {
              const kind = parseKind(event.target.value);
              const roleFits =
                kind === undefined || value.role === undefined
                  ? true
                  : KIND_PROFILES[kind].roles.includes(value.role);
              onChange({ ...value, kind, role: roleFits ? value.role : undefined });
            }}
          >
            <option value={AUTO}>Detect automatically</option>
            {DOCUMENT_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {KIND_PROFILES[kind].label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}
