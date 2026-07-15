import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithIntl } from '@/test/renderWithIntl';
import { EntrySelector } from './EntrySelector';

describe('EntrySelector', () => {
  it('prikazuje tri kartice i javlja izbor', () => {
    const onSelect = vi.fn();
    renderWithIntl(<EntrySelector onSelect={onSelect} />);
    fireEvent.click(screen.getByText(/Brzi trening/));
    expect(onSelect).toHaveBeenCalledWith('quick');
    fireEvent.click(screen.getByText(/Po meri/));
    expect(onSelect).toHaveBeenCalledWith('custom');
    fireEvent.click(screen.getByText(/Challenge/));
    expect(onSelect).toHaveBeenCalledWith('challenge');
  });
});
