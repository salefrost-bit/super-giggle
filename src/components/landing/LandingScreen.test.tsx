import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from '@/test/renderWithIntl';
import { LandingScreen } from './LandingScreen';
import type { User } from '@supabase/supabase-js';

vi.mock('@/lib/supabase/records', () => ({
  getCompletedSessionDates: vi.fn().mockResolvedValue([]),
}));
import { getCompletedSessionDates } from '@/lib/supabase/records';

const guestProps = {
  user: null,
  rankSymbol: '🃏',
  onStartWorkout: vi.fn(),
  onShowProfile: vi.fn(),
  onShowHowToPlay: vi.fn(),
};

const loggedInUser = { id: 'u1' } as User;

describe('LandingScreen profile chip', () => {
  it('prikazuje 🃏 za gosta i poziva onShowProfile na klik', async () => {
    const user = userEvent.setup();
    const onShowProfile = vi.fn();
    renderWithIntl(<LandingScreen {...guestProps} onShowProfile={onShowProfile} />);

    const chip = screen.getByRole('button', { name: /🃏/ });
    await user.click(chip);
    expect(onShowProfile).toHaveBeenCalledTimes(1);
  });

  it('prikazuje rankSymbol prop za ulogovanog korisnika', () => {
    renderWithIntl(<LandingScreen {...guestProps} user={loggedInUser} rankSymbol="Q" />);
    expect(screen.getByRole('button', { name: /^Q/ })).toBeInTheDocument();
  });
});

describe('LandingScreen "?" dugme', () => {
  it('poziva onShowHowToPlay na klik', async () => {
    const user = userEvent.setup();
    const onShowHowToPlay = vi.fn();
    renderWithIntl(<LandingScreen {...guestProps} onShowHowToPlay={onShowHowToPlay} />);

    await user.click(screen.getByRole('button', { name: 'Kako se igra' }));
    expect(onShowHowToPlay).toHaveBeenCalledTimes(1);
  });
});

describe('LandingScreen streak čip', () => {
  it('prikazuje streak čip samo za ulogovanog korisnika sa aktivnim nizom', async () => {
    vi.mocked(getCompletedSessionDates).mockResolvedValueOnce([new Date().toISOString()]);
    renderWithIntl(<LandingScreen {...guestProps} user={loggedInUser} />);
    expect(await screen.findByText(/dan/)).toBeInTheDocument();
  });

  it('ne prikazuje streak čip za gosta', () => {
    renderWithIntl(<LandingScreen {...guestProps} />);
    expect(screen.queryByText(/1 dan/)).not.toBeInTheDocument();
  });
});

describe('LandingScreen Daily čip', () => {
  it('prikazuje ✓ čip kad je dailyDone', () => {
    renderWithIntl(<LandingScreen {...guestProps} dailyDone onStartDaily={vi.fn()} />);
    expect(screen.getByRole('button', { name: '🎲 Dnevna podela ✓' })).toBeInTheDocument();
  });

  it('prikazuje prigušen čip sa "–" bez današnje sesije', () => {
    renderWithIntl(<LandingScreen {...guestProps} dailyDone={false} onStartDaily={vi.fn()} />);
    expect(screen.getByRole('button', { name: '🎲 Dnevna podela –' })).toBeInTheDocument();
  });

  it('tap poziva onStartDaily', async () => {
    const user = userEvent.setup();
    const onStartDaily = vi.fn();
    renderWithIntl(<LandingScreen {...guestProps} dailyDone={false} onStartDaily={onStartDaily} />);
    await user.click(screen.getByRole('button', { name: '🎲 Dnevna podela –' }));
    expect(onStartDaily).toHaveBeenCalledTimes(1);
  });
});

describe('LandingScreen CTA "DEAL ME IN"', () => {
  it('poziva onStartWorkout na klik, za gosta i za ulogovanog', async () => {
    const user = userEvent.setup();
    const onStartWorkout = vi.fn();
    renderWithIntl(<LandingScreen {...guestProps} onStartWorkout={onStartWorkout} />);
    await user.click(screen.getByRole('button', { name: 'PODELI MI' }));
    expect(onStartWorkout).toHaveBeenCalledTimes(1);
  });
});

describe('LandingScreen Run it back', () => {
  it('prikazuje dugme sa kontekstom kad je repeatContext prosleđen', () => {
    renderWithIntl(
      <LandingScreen {...guestProps} onRepeatLast={vi.fn()} repeatContext="Brza podela, Half Deck" />
    );
    expect(
      screen.getByRole('button', { name: '↻ Ponovi podelu · Brza podela, Half Deck' })
    ).toBeInTheDocument();
  });

  it('prikazuje generičko dugme bez konteksta', () => {
    renderWithIntl(<LandingScreen {...guestProps} onRepeatLast={vi.fn()} />);
    expect(screen.getByRole('button', { name: '↻ Ponovi podelu' })).toBeInTheDocument();
  });

  it('sakriva dugme kad onRepeatLast nije prosleđen', () => {
    renderWithIntl(<LandingScreen {...guestProps} />);
    expect(screen.queryByText(/Ponovi podelu/)).not.toBeInTheDocument();
  });
});

describe('LandingScreen gost/ulogovan red', () => {
  it('gost vidi "Playing as guest · Sign in"', () => {
    renderWithIntl(<LandingScreen {...guestProps} />);
    expect(screen.getByText(/Igraš kao gost/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Prijavi se' })).toBeInTheDocument();
  });

  it('ulogovan korisnik vidi status (Sign out je na Profile — P4)', () => {
    renderWithIntl(<LandingScreen {...guestProps} user={loggedInUser} />);
    expect(screen.getByText(/Ulogovan/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Odjavi se' })).not.toBeInTheDocument();
  });
});
