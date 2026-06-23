import { redis } from '@devvit/web/server';
import { randomUUID } from 'crypto';
import type {
  Level,
  LevelCell,
  LevelListEntry,
  LevelMetadata,
} from '../../shared/level-builder';
import {
  isValidGrid,
  MAX_LEVEL_DESCRIPTION_LENGTH,
  MAX_LEVEL_TITLE_LENGTH,
} from '../../shared/level-builder';
import { redisKeys } from './redis-keys';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const parseMeta = (raw: Record<string, string>): LevelMetadata => ({
  id: raw['id'] ?? '',
  authorId: raw['authorId'] ?? '',
  authorUsername: raw['authorUsername'] ?? '',
  title: raw['title'] ?? 'Untitled',
  description: raw['description'] ?? '',
  createdAt: Number(raw['createdAt'] ?? 0),
  updatedAt: Number(raw['updatedAt'] ?? 0),
  publishedAt: raw['publishedAt'] ? Number(raw['publishedAt']) : null,
  plays: Number(raw['plays'] ?? 0),
  rating: Number(raw['rating'] ?? 0),
  ratingCount: Number(raw['ratingCount'] ?? 0),
});

const metaToHash = (meta: LevelMetadata): Record<string, string> => ({
  id: meta.id,
  authorId: meta.authorId,
  authorUsername: meta.authorUsername,
  title: meta.title,
  description: meta.description,
  createdAt: String(meta.createdAt),
  updatedAt: String(meta.updatedAt),
  publishedAt: meta.publishedAt !== null ? String(meta.publishedAt) : '',
  plays: String(meta.plays),
  rating: String(meta.rating),
  ratingCount: String(meta.ratingCount),
});

// ─── Save / update a draft level ─────────────────────────────────────────────

export type SaveLevelOptions = {
  levelId: string | null;
  authorId: string;
  authorUsername: string;
  title: string;
  description: string;
  grid: LevelCell[];
};

export type SaveLevelError = { ok: false; message: string };
export type SaveLevelSuccess = { ok: true; levelId: string };
export type SaveLevelResult = SaveLevelSuccess | SaveLevelError;

export const saveLevel = async (
  opts: SaveLevelOptions
): Promise<SaveLevelResult> => {
  const title = opts.title.trim().slice(0, MAX_LEVEL_TITLE_LENGTH);
  const description = opts.description.trim().slice(0, MAX_LEVEL_DESCRIPTION_LENGTH);

  if (!title) {
    return { ok: false, message: 'Title is required' };
  }
  if (!isValidGrid(opts.grid)) {
    return { ok: false, message: 'Invalid grid data' };
  }

  const now = Date.now();
  let levelId = opts.levelId;
  let existingMeta: LevelMetadata | null = null;

  if (levelId) {
    // Verify the level exists and belongs to this author
    const raw = await redis.hGetAll(redisKeys.levelMeta(levelId));
    if (!raw['id']) {
      return { ok: false, message: 'Level not found' };
    }
    existingMeta = parseMeta(raw);
    if (existingMeta.authorId !== opts.authorId) {
      return { ok: false, message: 'Not authorised to edit this level' };
    }
  } else {
    levelId = randomUUID();
  }

  const meta: LevelMetadata = {
    id: levelId,
    authorId: opts.authorId,
    authorUsername: opts.authorUsername,
    title,
    description,
    createdAt: existingMeta?.createdAt ?? now,
    updatedAt: now,
    publishedAt: existingMeta?.publishedAt ?? null,
    plays: existingMeta?.plays ?? 0,
    rating: existingMeta?.rating ?? 0,
    ratingCount: existingMeta?.ratingCount ?? 0,
  };

  // Persist meta hash and grid JSON
  await redis.hSet(redisKeys.levelMeta(levelId), metaToHash(meta));
  await redis.set(redisKeys.levelData(levelId), JSON.stringify(opts.grid));

  // Track the level in the author's level set (score = createdAt for ordering)
  await redis.zAdd(redisKeys.userLevels(opts.authorId), {
    member: levelId,
    score: meta.createdAt,
  });

  return { ok: true, levelId };
};

// ─── Publish a draft ──────────────────────────────────────────────────────────

export type PublishLevelResult =
  | { ok: true; levelId: string }
  | { ok: false; message: string };

