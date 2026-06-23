import './index.css';

import { StrictMode, useCallback, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { navigateTo } from '@devvit/web/client';
import { FlapGame } from './components/FlapGame';
import { GameHud } from './components/GameHud';
import { GameOverScreen } from './components/GameOverScreen';
import { GameOverlay } from './components/GameOverlay';
import { useGameSession } from './hooks/useGameSession';
import { createAudioManager } from './lib/audio';
import type { SubmitScoreResponse } from '../shared/api';

export const App = () => {
  const { loading, init, lastResult, error, submitScore, shareScore } =
    useGameSession();
  const [gameKey, setGameKey] = useState(0);
  const [localResult, setLocalResult] = useState<SubmitScoreResponse | null>(null);
  const [isDead, setIsDead] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const audioManager = useMemo(() => createAudioManager(), []);

  const gemLeaderboard = useMemo(
    () => init?.gemLeaderboard ?? [],
    [init?.gemLeaderboard]
  );

  const handleGameOver = useCallback(
    async (score: number, durationMs: number) => {
      setIsDead(true);
      setIsSubmitting(true);
      const result = await submitScore(score, durationMs);
      setIsSubmitting(false);
      if (result) {
        setLocalResult(result);
      }
    },
    [submitScore]
  );

  const handlePlayAgain = useCallback(() => {
    setLocalResult(null);
    setIsDead(false);
    setIsSubmitting(false);
    setGameKey((k) => k + 1);
  }, []);

  const result = localResult ?? lastResult;

  // ── Loading / error states ──────────────────────────────────────────────────
  if (loading || !init) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center"
        style={{ background: '#0f3460' }}
      >
        <p
          className="text-[#ffd700] tracking-widest text-sm uppercase animate-pulse"
          style={{ fontFamily: '"Courier New", Courier, monospace' }}
        >
          Loading…
        </p>
      </div>
    );
  }

  const gameColCls = 'w-full max-w-[500px] mx-auto';

  return (
    <div
      className="flex flex-col items-center min-h-dvh overflow-x-hidden"
      style={{ background: '#1a1a2e' }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header
        className={`${gameColCls} px-3 pt-3 pb-1 flex items-center justify-between shrink-0`}
        style={{ fontFamily: '"Courier New", Courier, monospace' }}
      >
        <h1 className="text-[#ffd700] font-bold text-base tracking-widest uppercase">
          Flap Fall
        </h1>
        <p className="text-[#5ba3d0] text-xs">
          {init.username} · Lv.{init.stats.xp.level}
        </p>
      </header>

      {/* ── HUD strip ──────────────────────────────────────────────────── */}
      <div className={`${gameColCls} shrink-0`}>
        <GameHud
          stats={init.stats}
          playersToday={init.playersToday}
          dayNumber={init.dayNumber}
          playerRank={init.playerRank}
          leaderboard={init.leaderboard}
        />
      </div>

      {/* ── Game area: canvas + all overlays ───────────────────────────── */}
      <div className={`relative ${gameColCls} grow`}>
        <FlapGame
          key={gameKey}
          onGameOver={(score, durationMs) => void handleGameOver(score, durationMs)}
          audioManager={audioManager}
        />

        {/* Icon buttons (💎 / ⚙ / 🔊) — always on top */}
        <GameOverlay
          showRestart={false}
          onRestart={handlePlayAgain}
          stats={init.stats}
          gemLeaderboard={gemLeaderboard}
          lastResult={result}
          audioManager={audioManager}
        />

        {/* Score-submitting indicator */}
        {isDead && isSubmitting && (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center"
            style={{
              background: 'rgba(8, 16, 36, 0.82)',
              fontFamily: '"Courier New", Courier, monospace',
            }}
          >
            <p className="text-[#ffd700] tracking-widest text-sm uppercase animate-pulse">
              Submitting…
            </p>
          </div>
        )}

        {/* Game-over overlay — lives ON the canvas, not below it */}
        {isDead && !isSubmitting && result && (
          <GameOverScreen
            result={result}
            onShare={shareScore}
            onPlayAgain={handlePlayAgain}
          />
        )}
      </div>

      {/* ── Error banner ───────────────────────────────────────────────── */}
      {error && (
        <p
          className="shrink-0 text-sm text-red-400 px-4 py-2 text-center"
          style={{ fontFamily: '"Courier New", Courier, monospace' }}
        >
          {error}
        </p>
      )}

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer
        className="shrink-0 py-3 flex gap-3 text-[0.7rem] text-[#3a80b8]"
        style={{ fontFamily: '"Courier New", Courier, monospace' }}
      >
        <button
          type="button"
          className="hover:text-[#ffd700] transition-colors cursor-pointer"
          onClick={() => navigateTo('https://developers.reddit.com/docs')}
        >
          Docs
        </button>
        <span className="text-[#2a4060]">|</span>
        <button
          type="button"
          className="hover:text-[#ffd700] transition-colors cursor-pointer"
          onClick={() => navigateTo('https://www.reddit.com/r/Devvit')}
        >
          r/Devvit
        </button>
      </footer>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
