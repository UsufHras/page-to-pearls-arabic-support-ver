export interface TargetLanguage {
  code: string;
  /** English name, used in the AI prompt */
  name: string;
  /** Name in the language itself, shown in the picker */
  nativeName: string;
  rtl: boolean;
  /** Script family — decides which font the PDF uses */
  script: 'latin' | 'arabic';
}

export const TARGET_LANGUAGES: TargetLanguage[] = [
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true, script: 'arabic' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', rtl: true, script: 'arabic' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', rtl: true, script: 'arabic' },
  { code: 'fr', name: 'French', nativeName: 'Français', rtl: false, script: 'latin' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', rtl: false, script: 'latin' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', rtl: false, script: 'latin' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', rtl: false, script: 'latin' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', rtl: false, script: 'latin' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', rtl: false, script: 'latin' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', rtl: false, script: 'latin' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', rtl: false, script: 'latin' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', rtl: false, script: 'latin' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', rtl: false, script: 'latin' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', rtl: false, script: 'latin' },
];

export const DEFAULT_LANGUAGE_CODE = 'ar';

export const LANGUAGE_STORAGE_KEY = 'lexicon-target-language';

export function getLanguage(code: string | undefined): TargetLanguage {
  return (
    TARGET_LANGUAGES.find((l) => l.code === code) ??
    TARGET_LANGUAGES.find((l) => l.code === DEFAULT_LANGUAGE_CODE)!
  );
}

export function loadStoredLanguageCode(): string {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE_CODE;
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored && TARGET_LANGUAGES.some((l) => l.code === stored)) return stored;
  const browser = window.navigator.language?.slice(0, 2);
  if (browser && TARGET_LANGUAGES.some((l) => l.code === browser)) return browser;
  return DEFAULT_LANGUAGE_CODE;
}
