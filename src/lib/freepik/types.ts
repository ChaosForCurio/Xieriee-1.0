export type ModelType = 'image' | 'video';

export interface ModelConfig {
    id: string;
    apiId: string; // The ID used in the API call (e.g., 'flux-dev', 'kling-std')
    name: string;
    type: ModelType;
    dailyQuota: number;
    priority?: number; // Lower number = higher priority
    timeSlot?: {
        start: number; // Hour (0-23)
        end: number;   // Hour (0-23)
    };
}

export interface GenerationOptions {
    prompt: string;
    negativePrompt?: string;
    aspectRatio?: string;
    seed?: number;
    image?: string; // Base64 for img2img
    numInferenceSteps?: number;
    guidanceScale?: number;
    urgent?: boolean; // If true, bypass queue (if possible) or prioritize
}

export interface JobStatus {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    result?: any;
    error?: string;
    createdAt: number;
}

export interface CacheEntry<T> {
    value: T;
    expiresAt: number;
}

export interface RateLimitStatus {
    limit: number;
    remaining: number;
    reset: number; // Timestamp
}