export const publishLevel = async (
  authorId: string,
  levelId: string
): Promise<PublishLevelResult> => {
  const raw = await redis.hGetAll(redisKeys.levelMeta(levelId));
  if (!raw['id']) {
    return { ok: false, message: 'Level not found' };
  }
  const meta = parseMeta(raw);
  if (meta.authorId !== authorId) {
    return { ok: false, message: 'Not authorised to publish this level' };
  }

  const now = Date.now();
  await redis.hSet(redisKeys.levelMeta(levelId), {
    publishedAt: String(now),
    updatedAt: String(now),
  });

  // Score = publishedAt so newest-published appears first by default
  await redis.zAdd(redisKeys.publishedLevels(), {
    member: levelId,
    score: now,
  });

  return { ok: true, levelId };
};

// ─── List published levels (paginated) ───────────────────────────────────────

const PAGE_SIZE = 20;

export const listPublishedLevels = async (
  cursor: string | null
): Promise<{ levels: LevelListEntry[]; nextCursor: string | null }> => {
  const key = redisKeys.publishedLevels();
  const total = await redis.zCard(key);

  // cursor is a stringified start offset (rank from the top)
  const startRank = cursor ? parseInt(cursor, 10) : 0;
  if (startRank >= total) {
    return { levels: [], nextCursor: null };
  }

  const endRank = Math.min(startRank + PAGE_SIZE - 1, total - 1);

  const results = await redis.zRange(key, startRank, endRank, {
    by: 'rank',
    reverse: true,
  });

  const levels: LevelListEntry[] = [];
  for (const entry of results) {
    const raw = await redis.hGetAll(redisKeys.levelMeta(entry.member));
    if (raw['id']) {
      levels.push(parseMeta(raw));
    }
  }

  const nextOffset = startRank + PAGE_SIZE;
  const nextCursor = nextOffset < total ? String(nextOffset) : null;

  return { levels, nextCursor };
};

// ─── Get a single level ───────────────────────────────────────────────────────

export const getLevelById = async (levelId: string): Promise<Level | null> => {
  const [raw, gridJson] = await Promise.all([
    redis.hGetAll(redisKeys.levelMeta(levelId)),
    redis.get(redisKeys.levelData(levelId)),
  ]);

  if (!raw['id'] || !gridJson) {
    return null;
  }

  let grid: LevelCell[] = [];
  try {
    grid = JSON.parse(gridJson) as LevelCell[];
  } catch {
    // gridJson is malformed — return empty grid
  }

  return { meta: parseMeta(raw), grid };
};

// ─── Increment play count ─────────────────────────────────────────────────────

export const incrementLevelPlays = async (levelId: string): Promise<void> => {
  const raw = await redis.hGetAll(redisKeys.levelMeta(levelId));
  if (!raw['id']) return;
  const plays = Number(raw['plays'] ?? 0) + 1;
  await redis.hSet(redisKeys.levelMeta(levelId), { plays: String(plays) });
};

// ─── Rate a level ─────────────────────────────────────────────────────────────

export type RateLevelResult =
  | { ok: true; newAverage: number; ratingCount: number }
  | { ok: false; message: string };

export const rateLevel = async (
  userId: string,
  levelId: string,
  rating: number
): Promise<RateLevelResult> => {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, message: 'Rating must be an integer between 1 and 5' };
  }

  const raw = await redis.hGetAll(redisKeys.levelMeta(levelId));
  if (!raw['id']) {
    return { ok: false, message: 'Level not found' };
  }

  // Record this user's rating (overwrite if they rated before)
  await redis.hSet(redisKeys.levelRatings(levelId), {
    [userId]: String(rating),
  });

  // Recalculate average from the full ratings hash
  const ratingsHash = await redis.hGetAll(redisKeys.levelRatings(levelId));
  const values = Object.values(ratingsHash).map(Number);
  const ratingCount = values.length;
  const newAverage =
    ratingCount > 0
      ? Math.round((values.reduce((a, b) => a + b, 0) / ratingCount) * 10) / 10
      : 0;

  await redis.hSet(redisKeys.levelMeta(levelId), {
    rating: String(newAverage),
    ratingCount: String(ratingCount),
  });

  return { ok: true, newAverage, ratingCount };
};
