import { describe, it, expect } from 'vitest';
import { calculateReps } from './reps';

describe('calculateReps', () => {
  it('applies the multiplier and rounds to the nearest integer', () => {
    expect(calculateReps({ suit: 'hearts', rank: 10 }, 1)).toBe(10);
    expect(calculateReps({ suit: 'hearts', rank: 10 }, 0.75)).toBe(8);
    expect(calculateReps({ suit: 'hearts', rank: 13 }, 1.25)).toBe(16);
  });

  it('never returns less than 1', () => {
    expect(calculateReps({ suit: 'hearts', rank: 2 }, 0.1)).toBe(1);
  });
});
