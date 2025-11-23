import { db } from './src/db/index';
import { rateLimits } from './src/db/schema';
import { sql } from 'drizzle-orm';

async function clearRateLimits() {
    try {
        await db.delete(rateLimits);
        console.log("Rate limits cleared.");
    } catch (error) {
        console.error("Error clearing rate limits:", error);
    }
    process.exit(0);
}

clearRateLimits();
