import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStopwatch } from './useStopwatch';

describe('useStopwatch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-08T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('increases elapsedSeconds as time passes', () => {
    const { result } = renderHook(() => useStopwatch());
    expect(result.current.elapsedSeconds).toBe(0);

    act(() => {
      vi.setSystemTime(new Date('2026-07-08T10:00:05.000Z'));
      vi.advanceTimersByTime(250);
    });

    expect(result.current.elapsedSeconds).toBe(5);
  });

  it('stops increasing while paused', () => {
    const { result } = renderHook(() => useStopwatch());

    act(() => {
      vi.setSystemTime(new Date('2026-07-08T10:00:03.000Z'));
      result.current.pause();
    });
    expect(result.current.elapsedSeconds).toBe(3);

    act(() => {
      vi.setSystemTime(new Date('2026-07-08T10:00:20.000Z'));
      vi.advanceTimersByTime(250);
    });
    expect(result.current.elapsedSeconds).toBe(3);
  });

  it('resumes counting from where it paused, without adding the pause duration', () => {
    const { result } = renderHook(() => useStopwatch());

    act(() => {
      vi.setSystemTime(new Date('2026-07-08T10:00:03.000Z'));
      result.current.pause();
    });
    act(() => {
      vi.setSystemTime(new Date('2026-07-08T10:00:20.000Z'));
      result.current.resume();
    });
    act(() => {
      vi.setSystemTime(new Date('2026-07-08T10:00:22.000Z'));
      vi.advanceTimersByTime(250);
    });

    expect(result.current.elapsedSeconds).toBe(5);
  });
});

describe('useStopwatch pause accounting', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-08T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts pauses and accumulates their duration from timestamps', () => {
    const { result } = renderHook(() => useStopwatch());

    act(() => {
      vi.setSystemTime(new Date('2026-07-08T10:00:03.000Z'));
      result.current.pause();
    });
    act(() => {
      vi.setSystemTime(new Date('2026-07-08T10:00:20.000Z'));
      result.current.resume();
    });
    act(() => {
      vi.setSystemTime(new Date('2026-07-08T10:00:25.000Z'));
      result.current.pause();
    });
    act(() => {
      vi.setSystemTime(new Date('2026-07-08T10:00:30.000Z'));
      result.current.resume();
    });

    expect(result.current.pauseCount).toBe(2);
    expect(result.current.totalPauseSeconds).toBe(22); // 17 + 5
  });

  it('does not double-count a repeated pause', () => {
    const { result } = renderHook(() => useStopwatch());

    act(() => {
      vi.setSystemTime(new Date('2026-07-08T10:00:03.000Z'));
      result.current.pause();
    });
    act(() => {
      vi.setSystemTime(new Date('2026-07-08T10:00:04.000Z'));
      result.current.pause();
    });

    expect(result.current.pauseCount).toBe(1);
  });
});
