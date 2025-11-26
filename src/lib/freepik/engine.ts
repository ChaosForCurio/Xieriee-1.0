import { ALL_MODELS, IMAGE_MODELS, VIDEO_MODELS } from './config';
import { ModelConfig, GenerationOptions, ModelType } from './types';
import { cache } from './cache';
import { rateLimiter } from './rate-limiter';
import { jobQueue } from './queue';

export class FreepikEngine {
    private apiKey: string;
    private bytezApiKey: string;

    constructor() {
        this.apiKey = process.env.FREEPIK_API_KEY || '';
        this.bytezApiKey = process.env.BYTEZ_API_KEY || '';
        if (!this.apiKey) {
            console.error('FREEPIK_API_KEY is missing!');
        }
        if (!this.bytezApiKey) {
            console.warn('BYTEZ_API_KEY is missing! Fallback will not work.');
        }
    }

    async generateImage(options: GenerationOptions) {
        try {
            return await this.handleGeneration('image', options);
        } catch (error: any) {
            console.error('Freepik image generation failed:', error.message);
            if (this.bytezApiKey) {
                console.log('Attempting fallback to Bytez (Google Imagen 4)...');
                return await this.generateWithBytez(options.prompt);
            }
            throw error;
        }
    }

    async generateVideo(options: GenerationOptions) {
        // 1. Generate Image First (Step 1)
        console.log('[FreepikEngine] Step 1: Generating base image for video...');
        const imageResult = await this.generateImage({
            prompt: options.prompt,
            aspectRatio: '16:9', // Default for video
        });

        // Extract image URL correctly (handle both string and object formats)
        let imageUrl = '';
        if (imageResult.data?.generated?.length > 0) {
            const item = imageResult.data.generated[0];
            imageUrl = typeof item === 'string' ? item : item.url;
        }

        if (!imageUrl) {
            console.error('[FreepikEngine] Image generation response:', JSON.stringify(imageResult, null, 2));
            throw new Error('Failed to generate base image for video');
        }
        console.log('[FreepikEngine] Base image generated:', imageUrl);

        // 2. Generate Video from Image (Step 2)
        console.log('[FreepikEngine] Step 2: Generating video from image...');
        return this.handleGeneration('video', {
            ...options,
            image: imageUrl, // Pass generated image as input
        });
    }

    private async generateWithBytez(prompt: string) {
        const modelId = 'google/imagen-4.0-fast-generate-001';
        const endpoint = `https://api.bytez.com/model/${modelId}`;

        console.log(`[FreepikEngine] Calling Bytez API: ${endpoint}`);

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.bytezApiKey}`
                },
                body: JSON.stringify({ text: prompt })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Bytez API Error ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            console.log('[FreepikEngine] Bytez Response:', JSON.stringify(data));

            // Map Bytez response to Freepik format for compatibility
            let imageUrl = '';
            if (data.output && typeof data.output === 'string') {
                imageUrl = data.output;
            } else if (data.output && Array.isArray(data.output)) {
                imageUrl = data.output[0];
            } else if (data.generated_images && data.generated_images.length > 0) {
                imageUrl = data.generated_images[0];
            }

            if (!imageUrl) {
                // If we can't find a URL, just return the raw data and let the caller handle or fail
                console.warn('Could not extract image URL from Bytez response, returning raw data');
                return { data: { generated: [data] } };
            }

            return {
                data: {
                    generated: [{ url: imageUrl }]
                }
            };

        } catch (error: any) {
            console.error('Bytez generation failed:', error.message);
            throw new Error(`Bytez fallback failed: ${error.message}`);
        }
    }

    private async handleGeneration(type: ModelType, options: GenerationOptions) {
        // 1. Check Cache
        const cacheKey = cache.generateKey(type, options as any);
        const cached = cache.get(cacheKey);
        if (cached) {
            console.log(`[FreepikEngine] Returning cached ${type}`);
            return cached;
        }

        // 2. Select Models (Rotation + Fallback Chain)
        const models = this.getPrioritizedModels(type);
        let lastError = null;

        for (const model of models) {
            // 3. Check Rate Limits & Quota
            if (!rateLimiter.canMakeRequest(model.apiId, type === 'image' ? 5 : 2)) {
                console.warn(`[FreepikEngine] Skipping ${model.name} (Rate Limit/Quota)`);
                continue;
            }

            console.log(`[FreepikEngine] Attempting ${type} with ${model.name} (${model.apiId})`);

            try {
                // 4. Execute API Call
                const result = await this.callApi(model, options);

                // 5. Cache Result
                cache.set(cacheKey, result, type === 'image' ? 24 * 3600 : 48 * 3600);

                return result;
            } catch (error: any) {
                console.error(`[FreepikEngine] Error with ${model.name}:`, error.message);
                lastError = error;
                // Continue to next model
            }
        }

        throw lastError || new Error(`All ${type} models failed or are exhausted.`);
    }

    private getPrioritizedModels(type: ModelType): ModelConfig[] {
        const allModels = type === 'image' ? IMAGE_MODELS : VIDEO_MODELS;
        const now = new Date();
        const currentHour = now.getHours();

        // Sort by:
        // 1. Time slot match (for images)
        // 2. Priority (lower is better)
        // 3. Quota remaining (simulated via rate limiter for now)

        return allModels.sort((a, b) => {
            // Time slot check (only for images usually)
            const aMatch = a.timeSlot ? (currentHour >= a.timeSlot.start && currentHour < a.timeSlot.end) : false;
            const bMatch = b.timeSlot ? (currentHour >= b.timeSlot.start && currentHour < b.timeSlot.end) : false;

            if (aMatch && !bMatch) return -1;
            if (!aMatch && bMatch) return 1;

            // Priority check
            const aPriority = a.priority ?? 99;
            const bPriority = b.priority ?? 99;
            return aPriority - bPriority;
        });
    }

    private async callApi(model: ModelConfig, options: GenerationOptions) {
        let endpoint = '';
        let body: any = { prompt: options.prompt };

        if (model.type === 'image') {
            endpoint = 'https://api.freepik.com/v1/ai/mystic';
            if (options.aspectRatio) {
                // Map common aspect ratios to Mystic's required format
                const ratioMap: Record<string, string> = {
                    '1:1': 'square_1_1',
                    '4:3': 'classic_4_3',
                    '3:4': 'traditional_3_4',
                    '16:9': 'widescreen_16_9',
                    '9:16': 'social_story_9_16',
                    '3:2': 'standard_3_2',
                    '2:3': 'portrait_2_3',
                    '5:4': 'social_5_4',
                    '4:5': 'social_post_4_5'
                };
                body.aspect_ratio = ratioMap[options.aspectRatio] || 'square_1_1';
            }
        } else {
            // Video Generation (Image-to-Video)
            // Use specific endpoint for the model, e.g., kling-v2
            endpoint = `https://api.freepik.com/v1/ai/image-to-video/${model.apiId}`;

