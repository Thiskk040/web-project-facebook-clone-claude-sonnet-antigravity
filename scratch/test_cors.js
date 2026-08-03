const http = require('http');
const ioClient = require('socket.io-client');

function testOrigin(originHeader) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/auth/login',
            method: 'OPTIONS',
            headers: {
                'Origin': originHeader,
                'Access-Control-Request-Method': 'POST'
            }
        };

        const req = http.request(options, (res) => {
            resolve({
                statusCode: res.statusCode,
                allowOriginHeader: res.headers['access-control-allow-origin'],
                allowCredentialsHeader: res.headers['access-control-allow-credentials']
            });
        });

        req.on('error', (err) => resolve({ error: err.message }));
        req.end();
    });
}

async function runTests() {
    console.log('--- Testing CORS HTTP Preflight ---');
    const malicious = await testOrigin('http://malicious-site.com');
    console.log('Malicious Origin (http://malicious-site.com):', malicious);

    const valid = await testOrigin('http://localhost:5173');
    console.log('Valid Origin (http://localhost:5173):', valid);

    console.log('\n--- Testing Socket.io Connection from valid origin ---');
    const socket = ioClient('http://localhost:3000', {
        extraHeaders: {
            Origin: 'http://localhost:5173'
        },
        transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
        console.log('Socket.io connected successfully! ID:', socket.id);
        socket.disconnect();
        process.exit(0);
    });

    socket.on('connect_error', (err) => {
        console.error('Socket.io connect error:', err.message);
        process.exit(1);
    });

    setTimeout(() => {
        console.log('Socket timeout');
        process.exit(1);
    }, 5000);
}

runTests();
