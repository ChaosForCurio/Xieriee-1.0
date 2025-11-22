import { db } from '@/db';
import { messages, chats, summaries, rateLimits, communityFeed } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

// --- Message Actions ---

export async function saveMessage(userId: string, chatId: string, role: 'user' | 'ai', content: string) {
    try {
        await db.insert(messages).values({
            chatId,
            role,
            content,
        });
    } catch (error) {
        console.error('Error saving message:', error);
        throw error;
    }
}

export async function getChatHistory(userId: string, chatId: string, limit: number = 50) {
    try {
        const history = await db.select()
            .from(messages)
            .where(eq(messages.chatId, chatId))
            .orderBy(desc(messages.createdAt))
            .limit(limit);

        return history.reverse(); // Return in chronological order
    } catch (error) {
        console.error('Error fetching chat history:', error);
        return [];
    }
}

// --- Summary Actions ---

export async function saveSummary(chatId: string, content: string) {
    try {
        await db.insert(summaries).values({
            chatId,
            content,
        });
    } catch (error) {
        console.error('Error saving summary:', error);
        throw error;
    }
}

export async function getSummary(chatId: string) {
    try {
        const summary = await db.select()
            .from(summaries)
            .where(eq(summaries.chatId, chatId))
            .orderBy(desc(summaries.createdAt))
            .limit(1);

        return summary[0]?.content || null;
    } catch (error) {
        console.error('Error fetching summary:', error);
        return null;
    }
}

// --- Rate Limiting ---

export async function isRateLimited(userId: string): Promise<boolean> {
    const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
    const MAX_REQUESTS = 20; // 20 requests per minute

    try {
        const now = new Date();
        const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW);

        // Check existing limit record
        const limitRecord = await db.select()
            .from(rateLimits)
            .where(eq(rateLimits.userId, userId))
            .limit(1);

        if (limitRecord.length === 0) {
            // Create new record
            await db.insert(rateLimits).values({
                userId,
                count: 1,
                lastMessageAt: now,
            });
            return false;
        }

        const record = limitRecord[0];

        if (record.lastMessageAt < windowStart) {
            // Reset window
            await db.update(rateLimits)
                .set({ count: 1, lastMessageAt: now })
                .where(eq(rateLimits.id, record.id));
            return false;
        } else {
            // Increment count
            if (record.count >= MAX_REQUESTS) {
                return true;
            }

            await db.update(rateLimits)
                .set({ count: record.count + 1, lastMessageAt: now })
                .where(eq(rateLimits.id, record.id));
            return false;
        }
    } catch (error) {
        console.error('Error checking rate limit:', error);
        return false;
    }
}

export async function ensureChat(chatId: string, userId: string, title: string = 'New Chat') {
    try {
        await db.insert(chats).values({
            id: chatId,
            userId,
            title,
        }).onConflictDoNothing();
    } catch (error) {
        console.error('Error ensuring chat exists:', error);
        throw error;
    }
}

// --- Community Feed Actions ---

export async function addToCommunityFeed(item: { userId: string; userAvatar?: string; userName?: string; imageUrl: string; prompt?: string }) {
    try {
        await db.insert(communityFeed).values({
            userId: item.userId,
            userAvatar: item.userAvatar,
            userName: item.userName,
            imageUrl: item.imageUrl,
            prompt: item.prompt,
        });
    } catch (error) {
        console.error('Error adding to community feed:', error);
        throw error;
    }
}

export async function getCommunityFeed(limit: number = 50) {
    try {
        const feed = await db.select()
            .from(communityFeed)
            .orderBy(desc(communityFeed.createdAt))
            .limit(limit);
        return feed;
    } catch (error) {
        console.error('Error fetching community feed:', error);
        return [];
    }
}
