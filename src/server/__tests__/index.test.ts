import { createDevvitTest } from '@devvit/test/server/vitest';
import { redis } from '@devvit/web/server';
import { reddit } from '@devvit/web/server';
import { expect, vi } from 'vitest';

import { createPost } from '../core/post';
import { app } from '../index';
import { recordScore } from '../lib/player';
import { updateStreak } from '../lib/streak';

const test = createDevvitTest();

test('POST /internal/menu/post-create returns navigateTo on success', async () => {
  const { name: subredditName } = await reddit.getCurrentSubreddit();
  vi.spyOn(reddit, 'submitCustomPost').mockResolvedValue({ id: 't3_abc' } as never);

  const res = await app.request('/internal/menu/post-create', { method: 'POST' });
  const json = await res.json();

  expect(res.status).toBe(200);
  expect(json.navigateTo).toBe(
    `https://reddit.com/r/${subredditName}/comments/t3_abc`
  );
});

test('createPost submits with subreddit and title', async () => {
  const { name: subredditName } = await reddit.getCurrentSubreddit();
  const submit = vi
    .spyOn(reddit, 'submitCustomPost')
    .mockResolvedValue({ id: 't3_test' } as never);

  await createPost();

  expect(submit).toHaveBeenCalledWith(
    expect.objectContaining({
      subredditName,
      title: 'Can you beat my flap score? 🐦',
      entry: 'default',
    })
  );
});

test('updateStreak starts at 1 for new players', async () => {
  const result = await updateStreak('t2_newplayer');
  expect(result.current).toBe(1);
  expect(result.extended).toBe(false);
});

test('recordScore updates personal best and xp', async () => {
  const result = await recordScore('t2_player1', 'player1', 12);
  expect(result.isPersonalBest).toBe(true);
  expect(result.stats.personalBest).toBe(12);
  expect(result.xpEarned).toBeGreaterThan(0);
});

test('redis leaderboard stores best score per user', async () => {
  await redis.zAdd('leaderboard:daily:test', { member: 'alice', score: 100 });
  await redis.zAdd('leaderboard:daily:test', { member: 'bob', score: 200 });
  const top = await redis.zRange('leaderboard:daily:test', 0, 0, {
    by: 'rank',
    reverse: true,
  });
  expect(top[0]?.member).toBe('bob');
});
