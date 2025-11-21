import { NextResponse } from 'next/server';
import { db } from '@/db';
import { chats, messages } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { stackServerApp } from '@/stack';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await stackServerApp.getUser();
        const userId = user?.id;

        if (!userId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Verify ownership

        const chat = await db.select().from(chats).where(and(eq(chats.id, id), eq(chats.userId, userId))).limit(1);

        if (chat.length === 0) {
            return NextResponse.json({ success: false, error: 'Chat not found or unauthorized' }, { status: 404 });
        }

        await db.delete(chats).where(eq(chats.id, id));
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting chat:', error);
        return NextResponse.json({ success: false, error: 'Failed to delete chat' }, { status: 500 });
    }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await stackServerApp.getUser();
        const userId = user?.id;

        if (!userId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Verify ownership first

        const chat = await db.select().from(chats).where(and(eq(chats.id, id), eq(chats.userId, userId))).limit(1);

        if (chat.length === 0) {
            return NextResponse.json({ success: false, error: 'Chat not found or unauthorized' }, { status: 404 });
        }

        const chatMessages = await db.select().from(messages).where(eq(messages.chatId, id)).orderBy(asc(messages.createdAt));
        return NextResponse.json({ success: true, messages: chatMessages });
    } catch (error) {
        console.error('Error fetching chat messages:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch messages' }, { status: 500 });
    }
}
