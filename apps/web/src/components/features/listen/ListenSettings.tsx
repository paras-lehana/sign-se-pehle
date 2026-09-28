/**
 * Voice and listening-language pickers for read-aloud.
 *
 * Responsibility: let the reader pick which voice speaks (Google's free voice by default,
 * or Sarvam's Indian voices, or Gemini) and which of the 11 languages to listen in,
 * independently of the language the document was explained in. Boundary: display only —
 * every Listen button on the page reads the same stored choice at the moment it is
 * pressed, so one picker here governs all of them; nothing is sent until Listen is pressed.
 */
import { type ChangeEvent, type ReactElement, useState } from 'react';
import {
  LANGUAGE_CODES,
  type LanguageCode,
  SPEECH_VOICES,
  type SpeechVoice,
  VOICE_PROFILES,
  languageLabel,
} from '@sign-se-pehle/core';
import {
  initialListenLanguagePreference,
  initialVoicePreference,
  storeListenLanguagePreference,
  storeVoicePreference,
} from '../../layout/preferences';

/** Sentinel option value for "listen in whatever language it was explained in". */
const SAME_AS_DOCUMENT = 'same';

export function ListenSettings(): ReactElement {
  const [voice, setVoice] = useState<SpeechVoice>(initialVoicePreference);
  const [listenLanguage, setListenLanguage] = useState<LanguageCode | undefined>(initialListenLanguagePreference);

  function changeVoice(event: ChangeEvent<HTMLSelectElement>): void {
    const next = event.target.value as SpeechVoice;
    setVoice(next);
    storeVoicePreference(next);
  }

  function changeLanguage(event: ChangeEvent<HTMLSelectElement>): void {
    const next = event.target.value === SAME_AS_DOCUMENT ? undefined : (event.target.value as LanguageCode);
    setListenLanguage(next);
    storeListenLanguagePreference(next);
  }

  return (
    <div className="listen-settings">
      <div className="field field--compact">
        <label htmlFor="listen-voice">Voice</label>
        <select id="listen-voice" value={voice} onChange={changeVoice}>
          {SPEECH_VOICES.map((option) => (
            <option key={option} value={option}>
              {VOICE_PROFILES[option].label}
            </option>
          ))}
        </select>
      </div>
      <div className="field field--compact">
        <label htmlFor="listen-language">Listen in</label>
        <select id="listen-language" value={listenLanguage ?? SAME_AS_DOCUMENT} onChange={changeLanguage}>
          <option value={SAME_AS_DOCUMENT}>Same as explanation</option>
          {LANGUAGE_CODES.map((code) => (
            <option key={code} value={code}>
              {languageLabel(code)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
