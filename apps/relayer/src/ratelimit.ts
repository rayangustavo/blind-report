export function createRateLimiter({ windowMs, max }: { windowMs: number; max: number }) {
  const buckets = new Map<string, number[]>();

  return {
    check(key: string) {
      const now = Date.now();
      const window = buckets.get(key) ?? [];
      const recent = window.filter((ts) => now - ts < windowMs);
      if (recent.length >= max) {
        buckets.set(key, recent);
        return false;
      }
      recent.push(now);
      buckets.set(key, recent);
      return true;
    },
    reset(key: string) {
      buckets.delete(key);
    },
  };
}
