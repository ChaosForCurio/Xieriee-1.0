const https = require('https');

const apiKey = process.env.SERPER_API_KEY || 'b9d5ae9b486178de2b3938c410f19b7ed63da88b';

console.log("Testing Serper API with key:", apiKey);

const data = JSON.stringify({
    q: "test query",
    num: 1
});

const options = {
    hostname: 'google.serper.dev',
    path: '/search',
    method: 'POST',
    headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });
    res.on('end', () => {
        console.log('No more data in response.');
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
