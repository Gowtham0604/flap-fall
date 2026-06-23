import { describe, expect, it } from 'vitest';
import {
  calculateXpAward,
  getLevelFromXp,
  getProgressToNextLevel,
  xpForLevel,
} from '../xp';

describe('xp', () => {
  it('calculates level thresholds', () => {
    expect(xpForLevel(1)).toBe(0);
    expect(getLevelFromXp(0)).toBe(1);
    expect(getLevelFromXp(150)).toBeGreaterThan(1);
  });

  it('returns progress toward next level', () => {
    const progress = getProgressToNextLevel(50);
    expect(progress.required).toBeGreaterThan(0);
    expect(progress.percent).toBeGreaterThanOrEqual(0);
  });

  it('awards bonus xp for personal bests', () => {
    const base = calculateXpAward({
      score: 5,
      isPersonalBest: false,
      isFirstGameOfDay: false,
    });
    const best = calculateXpAward({
      score: 5,
      isPersonalBest: true,
      isFirstGameOfDay: true,
    });
    expect(best).toBeGreaterThan(base);
  });
});
