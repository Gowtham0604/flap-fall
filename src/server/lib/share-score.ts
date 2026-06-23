import { reddit, redis } from '@devvit/web/server';
import { getDayNumber } from '../../shared/date';
import { redisKeys } from './redis-keys';

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

const isCommentId = (id: string): id is `t1_${string}` => id.startsWith('t1_');

export const shareScoreToThread = async (
  postId: string,
  shareText: string
): Promise<boolean> => {
  const stickyCommentId = await redis.get(redisKeys.postScoreThread(postId));
  if (!stickyCommentId || !isCommentId(stickyCommentId)) {
    return false;
  }

  await reddit.submitComment({
    id: stickyCommentId,
    text: shareText,
    runAs: 'USER',
  });
  return true;
};

export const getDayNumberForShare = (): number => getDayNumber();
