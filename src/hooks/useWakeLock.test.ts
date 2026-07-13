import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWakeLock } from './useWakeLock';

type MutableNavigator = Omit<Navigator, 'wakeLock'> & {
  wakeLock?: { request: (type: 'screen') => Promise<unknown> };
};

const release = vi.fn();
const request = vi.fn();

beforeEach(() => {
  release.mockReset().mockResolvedValue(undefined);
  request.mockReset().mockResolvedValue({ release });
  Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
});

afterEach(() => {
  delete (navigator as MutableNavigator).wakeLock;
});

describe('useWakeLock', () => {
  it('requests a screen wake lock when active', async () => {
    renderHook(() => useWakeLock(true));
    await waitFor(() => expect(request).toHaveBeenCalledWith('screen'));
  });

  it('does not request when inactive', async () => {
    renderHook(() => useWakeLock(false));
    await act(async () => {});
    expect(request).not.toHaveBeenCalled();
  });

  it('releases the lock on unmount', async () => {
    const { unmount } = renderHook(() => useWakeLock(true));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    unmount();
    await waitFor(() => expect(release).toHaveBeenCalledTimes(1));
  });

  it('re-requests when the tab becomes visible again while active', async () => {
    renderHook(() => useWakeLock(true));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  });

  it('is a silent no-op when the API is missing', async () => {
    delete (navigator as MutableNavigator).wakeLock;
    expect(() => renderHook(() => useWakeLock(true))).not.toThrow();
    await act(async () => {});
    expect(request).not.toHaveBeenCalled();
  });

  it('swallows a rejected request (battery saver) without crashing', async () => {
    request.mockRejectedValueOnce(new Error('denied'));
    renderHook(() => useWakeLock(true));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    // Reaching this point without an unhandled rejection is the assertion.
  });
});
