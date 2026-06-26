import { showToast } from '@devvit/web/client';
import { useCallback, useState } from 'react';
import type { SubmitScoreResponse } from '../../shared/api';

type GameOverScreenProps = {
  /** The final score — available immediately on death. */
  score: number;
  /** Full submission result; null while the network request is in flight. */
  result: SubmitScoreResponse | null;
  onPlayAgain: () => void;
  onShareScore: () => Promise<boolean>;
};

export const GameOverScreen = ({
  score,
  result,
  onPlayAgain,
  onShareScore,
}: GameOverScreenProps) => {
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);
  const isPB = result?.isPersonalBest ?? false;

  const handleShareScore = useCallback(async () => {
    if (!result || sharing || shared) return;
    setSharing(true);
    try {
      const success = await onShareScore();
      if (success) {
        setShared(true);
        void showToast('Score posted to comments!');
      } else {
        void showToast('Could not post score. Try again.');
      }
    } finally {
      setSharing(false);
    }
  }, [onShareScore, result, sharing, shared]);

  return (
    /* Full-canvas overlay */
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center px-5 gap-4"
      style={{
        background: 'rgba(8, 16, 36, 0.94)',
        fontFamily: '"Courier New", Courier, monospace',
      }}
    >
      {/* ── Title ─────────────────────────────────────────────────────── */}
      <h2
        className="text-xl font-bold uppercase tracking-widest text-center"
        style={{
          color: isPB ? '#ffd700' : '#ff6644',
          textShadow: '2px 2px 0 #000',
        }}
      >
        {isPB ? '★ New Personal Best!' : 'Game  Over'}
      </h2>

      {/* ── Score ─────────────────────────────────────────────────────── */}
      <div className="text-center">
        <div
          className="font-bold text-white leading-none"
          style={{ fontSize: '5.5rem', textShadow: '4px 4px 0 #0f3460' }}
        >
          {score}
        </div>
        <div className="text-[#5ba3d0] text-xs uppercase tracking-widest mt-1">
          pipes cleared
        </div>
      </div>

      {/* ── Rewards row ───────────────────────────────────────────────── */}
      <div className="flex items-stretch gap-0 w-full max-w-[260px] rounded-xl overflow-hidden border-2 border-[#3a80b8] bg-[#0f3460]">
        {result ? (
          <>
            <div className="flex-1 flex flex-col items-center py-3">
              <span className="text-[#ffd700] font-bold text-base">+{result.xpEarned}</span>
              <span className="text-[#5ba3d0] text-xs mt-0.5">XP</span>
            </div>
            <div className="w-px bg-[#3a80b8]" />
            <div className="flex-1 flex flex-col items-center py-3">
              <span className="text-[#ffd700] font-bold text-base">+{result.gemsEarned} 💎</span>
              <span className="text-[#5ba3d0] text-xs mt-0.5">Gems</span>
            </div>
            {result.playerRank !== null && (
              <>
                <div className="w-px bg-[#3a80b8]" />
                <div className="flex-1 flex flex-col items-center py-3">
                  <span className="text-[#5ba3d0] font-bold text-base">#{result.playerRank}</span>
                  <span className="text-[#5ba3d0] text-xs mt-0.5">Rank</span>
                </div>
              </>
            )}
          </>
        ) : (
          /* Score is submitted in the background — keep the row height stable */
          <div className="flex-1 flex items-center justify-center py-3">
            <span className="text-[#3a80b8] text-xs uppercase tracking-widest animate-pulse">
              Saving…
            </span>
          </div>
        )}
      </div>

      {/* ── Action buttons ────────────────────────────────────────────── */}
      <div className="flex w-full max-w-[260px] gap-2">
        <button
          type="button"
          onClick={onPlayAgain}
          className="flex-1 py-3 rounded-lg font-bold text-sm uppercase tracking-wider select-none transition-opacity active:opacity-75"
          style={{
            background: '#0f3460',
            border: '3px solid #ffd700',
            color: '#ffd700',
            boxShadow: '0 4px 0 #0a1a30',
          }}
        >
          ↺ Play Again
        </button>
        <button
          type="button"
          onClick={() => void handleShareScore()}
          disabled={!result || sharing || shared}
          className="flex-1 py-3 rounded-lg font-bold text-sm uppercase tracking-wider select-none transition-opacity active:opacity-75 disabled:opacity-50"
          style={{
            background: shared ? '#1a4a2a' : '#0f3460',
            border: `3px solid ${shared ? '#4ade80' : '#3a80b8'}`,
            color: shared ? '#4ade80' : '#5ba3d0',
            boxShadow: '0 4px 0 #0a1a30',
          }}
        >
          {shared ? '✓ Shared' : sharing ? '…' : '💬 Comment Score'}
        </button>
      </div>
    </div>
  );
};
