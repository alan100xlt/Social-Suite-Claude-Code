/**
 * Shared fetch utilities for edge functions.
 * Used by: inbox-sync, inbox-historical-sync
 */

const DEFAULT_FETCH_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 1000;

/**
 * Fetch with automatic retry on transient failures (429, 5xx, network errors).
 * Respects a deadline guard to bail early when the edge function is running low on time.
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  pastDeadline: () => boolean,
  retries = DEFAULT_MAX_RETRIES,
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (pastDeadline()) throw new Error('Deadline exceeded before fetch');
    try {
      const resp = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(DEFAULT_FETCH_TIMEOUT_MS),
      });
      // Retry on 429/5xx, but not on 4xx client errors
      if (resp.status === 429 || resp.status >= 500) {
        if (attempt < retries && !pastDeadline()) {
          const delay = DEFAULT_RETRY_DELAY_MS * Math.pow(2, attempt);
          console.warn(`[fetch-utils] Retrying ${url} after ${resp.status} (attempt ${attempt + 1}/${retries}, waiting ${delay}ms)`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
      }
      return resp;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries && !pastDeadline()) {
        const delay = DEFAULT_RETRY_DELAY_MS * Math.pow(2, attempt);
        console.warn(`[fetch-utils] Retrying ${url} after error: ${lastError.message} (attempt ${attempt + 1}/${retries}, waiting ${delay}ms)`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
    }
  }
  throw lastError || new Error(`fetchWithRetry failed for ${url}`);
}
