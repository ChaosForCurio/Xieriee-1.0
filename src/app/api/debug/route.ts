import { NextResponse } from 'next/server';

export async function GET() {
    console.log("Debug route hit");
    return NextResponse.json({ status: 'ok' });
}
