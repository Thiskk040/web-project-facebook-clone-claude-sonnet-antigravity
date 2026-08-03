const { io } = require('socket.io-client');
const axios = require('axios');
const baseUrl = 'http://localhost:3000';

async function runTests() {
    console.log("=== Part 4 Testing ===");
    let token, user;
    try { await axios.post(`${baseUrl}/auth/register`, { username: "part4_user", password: "123" }); } catch(e) {}
    const res = await axios.post(`${baseUrl}/auth/login`, { username: "part4_user", password: "123" });
    token = res.data.token; user = res.data.user;

    const socket = io(baseUrl, { auth: { token }, transports: ['websocket'] });
    
    socket.on('connect', () => {
        console.log(`[Client] Connected with socket id: ${socket.id}`);
    });
    
    socket.on('disconnect', (reason) => {
        console.log(`[Client] Disconnected. Reason: ${reason}`);
    });
    
    socket.io.on("reconnect", (attempt) => {
        console.log(`[Client] Auto-reconnected on attempt ${attempt}`);
    });

    socket.on('new_post', (data) => {
        console.log("[Client] Received event after reconnect:", data.content);
        process.exit(0);
    });

    setTimeout(() => {
        console.log("-> Simulating network drop...");
        socket.io.engine.close(); 
    }, 1000);

    setTimeout(async () => {
        console.log("-> Triggering a post to test if socket is working after reconnect...");
        await axios.post(`${baseUrl}/posts`, { content: "Test Post Part 4" }, { headers: { Authorization: `Bearer ${token}` } });
    }, 3000);
}
runTests();
