/**
 * Supported explanation languages.
 *
 * Responsibility: one table of the Indian languages Gemini explains documents in,
 * with the BCP-47 tag used for speech. Boundary: the source document can be in any
 * language; this list only controls the language of explanations.
 */

export const LANGUAGE_CODES = ['en', 'hi', 'bn', 'mr', 'te', 'ta', 'gu', 'kn', 'or', 'ml', 'pa'] as const;

export type LanguageCode = (typeof LANGUAGE_CODES)[number];

export interface LanguageInfo {
  /** English name — used inside prompts so the model gets an unambiguous instruction. */
  readonly englishName: string;
  /** Endonym — shown in the language picker so readers find their own language. */
  readonly nativeName: string;
  /** BCP-47 tag for speech synthesis and the `lang` attribute. */
  readonly bcp47: string;
}

/**
 * The ten Indic languages below are the mother tongue of 87.8% of Indians
 * (Census of India 2011, Statement 4: 43.6 + 8.0 + 6.9 + 6.7 + 5.7 + 4.6 + 3.6 + 3.1 + 2.9 + 2.7).
 */
export const LANGUAGES: Readonly<Record<LanguageCode, LanguageInfo>> = {
  en: { englishName: 'English', nativeName: 'English', bcp47: 'en-IN' },
  hi: { englishName: 'Hindi', nativeName: 'हिन्दी', bcp47: 'hi-IN' },
  bn: { englishName: 'Bengali', nativeName: 'বাংলা', bcp47: 'bn-IN' },
  mr: { englishName: 'Marathi', nativeName: 'मराठी', bcp47: 'mr-IN' },
  ta: { englishName: 'Tamil', nativeName: 'தமிழ்', bcp47: 'ta-IN' },
  te: { englishName: 'Telugu', nativeName: 'తెలుగు', bcp47: 'te-IN' },
  gu: { englishName: 'Gujarati', nativeName: 'ગુજરાતી', bcp47: 'gu-IN' },
  kn: { englishName: 'Kannada', nativeName: 'ಕನ್ನಡ', bcp47: 'kn-IN' },
  or: { englishName: 'Odia', nativeName: 'ଓଡ଼ିଆ', bcp47: 'or-IN' },
  ml: { englishName: 'Malayalam', nativeName: 'മലയാളം', bcp47: 'ml-IN' },
  pa: { englishName: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', bcp47: 'pa-IN' },
};

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

/**
 * How the language pickers name a language: the endonym, then the English name.
 * @example
 * languageLabel('hi'); // 'हिन्दी (Hindi)'
 * languageLabel('en'); // 'English'
 */
export function languageLabel(code: LanguageCode): string {
  const { englishName, nativeName } = LANGUAGES[code];
  return code === 'en' ? englishName : `${nativeName} (${englishName})`;
}
