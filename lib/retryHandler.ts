/**
 * lib/retryHandler.ts
 * Rate limit handling and retry logic with exponential backoff
 */

export interface RetryConfig {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableStatuses?: number[];
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableStatuses: [429, 502, 503],
};

export class RetryError extends Error {
  constructor(message: string, public lastStatus?: number) {
    super(message);
    this.name = 'RetryError';
  }
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  config: RetryConfig = {}
): Promise<Response> {
  const { maxRetries, initialDelay, maxDelay, backoffMultiplier, retryableStatuses } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  let lastError: Error | null = null;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, init);

      if (response.ok) {
        return response;
      }

      if (attempt === maxRetries) {
        const errorBody = await response.json().catch(() => ({}));
        const message = errorBody?.error?.message || `Request failed with status ${response.status}`;
        throw new RetryError(message, response.status);
      }

      if (!retryableStatuses.includes(response.status)) {
        const errorBody = await response.json().catch(() => ({}));
        const message = errorBody?.error?.message || `Request failed with status ${response.status}`;
        throw new RetryError(message, response.status);
      }

      const errorBody = await response.json().catch(() => ({}));
      const retryAfter = response.headers.get('retry-after');
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : delay;

      console.warn(
        `[Retry] ${response.status} - ${errorBody?.error?.message || 'Rate limited'}. ` +
        `Retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries})`
      );

      await sleep(waitTime);
      delay = Math.min(delay * backoffMultiplier, maxDelay);

    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        throw lastError;
      }

      const waitTime = delay;
      console.warn(
        `[Retry] ${error.message}. ` +
        `Retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries})`
      );

      await sleep(waitTime);
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError || new RetryError('Request failed after retries');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRateLimitError(error: any): boolean {
  return error instanceof RetryError && error.lastStatus === 429;
}
