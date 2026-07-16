const axios = require('axios');
const io = require('socket.io-client');
const sqlite3 = require('sqlite3').verbose();

const BASE_URL = 'http://localhost:3000';

async function runTests() {
    console.log("=== STARTING SECURITY AUDIT (PHASE 7) ===\n");
    const db = new sqlite3.Database('./facebook.db');

    const registerAndLogin = async (username) => {
        try {
            await axios.post(`${BASE_URL}/auth/register`, { username, password: 'password123' });
        } catch(e) {} 
        const res = await axios.post(`${BASE_URL}/auth/login`, { username, password: 'password123' });
        return { token: res.data.token, id: res.data.user.id, username };
    };

    console.log("[Setup] Registering test users...");
    const userA = await registerAndLogin(`userA_${Date.now()}`);
    const userB = await registerAndLogin(`userB_${Date.now()}`);
    const userC = await registerAndLogin(`userC_${Date.now()}`);
    console.log(`User A (ID: ${userA.id}), User B (ID: ${userB.id}), User C (ID: ${userC.id})\n`);

    await axios.post(`${BASE_URL}/posts`, { content: 'Post by A' }, { headers: { Authorization: `Bearer ${userA.token}` } });
    await axios.post(`${BASE_URL}/posts`, { content: 'Post by B' }, { headers: { Authorization: `Bearer ${userB.token}` } });
    
    // --- 2. Feed Privacy Test ---
    console.log("--- 2. FEED PRIVACY TEST ---");
    let feedC = await axios.get(`${BASE_URL}/posts`, { headers: { Authorization: `Bearer ${userC.token}` } });
    let canSeeA_or_B = feedC.data.some(p => p.user_id === userA.id || p.user_id === userB.id);
    console.log(`[Validation] User C fetches feed (Not friends with A/B).`);
    console.log(`[Result] Can C see A or B's posts? -> ${canSeeA_or_B ? 'FAILED' : 'PASSED'}\n`);

    // --- 3. Unfriend Test ---
    console.log("--- 3. UNFRIEND & FEED RECIPROCITY TEST ---");
    await axios.post(`${BASE_URL}/friend-request`, { addressee_id: userC.id }, { headers: { Authorization: `Bearer ${userA.token}` } });
    await axios.put(`${BASE_URL}/friend-request/accept`, { requester_id: userA.id }, { headers: { Authorization: `Bearer ${userC.token}` } });
    console.log("[Setup] User A and User C are now friends.");
    
    feedC = await axios.get(`${BASE_URL}/posts`, { headers: { Authorization: `Bearer ${userC.token}` } });
    let canSeeA_Now = feedC.data.some(p => p.user_id === userA.id);
    console.log(`[Validation] Can C see A's post after accepting request? -> ${canSeeA_Now ? 'PASSED' : 'FAILED'}`);
    
    console.log("[Action] User C unfriends User A.");
    await axios.delete(`${BASE_URL}/friendships/${userA.id}`, { headers: { Authorization: `Bearer ${userC.token}` } });
    
    const checkFriendship = () => new Promise((resolve) => {
        db.get("SELECT * FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)", [userA.id, userC.id, userC.id, userA.id], (err, row) => resolve(row));
    });
    const friendshipRow = await checkFriendship();
    console.log(`[Validation] Database Check: Does friendship row still exist? -> ${friendshipRow ? 'FAILED' : 'PASSED'}`);

    feedC = await axios.get(`${BASE_URL}/posts`, { headers: { Authorization: `Bearer ${userC.token}` } });
    let canSeeA_PostUnfriend = feedC.data.some(p => p.user_id === userA.id);
    console.log(`[Validation] Can C see A's post after unfriending? -> ${canSeeA_PostUnfriend ? 'FAILED (Still Visible)' : 'PASSED (Hidden)'}\n`);

    // --- 1. Direct Messaging Security ---
    console.log("--- 1. DIRECT MESSAGING SECURITY TEST ---");
    await axios.post(`${BASE_URL}/messages`, { receiver_id: userB.id, content: 'Secret from A to B' }, { headers: { Authorization: `Bearer ${userA.token}` } });
    console.log("[Setup] User A sends private message to User B.");
    
    console.log("[Action] User C attempts to fetch chat history of User B.");
    const msgsC = await axios.get(`${BASE_URL}/messages/${userB.id}`, { headers: { Authorization: `Bearer ${userC.token}` } });
    const leaked = msgsC.data.some(m => m.sender_id === userA.id);
    console.log(`[Validation] Did User A's message leak to User C? -> ${leaked ? 'FAILED (403/404 bypass)' : 'PASSED (0 leaked messages)'}`);
    
    console.log("\n--- 1.2 SOCKET EVENT LEAK TEST ---");
    console.log("[Setup] Malicious User C connects to Socket.io and listens to 'new_message_UserB_ID'.");
    const socketC = io(BASE_URL, { auth: { token: userC.token } });
    let socketLeak = false;
    
    await new Promise(resolve => {
        socketC.on('connect', async () => {
            socketC.on(`new_message_${userB.id}`, (msg) => {
                socketLeak = true;
            });
            
            console.log("[Action] User A sends a second message to User B.");
            await axios.post(`${BASE_URL}/messages`, { receiver_id: userB.id, content: 'Another secret' }, { headers: { Authorization: `Bearer ${userA.token}` } });
            
            setTimeout(() => resolve(), 800);
        });
    });
    
    socketC.disconnect();
    console.log(`[Validation] Did Malicious User C intercept User B's socket event? -> ${socketLeak ? 'FAILED (EVENT LEAKED!)' : 'PASSED (Event Isolated via Rooms)'}`);

    console.log("\n=== SECURITY AUDIT COMPLETE ===");
    process.exit(0);
}

runTests().catch(console.error);
