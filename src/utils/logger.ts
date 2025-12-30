// TODO(post-v1): Add production error reporting (Sentry or Supabase Edge Function).
const isDev =
  typeof __DEV__ !== 'undefined'
    ? __DEV__
    : process.env.NODE_ENV !== 'production';

type LogDetails = unknown;

export const logger = {
  info(message: string, details?: LogDetails) {
    if (!isDev) return;

    if (details === undefined) console.log(message);
    else console.log(message, details);
  },

  warn(message: string, details?: LogDetails) {
    if (!isDev) return;

    if (details === undefined) console.warn(message);
    else console.warn(message, details);
  },

  error(message: string, error?: unknown) {
    if (!isDev) return;

    if (error === undefined) console.error(message);
    else console.error(message, error);
  },
};
