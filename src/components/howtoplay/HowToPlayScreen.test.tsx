import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from '@/test/renderWithIntl';
import { HowToPlayScreen } from './HowToPlayScreen';

vi.mock('@/lib/supabase/records', () => ({
  getTotalXp: vi.fn(),
}));

import { getTotalXp } from '@/lib/supabase/records';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getTotalXp).mockResolvedValue(0);
});

describe('HowToPlayScreen', () => {
  it('renderuje intro, načine+modove, činove, streak/jokere i About; YOU na trenutnom činu', async () => {
    // XP 80000 → Queen (r12); gost bi bio 🃏
    vi.mocked(getTotalXp).mockResolvedValue(80_000);
    const onBack = vi.fn();
    const user = userEvent.setup();

    renderWithIntl(<HowToPlayScreen userId="user-1" onBack={onBack} />);

    expect(screen.getByRole('heading', { name: 'Kako se igra' })).toBeInTheDocument();
    expect(screen.getByText('Špil je tvoj trener.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Špil je tvoj trener/ }));
    expect(screen.getByText(/As je 1/)).toBeInTheDocument();

    expect(screen.getByText('MODOVI')).toBeInTheDocument();
    expect(screen.getByText('Brza podela')).toBeInTheDocument();
    expect(screen.getByText('Složi špil')).toBeInTheDocument();
    expect(screen.getByText('Challenge')).toBeInTheDocument();
    expect(screen.getByText('Dnevna podela')).toBeInTheDocument();
    expect(screen.getByText('Perfektan špil')).toBeInTheDocument();
    expect(screen.getByText('Blic')).toBeInTheDocument();
    expect(screen.getByText('Dvor')).toBeInTheDocument();
    expect(screen.getByText('Na satu')).toBeInTheDocument();
    expect(screen.getByText('Džoker')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Brza podela/ }));
    expect(screen.getByText(/Biraš ulog i veličinu špila/)).toBeInTheDocument();

    expect(screen.getByText('ČINOVI ŠPILA')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('TI')).toBeInTheDocument());
    expect(screen.getByText(/tvoj čin:/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'A' }));
    expect(screen.getByText(/Najniža karta u špilu/)).toBeInTheDocument();

    expect(screen.getByText(/Niz —/)).toBeInTheDocument();
    expect(screen.getByText(/Džokeri iz rukava/)).toBeInTheDocument();
    expect(screen.getByText('O APLIKACIJI')).toBeInTheDocument();
    expect(screen.getByText(/SHUFFLE je besplatan/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Nazad' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('gost: YOU bedž na 🃏 bez fetch-a XP', () => {
    renderWithIntl(<HowToPlayScreen userId={null} onBack={vi.fn()} />);
    expect(getTotalXp).not.toHaveBeenCalled();
    expect(screen.getByText('TI')).toBeInTheDocument();
    const you = screen.getByText('TI');
    expect(you.closest('button')?.textContent).toContain('🃏');
  });
});
