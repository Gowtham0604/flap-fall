import { reddit, redis } from '@devvit/web/server';
import { getDayNumber } from '../../shared/date';
import { redisKeys } from './redis-keys';

export const SCORE_THREAD_COMMENT_TEXT =
  '📊 **Share your score below!**\n\nReply to this comment with your result.';

const isCommentId = (id: string): id is `t1_${string}` => id.startsWith('t1_');

const isPostId = (id: string): id is `t3_${string}` => id.startsWith('t3_');

/** Create (or return existing) distinguished, stickied score thread on a game post. */
export const ensureScoreThreadForPost = async (
  postId: string
): Promise<`t1_${string}` | null> => {
  if (!isPostId(postId)) return null;

  const existing = await redis.get(redisKeys.postScoreThread(postId));
  if (existing && isCommentId(existing)) return existing;

  const scoreComment = await reddit.submitComment({
    id: postId,
    text: SCORE_THREAD_COMMENT_TEXT,
  });
  await scoreComment.distinguish(true);
  await redis.set(redisKeys.postScoreThread(postId), scoreComment.id);
  return scoreComment.id;
};

export const buildShareText = (
  score: number,
  personalBest: number,
  dayNumber: number
): string => {
  const stars = Math.min(5, Math.ceil(score / 5));
  const filled = '⭐'.repeat(stars);
  const empty = '☆'.repeat(5 - stars);
  const bestLine =
    score >= personalBest ? '🏆 New personal best!' : `Best: ${personalBest}`;
  return [
    `🐦 Flap Fall — Daily Challenge #${dayNumber}`,
    `${filled}${empty} ${score} pipes`,
    bestLine,
    '',
    'Can you beat me? ▶️',
  ].join('\n');
};

export const shareScoreToThread = async (
  postId: string,
  shareText: string
): Promise<boolean> => {
  const stickyCommentId = await ensureScoreThreadForPost(postId);
  if (!stickyCommentId) return false;

  await reddit.submitComment({
    id: stickyCommentId,
    text: shareText,
    runAs: 'USER',
  });
  return true;
};

export const getDayNumberForShare = (): number => getDayNumber();
