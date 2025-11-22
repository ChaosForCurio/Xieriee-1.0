
import { db } from '../db';
import { communityFeed } from '../db/schema';
import { desc } from 'drizzle-orm';
import { config } from 'dotenv';

config({ path: '.env.local' });

async function main() {
    try {
        console.log('Testing Community Feed DB...');

        // 1. Insert a test item
        console.log('Inserting test item...');
        await db.insert(communityFeed).values({
            userId: 'test-user-123',
            userAvatar: 'https://example.com/avatar.jpg',
            userName: 'Test User',
            imageUrl: 'https://example.com/image.jpg',
            prompt: 'Test Prompt',
        });
        console.log('Insertion successful.');

        // 2. Fetch items
        console.log('Fetching items...');
        const feed = await db.select()
            .from(communityFeed)
            .orderBy(desc(communityFeed.createdAt))
            .limit(5);

        console.log('Fetched Feed:', feed);

        if (feed.length > 0 && feed[0].userId === 'test-user-123') {
            console.log('SUCCESS: DB is working correctly.');
        } else {
            console.error('FAILURE: Could not find inserted item.');
        }

    } catch (error) {
        console.error('Test Failed:', error);
    }
    process.exit(0);
}

main();
