import { JobStatus } from './types';

type JobProcessor = (data: any) => Promise<any>;

class MemoryQueue {
    private jobs: Map<string, JobStatus> = new Map();
    private processor: JobProcessor | null = null;
    private isProcessing = false;
    private queue: { id: string; data: any }[] = [];

    setProcessor(processor: JobProcessor) {
        this.processor = processor;
    }

    async addJob(data: any, urgent: boolean = false): Promise<string> {
        const id = crypto.randomUUID();
        this.jobs.set(id, {
            id,
            status: 'pending',
            createdAt: Date.now(),
        });

        if (urgent) {
            // Urgent jobs bypass the queue and run immediately (if possible)
            // or are unshifted to the front
            this.processJob(id, data);
        } else {
            this.queue.push({ id, data });
            this.processNext();
        }

        return id;
    }

    getJob(id: string): JobStatus | undefined {
        return this.jobs.get(id);
    }

    private async processNext() {
        if (this.isProcessing || this.queue.length === 0) return;

        this.isProcessing = true;
        const item = this.queue.shift();
        if (item) {
            await this.processJob(item.id, item.data);
        }
        this.isProcessing = false;

        // Continue processing if more items
        if (this.queue.length > 0) {
            this.processNext();
        }
    }

    private async processJob(id: string, data: any) {
        const job = this.jobs.get(id);
        if (!job) return;

        job.status = 'processing';
        this.jobs.set(id, job);

        try {
            if (this.processor) {
                const result = await this.processor(data);
                job.status = 'completed';
                job.result = result;
            }
        } catch (error: any) {
            job.status = 'failed';
            job.error = error.message;
        } finally {
            this.jobs.set(id, job);
        }
    }
}

export const jobQueue = new MemoryQueue();
