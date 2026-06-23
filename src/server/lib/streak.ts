import { redis } from '@devvit/web/server';
import type { StreakInfo } from '../../shared/api';
import { getDateString, getYesterdayString } from '../../shared/date';
import { redisKeys } from './redis-keys';

export type StreakUpdateResult = StreakInfo & {
  freezeUsed?: boolean;
  previousStreak?: number;
};

const parseStreakField = (value: string | undefined, fallback: number): number => {
  if (value === undefined) {
    return fallback;
  }
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const updateStreak = async (userId: string): Promise<StreakUpdateResult> => {
  const today = getDateString(new Date());
  const yesterday = getYesterdayString();
  const key = redisKeys.userStreak(userId);
  const streakData = await redis.hGetAll(key);

  const lastPlayed = streakData['lastPlayedDate'];
  const current = parseStreakField(streakData['current'], 0);
  const longest = parseStreakField(streakData['longest'], 0);

  if (lastPlayed === today) {
    return {
      current,
      longest,
      extended: false,
      broken: false,
    };
  }

  if (lastPlayed === yesterday) {
    const newStreak = current + 1;
    const newLongest = Math.max(newStreak, longest);
    await redis.hSet(key, {
      current: String(newStreak),
      longest: String(newLongest),
      lastPlayedDate: today,
    });
    return {
      current: newStreak,
      longest: newLongest,
      extended: true,
      broken: false,
    };
  }

  const freezes = parseStreakField(streakData['freezesAvailable'], 1);
  if (lastPlayed !== undefined && freezes > 0) {
    const freezesUsed = parseStreakField(streakData['freezesUsed'], 0) + 1;
    await redis.hSet(key, {
      freezesAvailable: String(freezes - 1),
      freezesUsed: String(freezesUsed),
      lastPlayedDate: today,
    });
    return {
      current,
      longest,
      extended: false,
      broken: false,
      freezeUsed: true,
    };
  }

  const previousStreak = current > 0 ? current : undefined;
  await redis.hSet(key, {
    current: '1',
    longest: String(Math.max(longest, 1)),
    lastPlayedDate: today,
    freezesAvailable: streakData['freezesAvailable'] ?? '1',
    freezesUsed: streakData['freezesUsed'] ?? '0',
  });

  return {
    current: 1,
    longest: Math.max(longest, 1),
    extended: false,
    broken: previousStreak !== undefined,
    previousStreak,
  };
};

export const getStreak = async (userId: string): Promise<StreakInfo> => {
  const streakData = await redis.hGetAll(redisKeys.userStreak(userId));
  return {
    current: parseStreakField(streakData['current'], 0),
    longest: parseStreakField(streakData['longest'], 0),
    extended: false,
    broken: false,
  };
};
