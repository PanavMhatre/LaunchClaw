const store = new Map<string, number>();

/**
 * Simple in-memory rate limiter. Returns true if the request is allowed.
 * Tracks the last request timestamp per key and rejects if within windowMs.
 */
export function rateLimit(key: string, windowMs: number): boolean {
  const now = Date.now();
  const last = store.get(key);

  if (last && now - last < windowMs) {
    return false;
  }

  store.set(key, now);
  return true;
}
