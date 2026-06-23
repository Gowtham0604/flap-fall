import { useCallback, useEffect, useState } from 'react';
import type {
  InitResponse,
  SubmitScoreResponse,
} from '../../shared/api';

type GameSessionState = {
  loading: boolean;
  init: InitResponse | null;
  lastResult: SubmitScoreResponse | null;
  error: string | null;
};

const fetchInit = async (): Promise<InitResponse> => {
  const res = await fetch('/api/init');
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as { message?: string }).message ?? 'Failed to load game');
  }
  return data as InitResponse;
};

export const useGameSession = () => {
  const [state, setState] = useState<GameSessionState>({
    loading: true,
    init: null,
    lastResult: null,
    error: null,
  });

  const reload = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const init = await fetchInit();
      setState((prev) => ({ ...prev, loading: false, init }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load game';
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, []);

  useEffect(() => {
    let active = true;

    void fetchInit()
      .then((init) => {
        if (active) {
          setState((prev) => ({ ...prev, loading: false, init }));
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        const message =
          error instanceof Error ? error.message : 'Failed to load game';
        setState((prev) => ({ ...prev, loading: false, error: message }));
      });

    return () => {
      active = false;
    };
  }, []);

  const submitScore = useCallback(
    async (score: number, durationMs: number): Promise<SubmitScoreResponse | null> => {
      try {
        const res = await fetch('/api/submit-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ score, durationMs }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(
            (data as { message?: string }).message ?? 'Failed to submit score'
          );
        }
        const result = data as SubmitScoreResponse;

        setState((prev) => ({
          ...prev,
          lastResult: result,
          init: prev.init
            ? {
                ...prev.init,
                stats: result.stats,
                leaderboard: result.leaderboard,
                playerRank: result.playerRank,
              }
            : prev.init,
        }));
        return result;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to submit score';
        setState((prev) => ({ ...prev, error: message }));
        return null;
      }
    },
    []
  );

  const shareScore = useCallback(async (shareText: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/share-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareText }),
      });
      const data = await res.json();
      return res.ok && (data as { success?: boolean }).success === true;
    } catch {
      return false;
    }
  }, []);

  return {
    ...state,
    reload,
    submitScore,
    shareScore,
  };
};
