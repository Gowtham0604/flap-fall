import type { LeaderboardEntry, PlayerStats } from '../../shared/api';

type GameHudProps = {
  stats: PlayerStats;
  playersToday: number;
  dayNumber: number;
  playerRank: number | null;
  leaderboard: LeaderboardEntry[];
};

export const GameHud = ({
  stats,
  playersToday,
  dayNumber,
  playerRank,
  leaderboard,
}: GameHudProps) => {
  return (
    <div
      className="w-full px-3 pb-2 flex flex-col gap-2"
      style={{ fontFamily: '"Courier New", Courier, monospace' }}
    >
      {/* ── Stat pills ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5">
        <span className="bg-[#0f3460] border border-[#3a80b8] text-[#ffd700] px-2 py-0.5 rounded text-xs uppercase tracking-wide">
          🔥 {stats.streak.current}d
        </span>
        <span className="bg-[#0f3460] border border-[#3a80b8] text-[#ffd700] px-2 py-0.5 rounded text-xs uppercase tracking-wide">
          🏆 {stats.personalBest}
        </span>
        <span className="bg-[#0f3460] border border-[#3a80b8] text-[#ffd700] px-2 py-0.5 rounded text-xs uppercase tracking-wide">
          💎 {stats.gems}
        </span>
        <span className="bg-[#0f3460] border border-[#3a80b8] text-[#5ba3d0] px-2 py-0.5 rounded text-xs uppercase tracking-wide">
          Lv.{stats.xp.level} {stats.xp.progress.percent}%
        </span>
        <span className="bg-[#0f3460] border border-[#3a80b8] text-[#5ba3d0] px-2 py-0.5 rounded text-xs uppercase tracking-wide">
          👥 {playersToday}
        </span>
      </div>

      {/* ── Daily leaderboard ─────────────────────────────────────────────── */}
      <div className="bg-[#0f3460] border border-[#3a80b8] rounded-lg px-3 py-2 text-xs">
        <p className="text-[#5ba3d0] uppercase tracking-widest mb-1">
          Daily #{dayNumber}
          {playerRank !== null && (
            <span className="ml-2 text-[#ffd700]">· You #{playerRank}</span>
          )}
        </p>
        {leaderboard.length === 0 ? (
          <p className="text-[#3a80b8]">Be the first on the board!</p>
        ) : (
          <ol className="flex flex-col gap-0.5">
            {leaderboard.map((entry) => (
              <li
                key={entry.rank}
                className="flex justify-between text-[#c8e6f5]"
              >
                <span>
                  <span className="text-[#ffd700] mr-1">#{entry.rank}</span>
                  {entry.username}
                </span>
                <span className="font-bold text-[#ffd700]">{entry.score}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
};
