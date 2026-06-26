import './index.css';

import { StrictMode, useCallback, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FlapGame } from './components/FlapGame';
import { GameOverScreen } from './components/GameOverScreen';
import { GameOverlay } from './components/GameOverlay';
import { useGameSession } from './hooks/useGameSession';
import { createAudioManager } from './lib/audio';
import type { SubmitScoreResponse } from '../shared/api';

export const App = () => {
  const { init, lastResult, error, submitScore, shareScore } = useGameSession();
  const [gameKey, setGameKey] = useState(0);
  const [isDead, setIsDead] = useState(false);
  const [deadScore, setDeadScore] = useState(0);
  const [localResult, setLocalResult] = useState<SubmitScoreResponse | null>(null);

  const audioManager = useMemo(() => createAudioManager(), []);

  const gemLeaderboard = useMemo(
    () => init?.gemLeaderboard ?? [],
    [init?.gemLeaderboard]
  );

  const handleGameOver = useCallback(
    (score: number, durationMs: number) => {
      // Show game-over screen immediately — no await, no blocking overlay
      setIsDead(true);
      setDeadScore(score);
      // Submit in the background; rewards row fills in once the response arrives
      void submitScore(score, durationMs).then((result) => {
        if (result) setLocalResult(result);
      });
    },
    [submitScore]
  );

  const result = localResult ?? lastResult;

  const handleShareScore = useCallback(async () => {
    const shareText = result?.shareText;
    if (!shareText) return false;
    return shareScore(shareText);
  }, [result?.shareText, shareScore]);

  const handlePlayAgain = useCallback(() => {
    setLocalResult(null);
    setIsDead(false);
    setDeadScore(0);
    setGameKey((k) => k + 1);
  }, []);

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ background: '#1a1a2e', height: '100dvh' }}
    >
      {/* ── Game canvas (full screen) ───────────────────────────────────── */}
      <FlapGame
        key={gameKey}
        onGameOver={handleGameOver}
        audioManager={audioManager}
      />

      {/* ── Icon buttons (💎 / ⚙ / 🔊) — always on top ─────────────────── */}
      <GameOverlay
        showRestart={false}
        onRestart={handlePlayAgain}
        stats={init?.stats ?? null}
        gemLeaderboard={gemLeaderboard}
        lastResult={result}
        audioManager={audioManager}
      />

      {/* ── Game-over overlay — shown immediately on death ──────────────── */}
      {isDead && (
        <GameOverScreen
          score={deadScore}
          result={result}
          onPlayAgain={handlePlayAgain}
          onShareScore={handleShareScore}
        />
      )}

      {/* ── Error banner ────────────────────────────────────────────────── */}
      {error && (
        <div
          className="absolute bottom-4 left-0 right-0 flex justify-center z-50"
          style={{ fontFamily: '"Courier New", Courier, monospace' }}
        >
          <p className="text-sm text-red-400 px-4 py-2 bg-[#0f1a30] rounded-lg border border-red-800">
            {error}
          </p>
        </div>
      )}
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
