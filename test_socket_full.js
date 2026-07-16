const { io } = require('socket.io-client');
const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const baseUrl = 'http://localhost:3000';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function runTests() {
    console.log("=== Setting up 3 Users (A, B, C) ===");
    
    for (let u of ['A', 'B', 'C']) {
        try { await axios.post(`${baseUrl}/auth/register`, { username: `user${u}`, password: '123' }); } catch(e) {}
    }
    
    const tokens = {};
    const ids = {};
    for (let u of ['A', 'B', 'C']) {
        const res = await axios.post(`${baseUrl}/auth/login`, { username: `user${u}`, password: '123' });
        tokens[u] = res.data.token;
        ids[u] = res.data.user.id;
    }
    console.log("Tokens & IDs retrieved:", ids);

    const sockets = {};
    for (let u of ['A', 'B', 'C']) {
        sockets[u] = io(baseUrl, { auth: { token: tokens[u] }, transports: ['websocket'] });
        sockets[u].on('new_post', (data) => console.log(`[Socket ${u}] Received new_post:`, data.content));
        sockets[u].on('new_interaction', (data) => console.log(`[Socket ${u}] Received new_interaction from user_id:`, data.user_id));
        sockets[u].on('new_comment', (data) => console.log(`[Socket ${u}] Received new_comment:`, data.content));
        
        sockets[u].on(`friend_request_${ids[u]}`, (data) => console.log(`[Socket ${u}] Received friend_request for me! from:`, data.requester_username));
    }
    
    await sleep(500);

    console.log("\n=== Testing Events ===");
    console.log("-> User A creates a post");
    const postRes = await axios.post(`${baseUrl}/posts`, { content: `Post by A ${Date.now()}` }, { headers: { Authorization: `Bearer ${tokens['A']}` } });
    const postId = postRes.data.postId;
    await sleep(500);

    console.log("-> User B likes the post");
    await axios.post(`${baseUrl}/interactions`, { post_id: postId, type: 'like' }, { headers: { Authorization: `Bearer ${tokens['B']}` } });
    await sleep(500);

    console.log("-> User C comments on the post");
    await axios.post(`${baseUrl}/comments`, { post_id: postId, content: 'Comment by C' }, { headers: { Authorization: `Bearer ${tokens['C']}` } });
    await sleep(500);

    console.log("-> User A sends friend request to User B");
    try { await axios.post(`${baseUrl}/friend-request`, { addressee_id: ids['B'] }, { headers: { Authorization: `Bearer ${tokens['A']}` } }); } catch(e) {}
    await sleep(1000); 
    
    console.log("\n=== Testing Expired Token on Active Socket ===");
    const shortToken = jwt.sign({ id: 99, username: 'test_expired', exp: Math.floor(Date.now() / 1000) + 2 }, process.env.JWT_SECRET);
    const socketExp = io(baseUrl, { auth: { token: shortToken }, transports: ['websocket'] });
    
    socketExp.on('connect', () => console.log("[Socket Exp] Connected with short-lived (2s) token"));
    socketExp.on('token_expired', () => console.log("[Socket Exp] Received token_expired event from server"));
    socketExp.on('disconnect', (reason) => {
        console.log(`[Socket Exp] Disconnected. Reason: ${reason}`);
        
        for (let u of ['A', 'B', 'C']) sockets[u].disconnect();
        process.exit(0);
    });
}

runTests();
