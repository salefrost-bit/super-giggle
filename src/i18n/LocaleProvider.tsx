'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../messages/en.json';
import sr from '../../messages/sr.json';

export type AppLocale = 'en' | 'sr';
const MESSAGES: Record<AppLocale, Record<string, unknown>> = { en, sr };
const STORAGE_KEY = 'spil_locale';

interface LocaleSetting {
  locale: AppLocale;
  setLocale: (l: AppLocale) => void;
}

// Exported so the test helper (renderWithIntl) can provide a fixed locale
// without mounting the real provider (which reads localStorage).
export const LocaleContext = createContext<LocaleSetting | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>('en');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'sr' || stored === 'en') setLocaleState(stored);
    } catch {}
  }, []);

  function setLocale(l: AppLocale) {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {}
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]} timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}>
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}

export function useLocaleSetting(): LocaleSetting {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocaleSetting must be used within LocaleProvider');
  return ctx;
}
