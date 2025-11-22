import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const feedRef = doc(db, "communityFeed", id);
        await updateDoc(feedRef, {
            likes: increment(1)
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error liking feed item:", error);
        return NextResponse.json({ error: "Failed to like item" }, { status: 500 });
    }
}
