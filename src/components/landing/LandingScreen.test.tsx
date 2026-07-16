import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import sr from '../../../messages/sr.json';
import { LocaleContext } from '@/i18n/LocaleProvider';
import { LandingScreen } from './LandingScreen';

vi.mock('@/lib/supabase/records', () => ({
  getCompletedSessionDates: vi.fn().mockResolvedValue([]),
}));

// Local render helper: like renderWithIntl but with a spyable setLocale.
function renderWithLocaleSpy(ui: ReactElement) {
  const setLocale = vi.fn();
  render(
    <LocaleContext.Provider value={{ locale: 'sr', setLocale }}>
      <NextIntlClientProvider locale="sr" messages={sr} timeZone="Europe/Belgrade">
        {ui}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
  return setLocale;
}

describe('LandingScreen language menu', () => {
  it('lists every locale from the registry and switches via setLocale', async () => {
    const user = userEvent.setup();
    const setLocale = renderWithLocaleSpy(
      <LandingScreen user={null} onStartWorkout={() => {}} onShowHistory={() => {}} onSignOut={() => {}} />
    );

    const select = screen.getByRole('combobox', { name: 'Jezik' });
    expect(select).toHaveValue('sr');
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(screen.getByRole('option', { name: 'English' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Srpski' })).toBeInTheDocument();

    await user.selectOptions(select, 'en');
    expect(setLocale).toHaveBeenCalledWith('en');
  });
});

describe('LandingScreen daily chip', () => {
  it('prikazuje ✓ čip kad je dailyDone', () => {
    renderWithLocaleSpy(
      <LandingScreen
        user={null}
        dailyDone
        onStartDaily={() => {}}
        onStartWorkout={() => {}}
        onShowHistory={() => {}}
        onSignOut={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: '🎲 Dnevna podela ✓' })).toBeInTheDocument();
  });

  it('prikazuje pending čip bez današnje sesije', () => {
    renderWithLocaleSpy(
      <LandingScreen
        user={null}
        dailyDone={false}
        onStartDaily={() => {}}
        onStartWorkout={() => {}}
        onShowHistory={() => {}}
        onSignOut={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: '🎲 Dnevna podela' })).toBeInTheDocument();
  });

  it('tap poziva onStartDaily', async () => {
    const user = userEvent.setup();
    const onStartDaily = vi.fn();
    renderWithLocaleSpy(
      <LandingScreen
        user={null}
        dailyDone={false}
        onStartDaily={onStartDaily}
        onStartWorkout={() => {}}
        onShowHistory={() => {}}
        onSignOut={() => {}}
      />
    );
    await user.click(screen.getByRole('button', { name: '🎲 Dnevna podela' }));
    expect(onStartDaily).toHaveBeenCalledTimes(1);
  });
});

describe('LandingScreen repeat last', () => {
  it('prikazuje dugme kad je onRepeatLast prosleđen', () => {
    renderWithLocaleSpy(
      <LandingScreen
        user={null}
        onStartWorkout={() => {}}
        onRepeatLast={() => {}}
        onShowHistory={() => {}}
        onSignOut={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: 'Ponovi podelu' })).toBeInTheDocument();
  });

  it('sakriva dugme kad onRepeatLast nije prosleđen', () => {
    renderWithLocaleSpy(
      <LandingScreen user={null} onStartWorkout={() => {}} onShowHistory={() => {}} onSignOut={() => {}} />
    );
    expect(screen.queryByRole('button', { name: 'Ponovi podelu' })).not.toBeInTheDocument();
  });
});
