import { showToast } from '@devvit/web/client';
import type { SubmitScoreResponse } from '../../shared/api';

type GameOverScreenProps = {
  result: SubmitScoreResponse;
  onShare: (shareText: string) => Promise<boolean>;
  onPlayAgain: () => void;
};

export const GameOverScreen = ({
  result,
  onShare,
  onPlayAgain,
}: GameOverScreenProps) => {
  const handleShare = async (): Promise<void> => {
    const shared = await onShare(result.shareText);
    if (shared) {
      showToast('Score shared to the thread!');
    } else {
      showToast('Could not share — no score thread on this post');
    }
  };

  const isPB = result.isPersonalBest;

  return (
    /* Full-canvas overlay — positioned absolute so it sits ON the game canvas */
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center px-5"
      style={{
        background: 'rgba(8, 16, 36, 0.94)',
        fontFamily: '"Courier New", Courier, monospace',
      }}
    >
      {/* ── Title ─────────────────────────────────────────────────────── */}
      <h2
        className="text-xl font-bold uppercase tracking-widest mb-3 text-center"
        style={{
          color: isPB ? '#ffd700' : '#ff6644',
          textShadow: '2px 2px 0 #000',
        }}
      >
        {isPB ? '★ New Personal Best!' : 'Game  Over'}
      </h2>

      {/* ── Score ─────────────────────────────────────────────────────── */}
      <div className="text-center mb-4">
        <div
          className="font-bold text-white leading-none"
          style={{ fontSize: '5.5rem', textShadow: '4px 4px 0 #0f3460' }}
        >
          {result.score}
        </div>
        <div className="text-[#5ba3d0] text-xs uppercase tracking-widest mt-1">
          pipes cleared
        </div>
      </div>

      {/* ── Rewards row ───────────────────────────────────────────────── */}
      <div className="flex items-stretch gap-0 w-full max-w-[280px] mb-4 rounded-xl overflow-hidden border-2 border-[#3a80b8] bg-[#0f3460]">
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
      </div>

      {/* ── Share text preview ────────────────────────────────────────── */}
      <pre className="w-full max-w-[280px] text-xs rounded-lg p-3 whitespace-pre-wrap leading-relaxed text-[#8bbfd0] bg-[#080f28] border border-[#2a5080] mb-5">
        {result.shareText}
      </pre>

      {/* ── Action buttons ────────────────────────────────────────────── */}
      <div className="flex gap-3 w-full max-w-[280px]">
        <button
          type="button"
          onClick={() => void handleShare()}
          className="flex-1 py-3 rounded-lg font-bold text-sm uppercase tracking-wider text-white select-none transition-opacity active:opacity-75"
          style={{
            background: '#d93900',
            border: '3px solid #ff5522',
            boxShadow: '0 4px 0 #7a1e00',
          }}
        >
          Share
        </button>
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
      </div>
    </div>
  );
};
