import { reddit, redis } from '@devvit/web/server';
import type { JsonObject } from '@devvit/web/shared';
import { getDateString, getDayNumber } from '../../shared/date';
import { requireSubredditName } from '../lib/context-guards';
import { redisKeys } from '../lib/redis-keys';
import { ensureScoreThreadForPost } from '../lib/share-score';

export type CreatePostOptions = {
  daily?: boolean;
};

export const createPost = async (options?: CreatePostOptions) => {
  const subredditName = requireSubredditName();
  const today = getDateString(new Date());
  const dayNumber = getDayNumber();

  if (options?.daily) {
    const postData: JsonObject = {
      type: 'daily-challenge',
      dayNumber,
      date: today,
    };

    const post = await reddit.submitCustomPost({
      subredditName,
      title: `Daily Flap Challenge #${dayNumber} 🐦`,
      entry: 'default',
      postData,
    });

    await redis.set(redisKeys.dailyPostId(), post.id);
    await redis.set(redisKeys.dailyLatest(), post.id);

    await ensureScoreThreadForPost(post.id);

    return post;
  }

  const post = await reddit.submitCustomPost({
    subredditName,
    title: 'Can you beat my flap score? 🐦',
    entry: 'default',
  });

  await ensureScoreThreadForPost(post.id);

  return post;
};
