import { NextResponse } from 'next/server';
import { saveMessage, getChatHistory, saveSummary, getSummary, isRateLimited, ensureChat } from '@/lib/db-actions';

export async function GET() {
    const userId = 'test-user-' + Date.now();
    const chatId = 'test-chat-' + Date.now();
    const results: any = {};

    try {
        // 1. Test Rate Limit
        results.isRateLimited = await isRateLimited(userId);

        // Ensure chat exists
        await ensureChat(chatId, userId, 'Test Chat');

        // 2. Test Save Message
        await saveMessage(userId, chatId, 'user', 'Hello AI');
        await saveMessage(userId, chatId, 'ai', 'Hello Human');
        results.messagesSaved = true;

        // 3. Test Get History
        const history = await getChatHistory(userId, chatId);
        results.historyLength = history.length;
        results.history = history;

        // 4. Test Save Summary
        await saveSummary(chatId, 'User greeted AI, AI responded.');
        results.summarySaved = true;

        // 5. Test Get Summary
        const summary = await getSummary(chatId);
        results.summary = summary;

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message, stack: error.stack }, { status: 500 });
    }
}
