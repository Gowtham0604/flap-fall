export type LeaderboardEntry = {
  rank: number;
  username: string;
  score: number;
};

export type GemLeaderboardEntry = {
  rank: number;
  username: string;
  gems: number;
};

export type StreakInfo = {
  current: number;
  longest: number;
  extended: boolean;
  broken: boolean;
};

export type XpInfo = {
  total: number;
  level: number;
  progress: {
    current: number;
    required: number;
    percent: number;
  };
};

export type PlayerStats = {
  personalBest: number;
  totalGames: number;
  gems: number;
  streak: StreakInfo;
  xp: XpInfo;
};

export type InitResponse = {
  type: 'init';
  postId: string;
  username: string;
  dayNumber: number;
  playersToday: number;
  stats: PlayerStats;
  leaderboard: LeaderboardEntry[];
  playerRank: number | null;
  gemLeaderboard: GemLeaderboardEntry[];
};

export type SubmitScoreRequest = {
  score: number;
  durationMs: number;
};

export type SubmitScoreResponse = {
  type: 'submit-score';
  postId: string;
  score: number;
  isPersonalBest: boolean;
  xpEarned: number;
  gemsEarned: number;
  stats: PlayerStats;
  leaderboard: LeaderboardEntry[];
  playerRank: number | null;
  shareText: string;
};

export type ShareScoreRequest = {
  shareText: string;
};

export type ShareScoreResponse = {
  type: 'share-score';
  success: boolean;
};

export type ErrorResponse = {
  status: 'error';
  message: string;
};
