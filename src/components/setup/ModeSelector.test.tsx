import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from '@/test/renderWithIntl';
import { MODES } from '@/lib/modes/registry';
import { ModeSelector } from './ModeSelector';

const classicMode = MODES.find((m) => m.id === 'classic')!;
const perfectMode = MODES.find((m) => m.id === 'perfect_deck')!;
const classicAndPerfectModes = [classicMode, perfectMode];
const challengeModes = MODES.filter((m) => m.isChallenge);

describe('ModeSelector', () => {
  it('errata E5.1: ⓘ otvara/zatvara akordeon (ne dialog) bez selekcije moda', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(<ModeSelector modes={classicAndPerfectModes} onSelect={onSelect} />);

    const infoButtons = screen.getAllByRole('button', { name: 'Objašnjenje moda' });
    expect(infoButtons).toHaveLength(2);
    expect(screen.queryByText(/Svaka karta ima svoju vremensku kvotu/)).not.toBeInTheDocument();

    await user.click(infoButtons[1]); // perfect_deck kartica
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText(/Svaka karta ima svoju vremensku kvotu/)).toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();

    await user.click(infoButtons[1]);
    expect(screen.queryByText(/Svaka karta ima svoju vremensku kvotu/)).not.toBeInTheDocument();
  });

  it('shows the classic explanation for the classic card', async () => {
    const user = userEvent.setup();
    renderWithIntl(<ModeSelector modes={classicAndPerfectModes} onSelect={vi.fn()} />);

    await user.click(screen.getAllByRole('button', { name: 'Objašnjenje moda' })[0]);
    expect(screen.getByText(/Svojim tempom, bez pritiska/)).toBeInTheDocument();
  });

  it('still selects a mode when the card itself is clicked', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(<ModeSelector modes={classicAndPerfectModes} onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: /Klasično/ }));
    expect(onSelect).toHaveBeenCalledWith('classic');
  });

  it('Daily Deal je prva kartica u Challenge meniju (redosled daily, perfect_deck, sprint, court, survive)', () => {
    expect(challengeModes.map((m) => m.id)).toEqual([
      'daily',
      'perfect_deck',
      'sprint',
      'court',
      'survive',
    ]);
  });

  it('Blitz kartica ima pilule 3/5/10 min (default 5) i javlja onSelect sa minutima', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(<ModeSelector modes={challengeModes} onSelect={onSelect} />);

    const fiveMin = screen.getByRole('button', { name: '5 min' });
    expect(fiveMin).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '3 min' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: '10 min' })).toHaveAttribute('aria-pressed', 'false');

    await user.click(screen.getByRole('button', { name: '3 min' }));
    await user.click(screen.getByRole('button', { name: /Blic/ }));
    expect(onSelect).toHaveBeenCalledWith('sprint', { minutes: 3 });
  });

  it('klik na pilulu ne selektuje mod (bez propagacije na karticu)', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(<ModeSelector modes={challengeModes} onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: '10 min' }));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
