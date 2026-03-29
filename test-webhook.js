const http = require('http');

// Replace with your generated Webhook ID from the dashboard
const WEBHOOK_ID = process.argv[2] || 'YOUR_WEBHOOK_ID';
const ENDPOINT = `http://localhost:5000/webhook/${WEBHOOK_ID}`;

const events = [
    {
        type: "add_to_cart",
        customer: { email: "john@example.com", first_name: "John", last_name: "Doe" },
        product: "Premium T-shirt",
        value: 29.99
    },
    {
        type: "page_view",
        customer: { email: "sarah@example.com", first_name: "Sarah" },
        page: "/collection/summer"
    },
    {
        type: "checkout",
        customer: { email: "john@example.com", first_name: "John", last_name: "Doe" },
        order_id: "ORD-123",
        amount: 89.97
    }
];

async function sendWebhook(payload) {
    return new Promise((resolve, reject) => {
        const url = new URL(ENDPOINT);
        const data = JSON.stringify(payload);
        
        const req = http.request(
            {
                hostname: url.hostname,
                port: url.port,
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data)
                }
            },
            (res) => {
                let responseBody = '';
                res.on('data', chunk => responseBody += chunk);
                res.on('end', () => resolve({ status: res.statusCode, body: responseBody }));
            }
        );
        
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function run() {
    if (WEBHOOK_ID === 'YOUR_WEBHOOK_ID') {
        console.error('Please pass your WEBHOOK_ID as an argument: node test-webhook.js 123-abc');
        process.exit(1);
    }

    console.log(`Sending test events to ${ENDPOINT}...\n`);

    for (const event of events) {
        try {
            console.log(`Sending ${event.type}...`);
            const res = await sendWebhook(event);
            console.log(`Response: ${res.status} ${res.body}`);
            // Wait 1.5 seconds between events to simulate real traffic
            await new Promise(r => setTimeout(r, 1500));
        } catch (e) {
            console.error(`Error sending event:`, e.message);
        }
    }
    
    console.log('\nFinished sending test events.');
}

run();
