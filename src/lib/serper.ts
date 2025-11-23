import https from 'https';

export async function performWebSearch(query: string): Promise<string> {
    const apiKey = process.env.SERPER_API_KEY;
    console.log("Serper API Key present:", !!apiKey);

    if (!apiKey) {
        console.error("SERPER_API_KEY is not set.");
        return "Error: Web search is currently unavailable (API key missing).";
    }

    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            q: query,
            num: 5
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
            let responseBody = '';

            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                responseBody += chunk;
            });

            res.on('end', () => {
                if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
                    console.error("Serper API Error Status:", res.statusCode);
                    resolve(`Error performing web search: ${res.statusMessage}`);
                    return;
                }

                try {
                    const parsedData = JSON.parse(responseBody);

                    if (!parsedData.organic || parsedData.organic.length === 0) {
                        resolve("No web search results found.");
                        return;
                    }

                    let formattedResults = "WEB SEARCH RESULTS:\n\n";
                    parsedData.organic.forEach((result: any, index: number) => {
                        formattedResults += `${index + 1}. [${result.title}](${result.link})\n`;
                        formattedResults += `   ${result.snippet}\n\n`;
                    });

                    if (parsedData.peopleAlsoAsk && parsedData.peopleAlsoAsk.length > 0) {
                        formattedResults += "PEOPLE ALSO ASK:\n";
                        parsedData.peopleAlsoAsk.slice(0, 3).forEach((item: any) => {
                            formattedResults += `- ${item.question}\n`;
                        });
                        formattedResults += "\n";
                    }

                    resolve(formattedResults);
                } catch (e) {
                    console.error("Error parsing Serper response:", e);
                    resolve("Error parsing web search results.");
                }
            });
        });

        req.on('error', (e) => {
            console.error("Web search request error:", e);
            resolve("An error occurred while performing the web search.");
        });

        req.write(data);
        req.end();
    });
}
