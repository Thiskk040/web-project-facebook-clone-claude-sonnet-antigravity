const { io } = require('socket.io-client');
const axios = require('axios');
const baseUrl = 'http://localhost:3000';

async function runTests() {
    let token = '';

    // Get token
    try {
        const res = await axios.post(`${baseUrl}/auth/login`, { username: "testuser1", password: "password123" });
        token = res.data.token;
    } catch(e) {
        console.log("Login Error:", e.message);
        return;
    }

    console.log("=== Socket.io JWT Auth Tests ===");

    // Test 1: No token
    const socketNoToken = io(baseUrl, { transports: ['websocket'] });
    socketNoToken.on('connect_error', (err) => {
        console.log("Connect without token (EXPECT ERROR):", err.message);
        socketNoToken.close();
    });

    // Test 2: Invalid token
    const socketInvalid = io(baseUrl, { auth: { token: 'invalid' }, transports: ['websocket'] });
    socketInvalid.on('connect_error', (err) => {
        console.log("Connect invalid token (EXPECT ERROR):", err.message);
        socketInvalid.close();
    });

    // Test 3: Valid token
    const socketValid = io(baseUrl, { auth: { token }, transports: ['websocket'] });
    
    socketValid.on('connect', async () => {
        console.log("Connect valid token: SUCCESS");

        // Listen for new post
        socketValid.on('new_post', (data) => {
            console.log("Received new_post event via socket:", data.content);
            socketValid.close();
        });

        // Trigger post via HTTP
        console.log("Triggering HTTP POST to emit event...");
        await axios.post(`${baseUrl}/posts`, { content: "Socket real-time test" }, { headers: { Authorization: `Bearer ${token}` } });
    });
}

runTests();
