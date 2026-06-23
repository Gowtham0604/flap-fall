import { redis } from '@devvit/web/server';
import type { GemLeaderboardEntry, LeaderboardEntry } from '../../shared/api';
import { redisKeys } from './redis-keys';

// ─── Daily score leaderboard ──────────────────────────────────────────────────

export const submitDailyScore = async (
  userId: string,
  username: string,
  score: number
): Promise<void> => {
  const key = redisKeys.dailyLeaderboard();
  const current = await redis.zScore(key, userId);
  if (current === undefined || score > current) {
    await redis.zAdd(key, { member: userId, score });
    await redis.set(redisKeys.userUsername(userId), username);
  }
};

export const getLeaderboard = async (
  limit = 10
): Promise<LeaderboardEntry[]> => {
  const key = redisKeys.dailyLeaderboard();
  const results = await redis.zRange(key, 0, limit - 1, {
    by: 'rank',
    reverse: true,
  });

  const entries: LeaderboardEntry[] = [];
  for (let i = 0; i < results.length; i += 1) {
    const entry = results[i];
    if (!entry) {
      continue;
    }
    const username =
      (await redis.get(redisKeys.userUsername(entry.member))) ??
      entry.member.slice(0, 8);
    entries.push({
      rank: i + 1,
      username,
      score: entry.score,
    });
  }
  return entries;
};

export const getPlayerRank = async (userId: string): Promise<number | null> => {
  const key = redisKeys.dailyLeaderboard();
  const results = await redis.zRange(key, 0, -1, {
    by: 'rank',
    reverse: true,
  });
  const index = results.findIndex((entry) => entry.member === userId);
  return index === -1 ? null : index + 1;
};

export const incrementPlayersToday = async (userId: string): Promise<number> => {
  const key = redisKeys.dailyPlayers();
  await redis.zAdd(key, { member: userId, score: Date.now() });
  return redis.zCard(key);
};

export const getPlayersToday = async (): Promise<number> => {
  return redis.zCard(redisKeys.dailyPlayers());
};

// ─── All-time gems leaderboard ────────────────────────────────────────────────

export const updateGemsLeaderboard = async (
  userId: string,
  username: string,
  totalGems: number
): Promise<void> => {
  await redis.zAdd(redisKeys.gemsLeaderboard(), {
    member: userId,
    score: totalGems,
  });
  // Ensure username cache is always fresh
  await redis.set(redisKeys.userUsername(userId), username);
};

export const getGemsLeaderboard = async (
  limit = 10
): Promise<GemLeaderboardEntry[]> => {
  const key = redisKeys.gemsLeaderboard();
  const results = await redis.zRange(key, 0, limit - 1, {
    by: 'rank',
    reverse: true,
  });

  const entries: GemLeaderboardEntry[] = [];
  for (let i = 0; i < results.length; i += 1) {
    const entry = results[i];
    if (!entry) {
      continue;
    }
    const username =
      (await redis.get(redisKeys.userUsername(entry.member))) ??
      entry.member.slice(0, 8);
    entries.push({
      rank: i + 1,
      username,
      gems: entry.score,
    });
  }
  return entries;
};
