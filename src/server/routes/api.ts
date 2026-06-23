import { Hono } from 'hono';
import { reddit } from '@devvit/web/server';
import { isScorePlausible } from '../../shared/game-engine';
import { getDayNumber } from '../../shared/date';
import type {
  ErrorResponse,
  InitResponse,
  ShareScoreRequest,
  ShareScoreResponse,
  SubmitScoreRequest,
  SubmitScoreResponse,
} from '../../shared/api';
import type {
  LevelGetResponse,
  LevelListResponse,
  LevelPublishRequest,
  LevelPublishResponse,
  LevelRateRequest,
  LevelRateResponse,
  LevelSaveRequest,
  LevelSaveResponse,
} from '../../shared/level-builder';
import { requirePostId, requireUserId } from '../lib/context-guards';
import {
  getGemsLeaderboard,
  getLeaderboard,
  getPlayerRank,
  getPlayersToday,
} from '../lib/leaderboard';
import { getPlayerStats, recordScore } from '../lib/player';
import {
  buildShareText,
  getDayNumberForShare,
  shareScoreToThread,
} from '../lib/share-score';
import {
  getLevelById,
  incrementLevelPlays,
  listPublishedLevels,
  publishLevel,
  rateLevel,
  saveLevel,
} from '../lib/levels';

export const api = new Hono();

// ─── Game session ─────────────────────────────────────────────────────────────

api.get('/init', async (c) => {
  try {
    const postId = requirePostId();
    const [username, stats, leaderboard, playersToday, playerRank, gemLeaderboard] =
      await Promise.all([
        reddit.getCurrentUsername(),
        (async () => {
          try {
            const userId = requireUserId();
            return getPlayerStats(userId);
          } catch {
            return {
              personalBest: 0,
              totalGames: 0,
              gems: 0,
              streak: { current: 0, longest: 0, extended: false, broken: false },
              xp: {
                total: 0,
                level: 1,
                progress: { current: 0, required: 100, percent: 0 },
              },
            };
          }
        })(),
        getLeaderboard(5),
        getPlayersToday(),
        (async () => {
          try {
            const userId = requireUserId();
            return getPlayerRank(userId);
          } catch {
            return null;
          }
        })(),
        getGemsLeaderboard(5),
      ]);

    return c.json<InitResponse>({
      type: 'init',
      postId,
      username: username ?? 'guest',
      dayNumber: getDayNumber(),
      playersToday,
      stats,
      leaderboard,
      playerRank,
      gemLeaderboard,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error during initialization';
    console.error('API Init Error:', error);
    return c.json<ErrorResponse>({ status: 'error', message }, 400);
  }
});

api.post('/submit-score', async (c) => {
  const postId = requirePostId();

  try {
    const userId = requireUserId();
    const body = await c.req.json<SubmitScoreRequest>();
    const { score, durationMs } = body;

    if (!Number.isFinite(score) || !Number.isFinite(durationMs)) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Invalid score payload' },
        400
      );
    }

    if (!isScorePlausible(score, durationMs)) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Score failed validation' },
        400
      );
    }

    const username = (await reddit.getCurrentUsername()) ?? userId.slice(0, 8);
    const result = await recordScore(userId, username, Math.floor(score));
    const shareText = buildShareText(
      Math.floor(score),
      result.stats.personalBest,
      getDayNumberForShare()
    );

    return c.json<SubmitScoreResponse>({
      type: 'submit-score',
      postId,
      score: Math.floor(score),
      isPersonalBest: result.isPersonalBest,
      xpEarned: result.xpEarned,
      gemsEarned: result.gemsEarned,
      stats: result.stats,
      leaderboard: result.leaderboard,
      playerRank: result.playerRank,
      shareText,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to submit score';
    console.error(`Submit score error for post ${postId}:`, error);
    return c.json<ErrorResponse>({ status: 'error', message }, 400);
  }
});

api.post('/share-score', async (c) => {
  const postId = requirePostId();

  try {
    requireUserId();
    const body = await c.req.json<ShareScoreRequest>();
    if (!body.shareText?.trim()) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Share text is required' },
        400
      );
    }

    const success = await shareScoreToThread(postId, body.shareText.trim());
    return c.json<ShareScoreResponse>({
      type: 'share-score',
      success,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to share score';
    return c.json<ErrorResponse>({ status: 'error', message }, 400);
  }
});

// ─── Level builder ────────────────────────────────────────────────────────────

api.post('/levels/save', async (c) => {
  try {
    const userId = requireUserId();
    const username = (await reddit.getCurrentUsername()) ?? userId.slice(0, 8);
    const body = await c.req.json<LevelSaveRequest>();

    const result = await saveLevel({
      levelId: body.levelId,
      authorId: userId,
      authorUsername: username,
      title: body.title ?? '',
      description: body.description ?? '',
      grid: body.grid ?? [],
    });

    if (!result.ok) {
      return c.json<ErrorResponse>({ status: 'error', message: result.message }, 400);
    }

    return c.json<LevelSaveResponse>({ type: 'level-save', levelId: result.levelId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save level';
    return c.json<ErrorResponse>({ status: 'error', message }, 400);
  }
});

api.post('/levels/publish', async (c) => {
  try {
    const userId = requireUserId();
    const body = await c.req.json<LevelPublishRequest>();

    if (!body.levelId) {
      return c.json<ErrorResponse>({ status: 'error', message: 'levelId is required' }, 400);
    }

    const result = await publishLevel(userId, body.levelId);
    if (!result.ok) {
      return c.json<ErrorResponse>({ status: 'error', message: result.message }, 400);
    }

    return c.json<LevelPublishResponse>({
      type: 'level-publish',
      levelId: result.levelId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to publish level';
    return c.json<ErrorResponse>({ status: 'error', message }, 400);
  }
});

api.get('/levels', async (c) => {
  try {
    const cursor = c.req.query('cursor') ?? null;
    const { levels, nextCursor } = await listPublishedLevels(cursor);
    return c.json<LevelListResponse>({ type: 'level-list', levels, cursor: nextCursor });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list levels';
    return c.json<ErrorResponse>({ status: 'error', message }, 400);
  }
});

api.get('/levels/:id', async (c) => {
  try {
    const levelId = c.req.param('id');
    const level = await getLevelById(levelId);

    if (!level) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Level not found' }, 404);
    }

    // Fire-and-forget play count increment
    void incrementLevelPlays(levelId);

    return c.json<LevelGetResponse>({ type: 'level-get', level });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get level';
    return c.json<ErrorResponse>({ status: 'error', message }, 400);
  }
});

api.post('/levels/rate', async (c) => {
  try {
    const userId = requireUserId();
    const body = await c.req.json<LevelRateRequest>();

    if (!body.levelId) {
      return c.json<ErrorResponse>({ status: 'error', message: 'levelId is required' }, 400);
    }

    const result = await rateLevel(userId, body.levelId, body.rating);
    if (!result.ok) {
      return c.json<ErrorResponse>({ status: 'error', message: result.message }, 400);
    }

    return c.json<LevelRateResponse>({
      type: 'level-rate',
      newAverage: result.newAverage,
      ratingCount: result.ratingCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to rate level';
    return c.json<ErrorResponse>({ status: 'error', message }, 400);
  }
});
