const LAUNCH_DATE = new Date('2025-01-01T00:00:00.000Z');

export const getDateString = (date: Date): string => {
  return date.toISOString().slice(0, 10);
};

export const getDayNumber = (date: Date = new Date()): number => {
  const msPerDay = 86_400_000;
  const diff = date.getTime() - LAUNCH_DATE.getTime();
  return Math.max(1, Math.floor(diff / msPerDay) + 1);
};

export const getYesterdayString = (date: Date = new Date()): string => {
  const yesterday = new Date(date);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return getDateString(yesterday);
};
