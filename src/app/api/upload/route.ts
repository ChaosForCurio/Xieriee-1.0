import { NextResponse } from 'next/server';

export const maxDuration = 300; // 5 minutes

export async function POST(request: Request) {
  const startTime = Date.now();
  console.log('[Upload API] ========== NEW UPLOAD REQUEST ==========');

  try {
    const { image } = await request.json();

    if (!image) {
      console.error('[Upload API] No image in request body');
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const payloadSize = image.length;
    console.log(`[Upload API] Received image. Size: ~${Math.round(payloadSize / 1024)}KB`);

    const result = {
      status: 'success',
      cloudinary_url: image, // keep field name for compatibility
    } as { status: string; cloudinary_url: string };
    const duration = Date.now() - startTime;
    console.log(`[Upload API] Processed in ${duration}ms. Result: ${result.status}`);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    console.error('[Upload API] ❌ Critical Error after', duration, 'ms:', error);
    return NextResponse.json({ error: (error as Error).message || 'Internal Server Error' }, { status: 500 });
  }
}
