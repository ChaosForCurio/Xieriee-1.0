import { stackServerApp } from "../../../stack";

import { NextResponse } from "next/server";

const handler = async (request: Request) => {
    try {
        return await (stackServerApp as any).handler(request);
    } catch (error: any) {
        console.error("Stack Auth Handler Error:", error);
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
};

export const GET = handler;
export const POST = handler;
