import { NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import { db } from '@/db';
import { userImages } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const user = await stackServerApp.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const images = await db.select()
            .from(userImages)
            .where(eq(userImages.userId, user.id))
            .orderBy(desc(userImages.createdAt));

        return NextResponse.json({ images });
    } catch (error) {
        console.error('Library API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const user = await stackServerApp.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
        }

        await db.delete(userImages)
            .where(and(
                eq(userImages.id, parseInt(id)),
                eq(userImages.userId, user.id)
            )); // Ensure user owns the image

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Library Delete Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
