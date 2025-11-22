import { NextResponse } from 'next/server';
import { db } from '@/db';
import { chats, messages } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { stackServerApp } from '@/stack';

export async function GET() {
    try {
        const user = await stackServerApp.getUser();
        const userId = user?.id;

        if (!userId) {
            // If not logged in, return empty chats (localStorage will handle guest chats)
            return NextResponse.json({ success: true, chats: [] });
        }

        const allChats = await db.select()
            .from(chats)
            .where(eq(chats.userId, userId))
            .orderBy(desc(chats.createdAt));

        return NextResponse.json({ success: true, chats: allChats });
    } catch (error) {
        console.error('Error fetching chats:', error);
        // Fallback to empty list to avoid breaking UI
        return NextResponse.json({ success: true, chats: [] }, { status: 200 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await stackServerApp.getUser();
        const userId = user?.id;

        if (!userId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { id, title, messages: chatMessages } = body;

        // Create or update chat
        await db.insert(chats).values({
            id,
            userId,
            title,
        }).onConflictDoUpdate({
            target: chats.id,
            set: { title, updatedAt: new Date() },
        });

        // Delete existing messages for this chat to replace them (simple sync)
        await db.delete(messages).where(eq(messages.chatId, id));

        // Insert messages
        if (chatMessages && chatMessages.length > 0) {
            const messagesToInsert = chatMessages.map((msg: { role: 'user' | 'assistant'; content: string; timestamp?: number }) => ({
                chatId: id,
                role: msg.role,
                content: msg.content,
                createdAt: new Date(msg.timestamp || Date.now()),
            }));
            await db.insert(messages).values(messagesToInsert);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error saving chat:', error);
        return NextResponse.json({ success: false, error: 'Failed to save chat' }, { status: 500 });
    }
}
