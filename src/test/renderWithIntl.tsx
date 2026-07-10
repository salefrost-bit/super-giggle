import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import sr from '../../messages/sr.json';
import { LocaleContext } from '@/i18n/LocaleProvider';

// Existing tests assert Serbian strings; app default is English, tests pin sr.
// Also stubs LocaleContext so components calling useLocaleSetting() (e.g. the
// SR/EN toggle on LandingScreen, Task 14) don't throw outside the real provider.
export function renderWithIntl(ui: ReactElement) {
  return render(
    <LocaleContext.Provider value={{ locale: 'sr', setLocale: () => {} }}>
      <NextIntlClientProvider locale="sr" messages={sr} timeZone="Europe/Belgrade">
        {ui}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
