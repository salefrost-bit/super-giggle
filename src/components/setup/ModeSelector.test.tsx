import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from '@/test/renderWithIntl';
import { ModeSelector } from './ModeSelector';

describe('ModeSelector info buttons', () => {
  it('opens the explanation modal from ⓘ without selecting the mode, and closes it', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(<ModeSelector onSelect={onSelect} />);

    const infoButtons = screen.getAllByRole('button', { name: 'Objašnjenje moda' });
    expect(infoButtons).toHaveLength(2);

    await user.click(infoButtons[1]); // perfect_deck card
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Svaka karta ima svoju vremensku kvotu/)).toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Zatvori' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the classic explanation for the classic card', async () => {
    const user = userEvent.setup();
    renderWithIntl(<ModeSelector onSelect={vi.fn()} />);

    await user.click(screen.getAllByRole('button', { name: 'Objašnjenje moda' })[0]);
    expect(screen.getByText(/Svojim tempom, bez pritiska/)).toBeInTheDocument();
  });

  it('still selects a mode when the card itself is clicked', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(<ModeSelector onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: /Klasično/ }));
    expect(onSelect).toHaveBeenCalledWith('classic');
  });
});
