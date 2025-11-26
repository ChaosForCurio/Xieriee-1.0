import { CacheEntry } from './types';

class MemoryCache {
    private cache: Map<string, CacheEntry<any>> = new Map();

    constructor() {
        // Optional: Periodic cleanup interval
        if (typeof setInterval !== 'undefined') {
            setInterval(() => this.cleanup(), 60 * 60 * 1000); // Cleanup every hour
        }
    }

    get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return entry.value;
    }

    set<T>(key: string, value: T, ttlSeconds: number): void {
        const expiresAt = Date.now() + ttlSeconds * 1000;
        this.cache.set(key, { value, expiresAt });
    }

    private cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
            }
        }
    }

    generateKey(prefix: string, params: Record<string, any>): string {
        const sortedParams = Object.keys(params)
            .sort()
            .reduce((acc, key) => {
                acc[key] = params[key];
                return acc;
            }, {} as Record<string, any>);
        return `${prefix}:${JSON.stringify(sortedParams)}`;
    }
}

export const cache = new MemoryCache();
