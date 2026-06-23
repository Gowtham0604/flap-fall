import { context } from '@devvit/web/server';

export const requirePostId = (): string => {
  const { postId } = context;
  if (!postId) {
    throw new Error('postId is required but missing from context');
  }
  return postId;
};

export const requireUserId = (): string => {
  const { userId } = context;
  if (!userId) {
    throw new Error('User must be logged in');
  }
  return userId;
};

export const requireSubredditName = (): string => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('subredditName is required');
  }
  return subredditName;
};
