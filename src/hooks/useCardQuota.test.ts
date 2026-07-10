import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCardQuota } from './useCardQuota';

describe('useCardQuota', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-09T10:00:00.000Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('counts down from the quota', () => {
    const { result } = renderHook(() => useCardQuota(30, 0, false));
    expect(result.current.remainingSeconds).toBe(30);
    act(() => {
      vi.setSystemTime(new Date('2026-07-09T10:00:10.000Z'));
      vi.advanceTimersByTime(250);
    });
    expect(result.current.remainingSeconds).toBe(20);
    expect(result.current.fraction).toBeCloseTo(20 / 30, 2);
    expect(result.current.expired).toBe(false);
  });

  it('expires at zero and clamps', () => {
    const { result } = renderHook(() => useCardQuota(5, 0, false));
    act(() => {
      vi.setSystemTime(new Date('2026-07-09T10:00:09.000Z'));
      vi.advanceTimersByTime(250);
    });
    expect(result.current.remainingSeconds).toBe(0);
    expect(result.current.expired).toBe(true);
  });

  it('resets when the card index changes', () => {
    const { result, rerender } = renderHook(
      ({ index }) => useCardQuota(30, index, false),
      { initialProps: { index: 0 } }
    );
    act(() => {
      vi.setSystemTime(new Date('2026-07-09T10:00:10.000Z'));
      vi.advanceTimersByTime(250);
    });
    expect(result.current.remainingSeconds).toBe(20);
    rerender({ index: 1 });
    act(() => vi.advanceTimersByTime(250));
    expect(result.current.remainingSeconds).toBe(30);
  });

  it('freezes while paused and resumes without losing time', () => {
    const { result, rerender } = renderHook(
      ({ paused }) => useCardQuota(30, 0, paused),
      { initialProps: { paused: false } }
    );
    act(() => {
      vi.setSystemTime(new Date('2026-07-09T10:00:05.000Z'));
      vi.advanceTimersByTime(250);
    });
    expect(result.current.remainingSeconds).toBe(25);
    rerender({ paused: true });
    act(() => {
      vi.setSystemTime(new Date('2026-07-09T10:00:25.000Z'));
      vi.advanceTimersByTime(250);
    });
    expect(result.current.remainingSeconds).toBe(25);
    rerender({ paused: false });
    act(() => {
      vi.setSystemTime(new Date('2026-07-09T10:00:30.000Z'));
      vi.advanceTimersByTime(250);
    });
    expect(result.current.remainingSeconds).toBe(20);
  });

  it('is inert for classic mode (null quota)', () => {
    const { result } = renderHook(() => useCardQuota(null, 0, false));
    expect(result.current).toEqual({ remainingSeconds: 0, fraction: 1, expired: false });
  });
});
