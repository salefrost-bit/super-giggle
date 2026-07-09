import { describe, it, expect } from 'vitest';
import { startTimer, pauseTimer, resumeTimer, getElapsedSeconds } from './timer';

describe('timer', () => {
  it('computes elapsed seconds from the start timestamp', () => {
    const state = startTimer(1000);
    expect(getElapsedSeconds(state, 1000)).toBe(0);
    expect(getElapsedSeconds(state, 5000)).toBe(4);
  });

  it('freezes elapsed time while paused', () => {
    let state = startTimer(0);
    state = pauseTimer(state, 3000);
    expect(getElapsedSeconds(state, 3000)).toBe(3);
    expect(getElapsedSeconds(state, 10000)).toBe(3);
  });

  it('resumes without losing or gaining time', () => {
    let state = startTimer(0);
    state = pauseTimer(state, 3000);
    state = resumeTimer(state, 8000);
    expect(getElapsedSeconds(state, 8000)).toBe(3);
    expect(getElapsedSeconds(state, 10000)).toBe(5);
  });

  it('treats pausing an already-paused timer as a no-op', () => {
    let state = startTimer(0);
    state = pauseTimer(state, 3000);
    const state2 = pauseTimer(state, 5000);
    expect(state2).toEqual(state);
  });

  it('treats resuming an already-running timer as a no-op', () => {
    const state = startTimer(0);
    const state2 = resumeTimer(state, 5000);
    expect(state2).toEqual(state);
  });
});
