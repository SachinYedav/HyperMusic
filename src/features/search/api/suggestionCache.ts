export type SuggestionCacheMetrics = {
  hits: number;
  misses: number;
  writes: number;
  evictions: number;
};

export class SuggestionLruCache {
  private entries = new Map<string, string[]>();

  readonly metrics: SuggestionCacheMetrics = {
    hits: 0,
    misses: 0,
    writes: 0,
    evictions: 0,
  };

  constructor(private readonly maxSize: number) {}

  get(key: string) {
    const value = this.entries.get(key);
    if (!value) {
      this.metrics.misses += 1;
      return null;
    }

    this.entries.delete(key);
    this.entries.set(key, value);
    this.metrics.hits += 1;
    return value;
  }

  set(key: string, value: string[]) {
    if (this.entries.has(key)) {
      this.entries.delete(key);
    }

    this.entries.set(key, value);
    this.metrics.writes += 1;

    while (this.entries.size > this.maxSize) {
      const oldestKey = this.entries.keys().next().value;
      if (!oldestKey) return;
      this.entries.delete(oldestKey);
      this.metrics.evictions += 1;
    }
  }

  get size() {
    return this.entries.size;
  }
}
