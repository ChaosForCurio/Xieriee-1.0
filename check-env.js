const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');

if (!fs.existsSync(envPath)) {
    console.error('.env.local file not found!');
    process.exit(1);
}

const content = fs.readFileSync(envPath, 'utf8');
const lines = content.split('\n');

const keys = new Set();
const duplicates = [];
const parsedEnv = {};

lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) return;

    const match = trimmedLine.match(/^([^=]+)=(.*)$/);
    if (match) {
        const key = match[1].trim();
        const value = match[2].trim();

        if (keys.has(key)) {
            duplicates.push({ key, line: index + 1 });
        } else {
            keys.add(key);
            parsedEnv[key] = value;
        }
    }
});

if (duplicates.length > 0) {
    console.error('Found duplicate keys in .env.local:');
    duplicates.forEach(dup => {
        console.error(`- ${dup.key} on line ${dup.line}`);
    });
} else {
    console.log('No duplicate keys found in .env.local.');
}

const requiredKeys = [
    'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    'GEMINI_API_KEY',
    'GROQ_API_KEY',
    'NEXT_PUBLIC_STACK_PROJECT_ID',
    'NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY',
    'STACK_SECRET_SERVER_KEY'
];

const missingKeys = requiredKeys.filter(key => !parsedEnv[key]);

if (missingKeys.length > 0) {
    console.error('Missing required environment variables:');
    missingKeys.forEach(key => console.error(`- ${key}`));
} else {
    console.log('All required environment variables are present.');
}
