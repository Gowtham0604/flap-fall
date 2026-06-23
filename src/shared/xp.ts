export const xpForLevel = (level: number): number => {
  if (level <= 1) {
    return 0;
  }
  return Math.floor(100 * Math.pow(level - 1, 1.5));
};

export const getLevelFromXp = (xp: number): number => {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) {
    level += 1;
  }
  return level;
};

export type XpProgress = {
  current: number;
  required: number;
  percent: number;
};

export const getProgressToNextLevel = (xp: number): XpProgress => {
  const level = getLevelFromXp(xp);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const current = xp - currentLevelXp;
  const required = nextLevelXp - currentLevelXp;
  return {
    current,
    required,
    percent: required > 0 ? Math.floor((current / required) * 100) : 100,
  };
};

export const XP_REWARDS = {
  gameComplete: 10,
  personalBest: 50,
  firstGameOfDay: 15,
  dailyChallenge: 30,
} as const;

export const calculateXpAward = (options: {
  score: number;
  isPersonalBest: boolean;
  isFirstGameOfDay: boolean;
}): number => {
  let xp = XP_REWARDS.gameComplete;
  if (options.isPersonalBest) {
    xp += XP_REWARDS.personalBest;
  }
  if (options.isFirstGameOfDay) {
    xp += XP_REWARDS.firstGameOfDay;
  }
  if (options.score > 0) {
    xp += Math.min(options.score, 20);
  }
  return xp;
};

// Gem rewards — separate hard currency earned per game
export const GEM_REWARDS = {
  gameComplete: 1,
  personalBest: 5,
  firstGameOfDay: 2,
  scoreThresholdTen: 3,   // bonus when score >= 10
  scoreThresholdTwentyFive: 5, // bonus when score >= 25
} as const;

export const calculateGemAward = (options: {
  score: number;
  isPersonalBest: boolean;
  isFirstGameOfDay: boolean;
}): number => {
  let gems = GEM_REWARDS.gameComplete;
  if (options.isPersonalBest) {
    gems += GEM_REWARDS.personalBest;
  }
  if (options.isFirstGameOfDay) {
    gems += GEM_REWARDS.firstGameOfDay;
  }
  if (options.score >= 25) {
    gems += GEM_REWARDS.scoreThresholdTwentyFive;
  } else if (options.score >= 10) {
    gems += GEM_REWARDS.scoreThresholdTen;
  }
  return gems;
};
