import { describe, it, expect } from 'vitest';
import { createPauseLog, logPause, logResume, getTotalPauseSeconds } from './pauseLog';

describe('pauseLog', () => {
  it('starts with zero pauses and zero seconds', () => {
    const log = createPauseLog();
    expect(log.count).toBe(0);
    expect(getTotalPauseSeconds(log, 5_000)).toBe(0);
  });

  it('accumulates a closed pause from timestamps (resume − pause)', () => {
    let log = createPauseLog();
    log = logPause(log, 10_000);
    log = logResume(log, 171_000); // 161 s
    expect(log.count).toBe(1);
    expect(getTotalPauseSeconds(log, 999_000)).toBe(161);
  });

  it('sums multiple pauses and counts each one', () => {
    let log = createPauseLog();
    log = logPause(log, 10_000);
    log = logResume(log, 20_000); // 10 s
    log = logPause(log, 50_000);
    log = logResume(log, 65_500); // 15.5 s
    expect(log.count).toBe(2);
    expect(getTotalPauseSeconds(log, 100_000)).toBe(26); // round(25.5)
  });

  it('includes a still-open pause up to now', () => {
    let log = createPauseLog();
    log = logPause(log, 10_000);
    expect(getTotalPauseSeconds(log, 14_000)).toBe(4);
  });

  it('is idempotent on a double pause (rapid hidden/hidden)', () => {
    let log = createPauseLog();
    log = logPause(log, 10_000);
    log = logPause(log, 12_000); // ignored — pause already open
    expect(log.count).toBe(1);
    log = logResume(log, 20_000);
    expect(getTotalPauseSeconds(log, 99_000)).toBe(10);
  });

  it('is idempotent on resume without an open pause', () => {
    let log = createPauseLog();
    log = logResume(log, 10_000);
    expect(log.count).toBe(0);
    expect(getTotalPauseSeconds(log, 99_000)).toBe(0);
  });
});
