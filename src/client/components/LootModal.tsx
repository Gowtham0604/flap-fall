import type { GemLeaderboardEntry, PlayerStats, SubmitScoreResponse } from '../../shared/api';
import { GEM_REWARDS } from '../../shared/xp';

type LootModalProps = {
  stats: PlayerStats;
  gemLeaderboard: GemLeaderboardEntry[];
  lastResult: SubmitScoreResponse | null;
  onClose: () => void;
};

type RewardRow = {
  label: string;
  gems: number;
  earned: boolean;
};

/** Build the reward breakdown for the last game, or show the catalogue if no game yet. */
const buildRewardRows = (
  result: SubmitScoreResponse | null
): RewardRow[] => {
  if (!result) {
    // Just show the catalogue of possible rewards
    return [
      { label: 'Complete a game', gems: GEM_REWARDS.gameComplete, earned: false },
      { label: 'Personal best', gems: GEM_REWARDS.personalBest, earned: false },
      { label: 'First game of the day', gems: GEM_REWARDS.firstGameOfDay, earned: false },
      { label: 'Score 10+ pipes', gems: GEM_REWARDS.scoreThresholdTen, earned: false },
      { label: 'Score 25+ pipes', gems: GEM_REWARDS.scoreThresholdTwentyFive, earned: false },
    ];
  }

  const s = result.score;
  return [
    {
      label: 'Complete a game',
      gems: GEM_REWARDS.gameComplete,
      earned: true,
    },
    {
      label: 'Personal best',
      gems: GEM_REWARDS.personalBest,
      earned: result.isPersonalBest,
    },
    {
      label: 'First game of the day',
      gems: GEM_REWARDS.firstGameOfDay,
      // We can infer this if gemsEarned > baseline
      earned:
        result.gemsEarned >=
        GEM_REWARDS.gameComplete + GEM_REWARDS.firstGameOfDay,
    },
    {
      label: 'Score 10+ pipes',
      gems: GEM_REWARDS.scoreThresholdTen,
      earned: s >= 10 && s < 25,
    },
    {
      label: 'Score 25+ pipes',
      gems: GEM_REWARDS.scoreThresholdTwentyFive,
      earned: s >= 25,
    },
  ];
};

export const LootModal = ({
  stats,
  gemLeaderboard,
  lastResult,
  onClose,
}: LootModalProps) => {
  const rows = buildRewardRows(lastResult);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Loot and rewards"
    >
      {/* Panel — stop clicks from closing */}
      <div
        className="relative w-full max-w-[340px] mx-4 rounded-xl overflow-hidden shadow-2xl"
        style={{ fontFamily: '"Courier New", Courier, monospace' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pixel-art header band */}
        <div className="bg-[#0f3460] px-4 pt-4 pb-3 flex items-center justify-between border-b-4 border-[#ffd700]">
          <h2 className="text-[#ffd700] font-bold text-lg tracking-widest uppercase">
            💎 Loot &amp; Rewards
          </h2>
          <button
            type="button"
            aria-label="Close loot panel"
            className="text-[#ffd700] text-xl leading-none hover:text-white transition-colors"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="bg-[#16213e] px-4 py-4 flex flex-col gap-4">
          {/* Gem wallet */}
          <div className="flex items-center justify-between bg-[#0f3460] rounded-lg px-4 py-3 border-2 border-[#ffd700]">
            <span className="text-[#ffd700] text-sm uppercase tracking-widest">
              Your Gems
            </span>
            <span className="text-[#ffd700] text-2xl font-bold">
              💎 {stats.gems.toLocaleString()}
            </span>
          </div>

          {/* Last game earned */}
          {lastResult && (
            <div className="bg-[#1a4a7a]/60 rounded-lg px-3 py-2 border border-[#3a80b8]">
              <p className="text-[#5ba3d0] text-xs uppercase tracking-widest mb-1">
                Last game
              </p>
              <p className="text-white text-sm">
                <span className="text-[#ffd700] font-bold">
                  +{lastResult.gemsEarned} gems
                </span>
                {' '}earned
                {lastResult.isPersonalBest && (
                  <span className="ml-2 text-[#ffd700]">🏆 New PB!</span>
                )}
              </p>
            </div>
          )}

          {/* Reward catalogue */}
          <div>
            <p className="text-[#5ba3d0] text-xs uppercase tracking-widest mb-2">
              Reward table
            </p>
            <ul className="flex flex-col gap-1">
              {rows.map((row) => (
                <li
                  key={row.label}
                  className={[
                    'flex justify-between items-center px-3 py-1.5 rounded text-sm',
                    row.earned
                      ? 'bg-[#0f3460] border border-[#ffd700] text-[#ffd700]'
                      : 'bg-[#0a2240] text-[#3a80b8]',
                  ].join(' ')}
                >
                  <span>{row.earned ? '✓ ' : '○ '}{row.label}</span>
                  <span className="font-bold">+{row.gems} 💎</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Gems leaderboard */}
          {gemLeaderboard.length > 0 && (
            <div>
              <p className="text-[#5ba3d0] text-xs uppercase tracking-widest mb-2">
                All-time gem leaders
              </p>
              <ol className="flex flex-col gap-1">
                {gemLeaderboard.map((entry) => (
                  <li
                    key={entry.rank}
                    className="flex justify-between items-center px-3 py-1 rounded bg-[#0a2240] text-sm text-[#c8e6f5]"
                  >
                    <span>
                      <span className="text-[#ffd700] mr-2">#{entry.rank}</span>
                      {entry.username}
                    </span>
                    <span className="font-bold text-[#ffd700]">
                      {entry.gems.toLocaleString()} 💎
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* XP level bar */}
          <div>
            <p className="text-[#5ba3d0] text-xs uppercase tracking-widest mb-1">
              Level {stats.xp.level}
            </p>
            <div className="h-3 bg-[#0a2240] rounded overflow-hidden border border-[#3a80b8]">
              <div
                className="h-full bg-[#ffd700] transition-all duration-500"
                style={{ width: `${stats.xp.progress.percent}%` }}
              />
            </div>
            <p className="text-[#3a80b8] text-xs mt-1 text-right">
              {stats.xp.progress.current} / {stats.xp.progress.required} XP
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
