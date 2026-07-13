import type { AppLocale } from './LocaleProvider';

export interface LocaleOption {
  code: AppLocale;
  label: string; // endonym — shown untranslated in the menu
}

// Adding a language = a new entry here + messages/<code>.json + widening
// AppLocale in LocaleProvider. No component changes (spec section 8).
export const LOCALES: LocaleOption[] = [
  { code: 'en', label: 'English' },
  { code: 'sr', label: 'Srpski' },
];
