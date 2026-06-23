import { redis } from '@devvit/web/server';
import type { PlayerStats } from '../../shared/api';
import {
  calculateGemAward,
  calculateXpAward,
  getLevelFromXp,
  getProgressToNextLevel,
} from '../../shared/xp';
import { redisKeys } from './redis-keys';
import { getStreak, updateStreak } from './streak';
import {
  getGemsLeaderboard,
  getLeaderboard,
  getPlayerRank,
  incrementPlayersToday,
  submitDailyScore,
  updateGemsLeaderboard,
} from './leaderboard';

const parseIntField = (value: string | undefined, fallback: number): number => {
  if (value === undefined) {
    return fallback;
  }
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const getPlayerStats = async (userId: string): Promise<PlayerStats> => {
  const [bestRaw, xpRaw, gemsRaw, streak, profile] = await Promise.all([
    redis.get(redisKeys.userBest(userId)),
    redis.get(redisKeys.userXp(userId)),
    redis.get(redisKeys.userGems(userId)),
    getStreak(userId),
    redis.hGetAll(redisKeys.userProfile(userId)),
  ]);

  const xp = parseIntField(xpRaw, 0);
  return {
    personalBest: parseIntField(bestRaw, 0),
    totalGames: parseIntField(profile['totalGames'], 0),
    gems: parseIntField(gemsRaw, 0),
    streak,
    xp: {
      total: xp,
      level: getLevelFromXp(xp),
      progress: getProgressToNextLevel(xp),
    },
  };
};

export type RecordScoreResult = {
  isPersonalBest: boolean;
  xpEarned: number;
  gemsEarned: number;
  stats: PlayerStats;
  leaderboard: Awaited<ReturnType<typeof getLeaderboard>>;
  playerRank: number | null;
};

export const recordScore = async (
  userId: string,
  username: string,
  score: number
): Promise<RecordScoreResult> => {
  const profileKey = redisKeys.userProfile(userId);
  const profile = await redis.hGetAll(profileKey);
  const totalGames = parseIntField(profile['totalGames'], 0);
  const lastPlayedDate = profile['lastPlayedDate'];
  const today = new Date().toISOString().slice(0, 10);
  const isFirstGameOfDay = lastPlayedDate !== today;

  const bestRaw = await redis.get(redisKeys.userBest(userId));
  const personalBest = parseIntField(bestRaw, 0);
  const isPersonalBest = score > personalBest;

  if (isPersonalBest) {
    await redis.set(redisKeys.userBest(userId), String(score));
  }

  // Award XP
  const xpEarned = calculateXpAward({ score, isPersonalBest, isFirstGameOfDay });
  await redis.incrBy(redisKeys.userXp(userId), xpEarned);

  // Award gems
  const gemsEarned = calculateGemAward({ score, isPersonalBest, isFirstGameOfDay });
  const newGemsTotal = await redis.incrBy(redisKeys.userGems(userId), gemsEarned);

  // Update profile counters
  await redis.hSet(profileKey, {
    totalGames: String(totalGames + 1),
    lastPlayedDate: today,
  });
  await redis.incrBy(redisKeys.statsTotalGames(), 1);

  const streak = await updateStreak(userId);
  await submitDailyScore(userId, username, score);
  await incrementPlayersToday(userId);

  // Keep gems leaderboard in sync with the user's new total
  await updateGemsLeaderboard(userId, username, newGemsTotal);

  // Read fresh XP total after increment
  const xpRaw = await redis.get(redisKeys.userXp(userId));
  const xp = parseIntField(xpRaw, 0);

  const stats: PlayerStats = {
    personalBest: Math.max(personalBest, score),
    totalGames: totalGames + 1,
    gems: newGemsTotal,
    streak,
    xp: {
      total: xp,
      level: getLevelFromXp(xp),
      progress: getProgressToNextLevel(xp),
    },
  };

  const [leaderboard, playerRank] = await Promise.all([
    getLeaderboard(5),
    getPlayerRank(userId),
  ]);

  return {
    isPersonalBest,
    xpEarned,
    gemsEarned,
    stats,
    leaderboard,
    playerRank,
  };
};

// Exported so the init route can fetch gems leaderboard
export { getGemsLeaderboard };
