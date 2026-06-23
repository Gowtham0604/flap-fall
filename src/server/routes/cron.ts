import { Hono } from 'hono';
import { createPost } from '../core/post';

type CronResponse = {
  status: 'ok' | 'error';
  message?: string;
};

export const cron = new Hono();

cron.post('/daily-challenge', async (c) => {
  try {
    await createPost({ daily: true });
    return c.json<CronResponse>({ status: 'ok' });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to create daily challenge';
    console.error('Daily challenge cron failed:', error);
    return c.json<CronResponse>({ status: 'error', message }, 500);
  }
});
