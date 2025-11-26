import { ModelConfig } from './types';

export const IMAGE_MODELS: ModelConfig[] = [
    {
        id: 'flux-dev',
        apiId: 'flux-dev', // Verify exact API ID
        name: 'Flux Dev',
        type: 'image',
        dailyQuota: 100,
        timeSlot: { start: 7, end: 12 }, // 7AM - 12PM
    },
    {
        id: 'imagen-3',
        apiId: 'imagen-3', // Verify exact API ID
        name: 'Google Imagen 3',
        type: 'image',
        dailyQuota: 100,
        timeSlot: { start: 13, end: 18 }, // 1PM - 6PM
    },
    {
        id: 'fast-gen',
        apiId: 'classic-fast', // Verify exact API ID, assuming 'classic-fast' or similar
        name: 'Fast Gen',
        type: 'image',
        dailyQuota: 100,
        timeSlot: { start: 18, end: 24 }, // 6PM - 12AM
    },
    {
        id: 'reimagine-flux',
        apiId: 'reimagine-flux', // Verify exact API ID
        name: 'Reimagine Flux',
        type: 'image',
        dailyQuota: 100,
        priority: 99, // Emergency fallback
    },
];

export const VIDEO_MODELS: ModelConfig[] = [
    {
        id: 'kling-std',
        apiId: 'kling-std',
        name: 'Kling Standard',
        type: 'video',
        dailyQuota: 20,
        priority: 1,
    },
    {
        id: 'kling-elements-std',
        apiId: 'kling-elements-std',
        name: 'Kling Elements Standard',
        type: 'video',
        dailyQuota: 20,
        priority: 2,
    },
    {
        id: 'minimax-hailuo2-768p',
        apiId: 'minimax-hailuo2-768p',
        name: 'MiniMax Hailuo2 768p',
        type: 'video',
        dailyQuota: 20,
        priority: 3,
    },
    {
        id: 'minimax-hailuo2-1080p',
        apiId: 'minimax-hailuo2-1080p',
        name: 'MiniMax Hailuo2 1080p',
        type: 'video',
        dailyQuota: 11,
        priority: 4,
    },
    {
        id: 'kling-pro',
        apiId: 'kling-pro',
        name: 'Kling Pro',
        type: 'video',
        dailyQuota: 11,
        priority: 5,
    },
    {
        id: 'kling-v2',
        apiId: 'kling-v2',
        name: 'Kling v2',
        type: 'video',
        dailyQuota: 5,
        priority: 6,
    },
];

export const ALL_MODELS = [...IMAGE_MODELS, ...VIDEO_MODELS];
