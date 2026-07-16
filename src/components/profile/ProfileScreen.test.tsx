import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import sr from '../../../messages/sr.json';
import { LocaleContext } from '@/i18n/LocaleProvider';
import { ProfileScreen } from './ProfileScreen';

vi.mock('@/lib/supabase/records', () => ({
  getProfileStats: vi.fn(),
  getTotalXp: vi.fn(),
  getCompletedSessionDates: vi.fn(),
}));

import { getProfileStats, getTotalXp, getCompletedSessionDates } from '@/lib/supabase/records';

function renderProfile(
  ui: ReactElement,
  { setLocale = vi.fn() }: { setLocale?: (l: 'en' | 'sr') => void } = {}
) {
  return render(
    <LocaleContext.Provider value={{ locale: 'sr', setLocale }}>
      <NextIntlClientProvider locale="sr" messages={sr} timeZone="Europe/Belgrade">
        {ui}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getProfileStats).mockResolvedValue({
    bestPoints: 2480,
    decksCleared: 23,
    longestStreak: 12,
    totalSeconds: 7 * 3600 + 12 * 60,
    totalReps: 4812,
    favoriteSuit: 'hearts',
  });
  vi.mocked(getTotalXp).mockResolvedValue(600);
  vi.mocked(getCompletedSessionDates).mockResolvedValue([]);
});

describe('ProfileScreen — ulogovan', () => {
  it('renderuje čin karticu, 6 StatTile-ova, džokere, istoriju, settings i Sign out', async () => {
    const onShowHistory = vi.fn();
    const onSignOut = vi.fn();
    const setLocale = vi.fn();
    const user = userEvent.setup();

    renderProfile(
      <ProfileScreen
        userId="user-1"
        onBack={vi.fn()}
        onShowHistory={onShowHistory}
        onSignOut={onSignOut}
      />,
      { setLocale }
    );

    // Rank card: XP 600 → Ace (ranks.r1), next = Deuce @ 1500 → 900 XP to go
    await waitFor(() => expect(screen.getByText('Ace')).toBeInTheDocument());
    expect(screen.getByTestId('rank-symbol')).toHaveTextContent('A');
    expect(screen.getByText(/900 XP do Deuce/)).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('2.480')).toBeInTheDocument()); // sr locale
    expect(screen.getByText('NAJBOLJI SKOR')).toBeInTheDocument();
    expect(screen.getByText('23')).toBeInTheDocument();
    expect(screen.getByText('SLOŽENI ŠPILOVI')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('NAJDUŽI NIZ')).toBeInTheDocument();
    expect(screen.getByText('7:12')).toBeInTheDocument();
    expect(screen.getByText('SATI ZA STOLOM')).toBeInTheDocument();
    expect(screen.getByText('4.812')).toBeInTheDocument();
    expect(screen.getByText('♥')).toBeInTheDocument();
    expect(screen.getByText('OMILJENA BOJA')).toBeInTheDocument();

    // freezesLeftThisWeek = 2 (no sessions) → 2/2
    expect(screen.getByTestId('jokers-count')).toHaveTextContent('2/2');
    expect(screen.getByText('DŽOKERI IZ RUKAVA')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /ISTORIJA TRENINGA/ }));
    expect(onShowHistory).toHaveBeenCalledTimes(1);

    const langSelect = screen.getByLabelText('Jezik');
    await user.selectOptions(langSelect, 'en');
    expect(setLocale).toHaveBeenCalledWith('en');

    await user.click(screen.getByRole('button', { name: 'Odjavi se' }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});

describe('ProfileScreen — gost', () => {
  it('prikazuje CTA za nalog umesto statistika, bez Sign out', () => {
    renderProfile(
      <ProfileScreen userId={null} onBack={vi.fn()} onShowHistory={vi.fn()} onSignOut={vi.fn()} />
    );

    expect(screen.getByText(/Napravi nalog da pratiš čin/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Napravi nalog' })).toHaveAttribute('href', '/signup');
    expect(screen.queryByText('NAJBOLJI SKOR')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Odjavi se' })).not.toBeInTheDocument();
    expect(getProfileStats).not.toHaveBeenCalled();
    expect(getTotalXp).not.toHaveBeenCalled();
  });
});
