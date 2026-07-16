import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { heatFor, heatForAbsolute } from './HeatRing';
import { SegmentBar } from './SegmentBar';

describe('heatFor', () => {
  it('>0.5 je ok', () => {
    expect(heatFor(0.6)).toBe('ok');
  });

  it('>0.25 je warn (granica 0.5 je već warn, ne ok)', () => {
    expect(heatFor(0.5)).toBe('warn');
  });

  it('<=0.25 je danger', () => {
    expect(heatFor(0.25)).toBe('danger');
  });
});

describe('heatForAbsolute', () => {
  it('>=15s je ok', () => {
    expect(heatForAbsolute(15)).toBe('ok');
  });

  it('>=8s je warn', () => {
    expect(heatForAbsolute(8)).toBe('warn');
  });

  it('<8s je danger', () => {
    expect(heatForAbsolute(7)).toBe('danger');
  });
});

describe('SegmentBar', () => {
  it('renderuje total segmenata sa current oznakom', () => {
    render(<SegmentBar total={12} current={5} />);

    const segments = screen.getAllByTestId('segment');
    expect(segments).toHaveLength(12);
    expect(segments[4]).toHaveAttribute('data-state', 'cleared');
    expect(segments[5]).toHaveAttribute('data-state', 'current');
    expect(segments[6]).toHaveAttribute('data-state', 'pending');
  });
});
