import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from '@/test/renderWithIntl';
import { StreakInfoModal } from './StreakInfoModal';

describe('StreakInfoModal', () => {
  it('shows the mechanic explanation and the current state', () => {
    renderWithIntl(<StreakInfoModal days={4} freezesLeftThisWeek={1} onClose={() => {}} />);

    expect(screen.getByText(/Niz raste za svaki dan/)).toBeInTheDocument();
    // The state line only — NOT `/🃏/`, which also appears in the explanation
    // paragraph and would make getByText throw on multiple matches.
    expect(screen.getByText(/4 dana/)).toBeInTheDocument();
    expect(screen.getByText(/džokeri iz rukava ove nedelje/)).toBeInTheDocument();
  });

  it('closes via the button', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(<StreakInfoModal days={4} freezesLeftThisWeek={2} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Zatvori' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
