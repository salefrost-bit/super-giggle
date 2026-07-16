import { describe, expect, it, vi } from 'vitest';
import { isDuplicateError, withSaveRetry } from './retry';

const NO_DELAYS = [0, 0];

describe('isDuplicateError', () => {
  it('prepoznaje Postgres 23505', () => {
    expect(isDuplicateError({ code: '23505', message: 'duplicate key' })).toBe(true);
  });

  it('ne pali se na druge greške ni ne-objekte', () => {
    expect(isDuplicateError({ code: '42501' })).toBe(false);
    expect(isDuplicateError(new TypeError('fetch failed'))).toBe(false);
    expect(isDuplicateError(null)).toBe(false);
    expect(isDuplicateError('23505')).toBe(false);
  });
});

describe('withSaveRetry (spec v0.4.6 §1)', () => {
  it('uspeh iz prvog pokušaja vraća rezultat', async () => {
    const op = vi.fn().mockResolvedValue('id-1');
    await expect(withSaveRetry(op, NO_DELAYS)).resolves.toBe('id-1');
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('pad pa uspeh — izgubljen odgovor ne obara čuvanje', async () => {
    const op = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValue('id-1');
    await expect(withSaveRetry(op, NO_DELAYS)).resolves.toBe('id-1');
    expect(op).toHaveBeenCalledTimes(2);
  });

  it('duplicate na retry-ju = tihi uspeh (upis je već prošao)', async () => {
    const op = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockRejectedValue({ code: '23505' });
    await expect(withSaveRetry(op, NO_DELAYS)).resolves.toBeNull();
    expect(op).toHaveBeenCalledTimes(2);
  });

  it('iscrpljeni pokušaji bacaju poslednju grešku', async () => {
    const boom = new TypeError('fetch failed');
    const op = vi.fn().mockRejectedValue(boom);
    await expect(withSaveRetry(op, NO_DELAYS)).rejects.toBe(boom);
    expect(op).toHaveBeenCalledTimes(3);
  });
});
