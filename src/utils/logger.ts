const isDev =
  typeof __DEV__ !== 'undefined'
    ? __DEV__
    : process.env.NODE_ENV !== 'production';

const normalizeError = (error: unknown) => {
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  return { message: 'Unknown error' };
};

const reportError = (message: string, error?: unknown) => {
  const _sanitized = {
    message,
    error: error ? normalizeError(error) : undefined,
  };
  // TODO: forward to analytics/observability tool.
  void _sanitized;
};

type LogDetails = unknown;

export const logger = {
  info(message: string, details?: LogDetails) {
    if (!isDev) {
      return;
    }

    if (details === undefined) {
      console.log(message);
      return;
    }

    console.log(message, details);
  },
  warn(message: string, details?: LogDetails) {
    if (!isDev) {
      return;
    }

    if (details === undefined) {
      console.warn(message);
      return;
    }

    console.warn(message, details);
  },
  error(message: string, error?: unknown) {
    if (!isDev) {
      reportError(message, error);
      return;
    }

    if (error === undefined) {
      console.error(message);
      return;
    }

    console.error(message, error);
  },
};
