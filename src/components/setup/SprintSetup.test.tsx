import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from '@/test/renderWithIntl';
import { SprintSetup } from './SprintSetup';

describe('SprintSetup', () => {
  it('nudi izbor 3, 5 i 10 minuta', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    renderWithIntl(<SprintSetup onSelect={onSelect} />);

    expect(screen.getByRole('button', { name: '3 min' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '5 min' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '10 min' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '5 min' }));
    expect(onSelect).toHaveBeenCalledWith(5);
  });
});