            if (!options.image) {
                throw new Error('Image URL is required for video generation');
            }
            body.image = options.image;
            // Remove prompt from body if not supported by image-to-video, 
            // but usually it's used for guidance. Keep it for now.
        }

        console.log(`[FreepikEngine] Calling API: ${endpoint}`);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-freepik-api-key': this.apiKey,
                'Accept': 'application/json',
            },
            body: JSON.stringify(body),
        });

        // Parse Rate Limits
        const limit = parseInt(response.headers.get('x-ratelimit-limit') || '0');
        const remaining = parseInt(response.headers.get('x-ratelimit-remaining') || '0');
        const reset = parseInt(response.headers.get('x-ratelimit-reset') || '0');

        rateLimiter.update(model.apiId, limit, remaining, reset);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[FreepikEngine] API Error ${response.status}: ${errorText}`);
            let errorMessage = `API Error ${response.status}: ${errorText}`;

            try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.message) {
                    errorMessage = errorJson.message;
                }
                if (errorMessage.includes('limit of the free trial usage')) {
                    errorMessage = 'Daily free trial limit reached. Please upgrade your plan or try again tomorrow.';
                }
            } catch (e) {
                // Failed to parse JSON, use raw text
            }

            throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log(`[FreepikEngine] Initial Response:`, JSON.stringify(data));

        if (data.data?.task_id) {
            return this.pollTask(data.data.task_id, model.type, model.apiId);
        }

        return data;
    }

    private async pollTask(taskId: string, type: ModelType, modelId?: string) {
        // Increase timeout to ~5 minutes (150 attempts * 2s) to handle slow video generation
        const maxAttempts = 150;
        let endpointUrl = '';

        if (type === 'image') {
            endpointUrl = `https://api.freepik.com/v1/ai/mystic/${taskId}`;
        } else {
            // Video polling: https://api.freepik.com/v1/ai/image-to-video/tasks/{taskId}
            endpointUrl = `https://api.freepik.com/v1/ai/image-to-video/tasks/${taskId}`;
        }

        console.log(`[FreepikEngine] Polling Task: ${taskId} at ${endpointUrl}`);

        for (let i = 0; i < maxAttempts; i++) {
            await new Promise(r => setTimeout(r, 2000));
            const res = await fetch(endpointUrl, {
                headers: { 'x-freepik-api-key': this.apiKey }
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.error(`[FreepikEngine] Polling Error ${res.status}: ${errorText}`);

                // If 404, it might be too early, wait and retry a few times before failing?
                // But usually 404 means wrong endpoint. 
                // However, for now let's throw to be safe, or maybe continue if it's just propagation delay (unlikely for this API).
                throw new Error(`Polling failed with status ${res.status}: ${errorText}`);
            }

            const data = await res.json();
            console.log(`[FreepikEngine] Poll Status: ${data.data?.status}`);

            if (data.data?.status === 'COMPLETED') return data;
            if (data.data?.status === 'FAILED') throw new Error('Generation Failed');
        }
        throw new Error('Polling timed out');
    }
}

export const freepikEngine = new FreepikEngine();
