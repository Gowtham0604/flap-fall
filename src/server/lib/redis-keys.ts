import { getDateString } from '../../shared/date';

export const redisKeys = {
  // ─── User ─────────────────────────────────────────────────────────────────
  userBest: (userId: string): string => `user:${userId}:best`,
  userXp: (userId: string): string => `user:${userId}:xp`,
  userGems: (userId: string): string => `user:${userId}:gems`,
  userStreak: (userId: string): string => `user:${userId}:streak`,
  userProfile: (userId: string): string => `user:${userId}:profile`,
  userUsername: (userId: string): string => `user:${userId}:username`,

  // ─── Daily ────────────────────────────────────────────────────────────────
  dailyLeaderboard: (date?: Date): string =>
    `leaderboard:daily:${getDateString(date ?? new Date())}`,
  dailyPlayers: (date?: Date): string =>
    `daily:${getDateString(date ?? new Date())}:players`,
  dailyPostId: (date?: Date): string =>
    `daily:${getDateString(date ?? new Date())}:postId`,
  dailyLatest: (): string => 'daily:latest',

  // ─── Leaderboards ─────────────────────────────────────────────────────────
  gemsLeaderboard: (): string => 'leaderboard:gems:alltime',

  // ─── Posts ────────────────────────────────────────────────────────────────
  postScoreThread: (postId: string): string => `post:${postId}:scoreThread`,

  // ─── Global stats ─────────────────────────────────────────────────────────
  statsTotalGames: (): string => 'stats:totalGames',

  // ─── Level builder ────────────────────────────────────────────────────────
  levelData: (levelId: string): string => `level:${levelId}:data`,
  levelMeta: (levelId: string): string => `level:${levelId}:meta`,
  levelRatings: (levelId: string): string => `level:${levelId}:ratings`,
  userLevels: (userId: string): string => `user:${userId}:levels`,
  publishedLevels: (): string => 'levels:published',
};
