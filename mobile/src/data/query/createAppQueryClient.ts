import {QueryClient} from '@tanstack/react-query';

import {isHttpError} from '../http';

const MAX_QUERY_RETRIES = 2;

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) =>
          failureCount < MAX_QUERY_RETRIES &&
          isHttpError(error) &&
          error.retryable,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
