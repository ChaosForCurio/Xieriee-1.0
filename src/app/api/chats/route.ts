import { NextResponse } from 'next/server';
import { db } from '@/db';
import { chats, messages } from '@/db/schema';
import { desc, eq, and } from 'drizzle-orm';
import { stackServerApp } from '@/stack';

export async function GET() {
    try {
        const user = await stackServerApp.getUser();
        const userId = user?.id;

        let query = db.select().from(chats);

        if (userId) {
            // If logged in, get user's chats
            // @ts-ignore - userId is added to schema but typescript might not pick it up yet
            query = query.where(eq(chats.userId, userId));
        } else {
            // If not logged in, maybe return empty or guest chats? 
            // For now, let's return empty to encourage login, or we could handle guest mode via local storage only
            // But since we are moving to DB, let's just return empty for now if no user
            return NextResponse.json({ success: true, chats: [] });
        }

        const allChats = await query.orderBy(desc(chats.createdAt));
        return NextResponse.json({ success: true, chats: allChats });
    } catch (error) {
        console.error('Error fetching chats:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch chats' }, { status: 500 });
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
            const messagesToInsert = chatMessages.map((msg: any) => ({
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
