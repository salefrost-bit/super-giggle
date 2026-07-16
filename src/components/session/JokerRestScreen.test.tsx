import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithIntl } from '@/test/renderWithIntl';
import { JokerRestScreen } from './JokerRestScreen';

// Task 14 (s3): BREATHE IN/OUT is derived from the existing joker countdown
// (remainingSeconds), never a separate interval. Phase formula from the plan:
//   Math.floor((30 − remaining) / 4) % 2  → 0 = in, 1 = out (8s cycle).

describe('JokerRestScreen — breathe phase from remainingSeconds', () => {
  it('prikazuje UDAH na startu (remaining=30) i IZDAH posle 4s (remaining=26)', () => {
    const { unmount } = renderWithIntl(<JokerRestScreen remainingSeconds={30} />);

    const root = screen.getByTestId('joker-breather');
    expect(root).toHaveAttribute('data-phase', 'in');
    expect(screen.getByText('UDAH')).toBeInTheDocument();
    expect(screen.getByText('DŽOKER · 30s PREDAH')).toBeInTheDocument();
    expect(screen.getByText('Sledeća karta se sama okreće.')).toBeInTheDocument();
    unmount();

    renderWithIntl(<JokerRestScreen remainingSeconds={26} />);
    expect(screen.getByTestId('joker-breather')).toHaveAttribute('data-phase', 'out');
    expect(screen.getByText('IZDAH')).toBeInTheDocument();
  });

  it('posle 8s (remaining=22) vraća se na UDAH — 8s ciklus', () => {
    renderWithIntl(<JokerRestScreen remainingSeconds={22} />);
    expect(screen.getByTestId('joker-breather')).toHaveAttribute('data-phase', 'in');
    expect(screen.getByText('UDAH')).toBeInTheDocument();
  });

  it('koncentrični krugovi skaliraju po fazi (veći scale na vrhu udaha)', () => {
    const parseScale = (t: string) => Number(/scale\(([\d.]+)\)/.exec(t)?.[1] ?? 0);

    const { unmount } = renderWithIntl(<JokerRestScreen remainingSeconds={30} />);
    const scaleStart = parseScale(screen.getAllByTestId('breath-ring')[0].style.transform);
    unmount();

    // elapsed=4 → peak of the cosine breath (b=1), still in the OUT half.
    renderWithIntl(<JokerRestScreen remainingSeconds={26} />);
    const scalePeak = parseScale(screen.getAllByTestId('breath-ring')[0].style.transform);

    expect(scalePeak).toBeGreaterThan(scaleStart);
  });
});
