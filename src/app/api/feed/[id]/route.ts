import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await deleteDoc(doc(db, "communityFeed", id));
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting feed item:", error);
        return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
    }
}
