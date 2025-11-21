import { db } from '@/db';
import { memories } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export interface Memory {
    id: number;
    userId: string;
    key: string;
    value: string;
    reason?: string | null;
    createdAt: Date;
}

export async function getMemories(userId: string): Promise<Memory[]> {
    try {
        const userMemories = await db.select().from(memories).where(eq(memories.userId, userId));
        return userMemories;
    } catch (error) {
        console.error('Error fetching memories:', error);
        return [];
    }
}

export async function saveMemory(userId: string, key: string, value: string, reason?: string) {
    try {
        // Check if memory with same key exists
        const existing = await db.select().from(memories).where(
            and(eq(memories.userId, userId), eq(memories.key, key))
        );

        if (existing.length > 0) {
            // Update existing memory
            await db.update(memories)
                .set({ value, reason, createdAt: new Date() })
                .where(eq(memories.id, existing[0].id));
            console.log(`Updated memory: ${key} = ${value}`);
        } else {
            // Insert new memory
            await db.insert(memories).values({
                userId,
                key,
                value,
                reason,
            });
            console.log(`Saved new memory: ${key} = ${value}`);
        }
    } catch (error) {
        console.error('Error saving memory:', error);
    }
}

export async function forgetMemory(userId: string, key: string) {
    try {
        await db.delete(memories).where(
            and(eq(memories.userId, userId), eq(memories.key, key))
        );
        console.log(`Forgot memory: ${key}`);
    } catch (error) {
        console.error('Error forgetting memory:', error);
    }
}

export function formatMemoriesForContext(memories: Memory[]): string {
    if (memories.length === 0) return "";

    const formatted = memories.map(m => `- ${m.key}: ${m.value}`).join('\n');
    return `\n[LONG-TERM MEMORY & CONTEXT]\n${formatted}\n`;
}
