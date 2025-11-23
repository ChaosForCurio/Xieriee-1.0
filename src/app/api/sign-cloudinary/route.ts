import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

export async function POST() {
    try {
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
        const apiKey = process.env.CLOUDINARY_API_KEY;
        const apiSecret = process.env.CLOUDINARY_API_SECRET;

        if (!cloudName || !apiKey || !apiSecret) {
            return NextResponse.json(
                { error: 'Missing Cloudinary credentials' },
                { status: 500 }
            );
        }

        // Timestamp must be in seconds
        const timestamp = Math.round(new Date().getTime() / 1000);
        const folder = 'community-feed';

        // Parameters to sign (must match what is sent to Cloudinary)
        const paramsToSign = {
            folder,
            timestamp,
        };

        const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

        return NextResponse.json({
            signature,
            timestamp,
            cloud_name: cloudName,
            api_key: apiKey,
            folder,
        });
    } catch (error) {
        console.error('Signature generation failed:', error);
        return NextResponse.json(
            { error: 'Signature generation failed' },
            { status: 500 }
        );
    }
}
