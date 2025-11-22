import { NextResponse } from 'next/server';
import { addToCommunityFeed, getCommunityFeed } from '@/lib/db-actions';
import { stackServerApp } from '@/stack';

export async function GET(request: Request) {
    try {
        const feed = await getCommunityFeed();
        return NextResponse.json({ feed });
    } catch (error) {
        console.error('Error fetching community feed:', error);
        return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const user = await stackServerApp.getUser();

        const body = await request.json();
        const { imageUrl, prompt } = body;

        console.log('[API POST /community] Received request:', { imageUrl, prompt, userId: user?.id });

        if (!imageUrl) {
            console.error('[API POST /community] Missing imageUrl');
            return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
        }

        await addToCommunityFeed({
            userId: user?.id || 'anonymous',
            userAvatar: user?.profileImageUrl || 'https://i.pravatar.cc/150?img=68',
            userName: user?.displayName || 'Anonymous',
            imageUrl,
            prompt,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error adding to community feed:', error);
        return NextResponse.json({ error: 'Failed to add to feed' }, { status: 500 });
    }
}
