import { describe, it, expect, beforeEach } from 'vitest';
import { hasSeenExplanation, markExplained } from './explained';

describe('explained flags', () => {
  beforeEach(() => {
    localStorage.removeItem('explained.perfect_deck');
  });

  it('is false before marking and true after, persisted under explained.<id>', () => {
    expect(hasSeenExplanation('perfect_deck')).toBe(false);
    markExplained('perfect_deck');
    expect(hasSeenExplanation('perfect_deck')).toBe(true);
    expect(localStorage.getItem('explained.perfect_deck')).toBe('true');
  });
});
