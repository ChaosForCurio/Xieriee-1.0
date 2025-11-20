import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const vars = {
        NEXT_PUBLIC_STACK_PROJECT_ID: !!process.env.NEXT_PUBLIC_STACK_PROJECT_ID,
        NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY: !!process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY,
        STACK_SECRET_SERVER_KEY: !!process.env.STACK_SECRET_SERVER_KEY,
        GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
        FREEPIK_API_KEY: !!process.env.FREEPIK_API_KEY,
        DATABASE_URL: !!process.env.DATABASE_URL,
        NODE_ENV: process.env.NODE_ENV,
    };

    return NextResponse.json({
        status: 'Environment Check',
        variables: vars,
    });
}
