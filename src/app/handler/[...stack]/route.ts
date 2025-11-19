import { stackServerApp } from "../../../stack";

export const GET = (request: Request) => (stackServerApp as any).handler(request);
export const POST = (request: Request) => (stackServerApp as any).handler(request);
