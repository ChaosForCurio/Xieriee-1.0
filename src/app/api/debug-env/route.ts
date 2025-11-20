import { NextResponse } from 'next/server';
import { stackServerApp } from '../../../stack';

export const dynamic = 'force-dynamic';

export async function GET() {
    const vars = [
        'NEXT_PUBLIC_STACK_PROJECT_ID',
        'NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY',
        'STACK_SECRET_SERVER_KEY',
        'GEMINI_API_KEY',
        'FREEPIK_API_KEY',
        'DATABASE_URL'
    ];

    const details: Record<string, any> = {};

    for (const v of vars) {
        const val = process.env[v];
        if (!val) {
            details[v] = { present: false };
        } else {
            details[v] = {
                present: true,
                length: val.length,
                first3Chars: val.substring(0, 3),
                last3Chars: val.substring(val.length - 3),
                hasWhitespace: /\s/.test(val)
            };
        }
    }

    let stackInitError = null;
    let stackSignInUrl = null;
    try {
        // Check if we can access the URLs, which implies the config is valid enough to generate them
        stackSignInUrl = stackServerApp.urls.signIn;
    } catch (e: any) {
        stackInitError = e.message;
    }

    return NextResponse.json({
        status: 'Deep Environment Check',
        variables: details,
        stackInitError,
        stackSignInUrl,
        nodeEnv: process.env.NODE_ENV
    });
}
