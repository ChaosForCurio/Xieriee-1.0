import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as dotenv from 'dotenv';
import { sql } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

const sqlNeon = neon(process.env.DATABASE_URL!);
const db = drizzle(sqlNeon);

async function listTables() {
    try {
        const result = await db.execute(sql`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('Tables:', result.rows);
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

listTables();
