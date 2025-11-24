import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { stackServerApp } from '@/stack';
import { isRateLimited } from '@/lib/db-actions';

export const maxDuration = 300; // 5 minutes timeout for uploads

export async function POST(request: Request) {
  try {
    console.log("Upload API: Request received");

    // 0. Auth & Rate Limit Check
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isLimited = await isRateLimited(user.id);
    if (isLimited) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // 1. Verify Environment Variables
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      console.error('Upload API Error: Missing Cloudinary credentials');
      return NextResponse.json(
        { error: 'Server configuration error', details: 'Missing Cloudinary credentials' },
        { status: 500 }
      );
    }

    // Configure Cloudinary explicitly for this request
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    // 2. Parse Form Data
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      console.error('Upload API Error: No file provided');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log(`Upload API: Processing file: ${file.name} (${file.type}, ${file.size} bytes)`);

    // 3. Convert to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. Upload to Cloudinary
    console.log("Upload API: Starting Cloudinary upload stream...");

    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'community-feed',
          resource_type: 'auto',
          timeout: 600000, // 10 minutes connection timeout
        },
        (error, result) => {
          if (error) {
            console.error('Upload API: Cloudinary error:', error);
            reject(error);
          } else {
            console.log("Upload API: Upload success:", result?.secure_url);
            resolve(result);
          }
        }
      );

      // Handle stream errors specifically
      uploadStream.on('error', (err) => {
        console.error('Upload API: Stream error:', err);
        reject(err);
      });

      try {
        uploadStream.end(buffer);
      } catch (streamError) {
        console.error('Upload API: Stream write error:', streamError);
        reject(streamError);
      }
    });

    return NextResponse.json({ url: result.secure_url });

  } catch (error: any) {
    console.error('Upload API: Fatal Error:', error);

    // specific check for Cloudinary errors which might be objects
    let errorDetails = 'Unknown server error';
    if (error instanceof Error) {
      errorDetails = error.message;
    } else if (typeof error === 'object') {
      try {
        errorDetails = JSON.stringify(error);
      } catch (e) {
        errorDetails = 'Circular or unstringifiable error object';
      }
    } else {
      errorDetails = String(error);
    }

    const errorResponse = {
      error: 'Upload failed',
      details: errorDetails,
      code: 500
    };

    console.log('Upload API: Sending error response:', JSON.stringify(errorResponse));

    return NextResponse.json(
      errorResponse,
      { status: 500 }
    );
  }
}
