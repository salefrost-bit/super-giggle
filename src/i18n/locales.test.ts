import { describe, it, expect } from 'vitest';
import { LOCALES } from './locales';

describe('LOCALES registry', () => {
  it('contains unique codes with non-empty labels', () => {
    const codes = LOCALES.map((l) => l.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(LOCALES.every((l) => l.label.trim().length > 0)).toBe(true);
  });

  it('offers exactly en and sr in this release', () => {
    expect(LOCALES.map((l) => l.code).sort()).toEqual(['en', 'sr']);
  });
});
