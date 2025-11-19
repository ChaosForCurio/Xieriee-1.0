import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './src/db/schema';

async function testConnection() {
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL is missing');
        return;
    }
    console.log('Testing connection...');
    try {
        const sql = neon(process.env.DATABASE_URL);
        const db = drizzle(sql, { schema });
        const result = await db.select().from(schema.chats).limit(1);
        console.log('Connection successful! Query result:', result);
    } catch (error) {
        console.error('Connection failed:', error);
    }
}

testConnection();
