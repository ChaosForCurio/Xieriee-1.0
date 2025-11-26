import { RateLimitStatus } from './types';

class RateLimitTracker {
    private limits: Map<string, RateLimitStatus> = new Map();

    update(modelId: string, limit: number, remaining: number, reset: number) {
        this.limits.set(modelId, { limit, remaining, reset });
    }

    canMakeRequest(modelId: string, threshold: number = 0): boolean {
        const status = this.limits.get(modelId);
        if (!status) return true; // Assume yes if no data yet

        // Check if reset time has passed
        if (Date.now() > status.reset * 1000) {
            return true;
        }

        return status.remaining > threshold;
    }

    getRemaining(modelId: string): number {
        const status = this.limits.get(modelId);
        if (!status) return 999; // Default high if unknown
        if (Date.now() > status.reset * 1000) return status.limit;
        return status.remaining;
    }
}

export const rateLimiter = new RateLimitTracker();
