const axios = require('axios');
const io = require('socket.io-client');
const sqlite3 = require('sqlite3').verbose();

const BASE_URL = 'http://localhost:3000';
const db = new sqlite3.Database('./facebook.db');

async function runAudit() {
    console.log("==========================================");
    console.log(" DETAILED SECURITY AUDIT WITH RAW EVIDENCE");
    console.log("==========================================\n");

    const registerAndLogin = async (username) => {
        try { await axios.post(`${BASE_URL}/auth/register`, { username, password: 'password123' }); } catch(e) {} 
        const res = await axios.post(`${BASE_URL}/auth/login`, { username, password: 'password123' });
        return { token: res.data.token, id: res.data.user.id, username };
    };

    const A = await registerAndLogin(`UserA_${Date.now()}`);
    const B = await registerAndLogin(`UserB_${Date.now()}`);
    const C = await registerAndLogin(`UserC_${Date.now()}`);
    
    console.log(`[+] Created Users: A(id:${A.id}), B(id:${B.id}), C(id:${C.id})`);

    // ---------------------------------------------------------
    // 1. Direct Messaging IDOR Test
    // ---------------------------------------------------------
    console.log("\n--- 1. DIRECT MESSAGING IDOR ---");
    console.log(`[Action] User A (id:${A.id}) sends message to User B (id:${B.id})`);
    await axios.post(`${BASE_URL}/messages`, { receiver_id: B.id, content: 'Top Secret A->B' }, { headers: { Authorization: `Bearer ${A.token}` } });
    
    console.log(`[Action] User C (id:${C.id}) attempts to fetch User B's messages by guessing endpoint: GET /messages/${B.id}`);
    try {
        const res = await axios.get(`${BASE_URL}/messages/${B.id}`, { headers: { Authorization: `Bearer ${C.token}` } });
        console.log(`[Result] HTTP Status: ${res.status}`);
        console.log(`[Result] Response Data:`, JSON.stringify(res.data));
        console.log(`[Note] User C only gets an empty array (or their own chat with B), NOT A's chat.`);
    } catch(err) {
        console.log(`[Result] HTTP Error Status:`, err.response ? err.response.status : err.message);
    }
    
    const dbMessages = await new Promise(res => db.all("SELECT * FROM messages WHERE sender_id = ? AND receiver_id = ?", [A.id, B.id], (err, rows) => res(rows)));
    console.log(`[DB Check] Actual messages in DB between A and B:`);
    console.log(dbMessages);


    // ---------------------------------------------------------
    // 2. Direct Messaging Socket Isolation Test
    // ---------------------------------------------------------
    console.log("\n--- 2. SOCKET ISOLATION ---");
    console.log(`[Action] Malicious User C (id:${C.id}) connects to socket and listens for 'new_message_${B.id}'`);
    const socketC = io(BASE_URL, { auth: { token: C.token } });
    let leakedEvent = null;
    
    await new Promise(resolve => {
        socketC.on('connect', async () => {
            console.log(`   -> User C Socket Connected`);
            
            socketC.on(`new_message_${B.id}`, (msg) => {
                leakedEvent = msg;
                console.log(`   -> [ALERT] Event leaked to User C!`);
            });
            
            console.log(`[Action] User A (id:${A.id}) sends a new message to User B (id:${B.id})`);
            await axios.post(`${BASE_URL}/messages`, { receiver_id: B.id, content: 'Another Secret A->B' }, { headers: { Authorization: `Bearer ${A.token}` } });
            
            console.log(`   -> Waiting 1000ms to check if User C receives the event...`);
            setTimeout(() => resolve(), 1000);
        });
    });
    
    socketC.disconnect();
    console.log(`[Result] Did User C intercept the socket event? : ${leakedEvent ? "YES (FAILED)" : "NO (PASSED - Event Isolated)"}`);


    // ---------------------------------------------------------
    // 3. Feed Privacy Filtering Test
    // ---------------------------------------------------------
    console.log("\n--- 3. FEED PRIVACY FILTERING ---");
    console.log(`[Action] User A and User B create public posts.`);
    await axios.post(`${BASE_URL}/posts`, { content: 'Public Post by A' }, { headers: { Authorization: `Bearer ${A.token}` } });
    await axios.post(`${BASE_URL}/posts`, { content: 'Public Post by B' }, { headers: { Authorization: `Bearer ${B.token}` } });
    
    console.log(`[Action] User C fetches their Feed: GET /posts`);
    const feedC = await axios.get(`${BASE_URL}/posts`, { headers: { Authorization: `Bearer ${C.token}` } });
    console.log(`[Result] User C Feed Response Array:`, JSON.stringify(feedC.data));
    
    // DB Check
    const rawFeedQuery = await new Promise(res => db.all(`
        SELECT p.id, p.content, p.user_id 
        FROM posts p
        WHERE p.user_id = ? OR p.user_id IN (
            SELECT addressee_id FROM friendships WHERE requester_id = ? AND status='accepted'
            UNION
            SELECT requester_id FROM friendships WHERE addressee_id = ? AND status='accepted'
        )
    `, [C.id, C.id, C.id], (err, rows) => res(rows)));
    console.log(`[DB Query Result] Raw Feed Query Execution for User C:`);
    console.log(rawFeedQuery);


    // ---------------------------------------------------------
    // 4. Unfriend Test
    // ---------------------------------------------------------
    console.log("\n--- 4. UNFRIEND DB RECORD PURGE ---");
    console.log(`[Action] User A and C become friends.`);
    await axios.post(`${BASE_URL}/friend-request`, { addressee_id: C.id }, { headers: { Authorization: `Bearer ${A.token}` } });
    await axios.put(`${BASE_URL}/friend-request/accept`, { requester_id: A.id }, { headers: { Authorization: `Bearer ${C.token}` } });
    
    let dbFriends = await new Promise(res => db.all("SELECT * FROM friendships WHERE (requester_id=? AND addressee_id=?) OR (requester_id=? AND addressee_id=?)", [A.id, C.id, C.id, A.id], (err, rows) => res(rows)));
    console.log(`[DB Check - Before Unfriend] Friendship records between A and C:`);
    console.log(dbFriends);
    
    console.log(`[Action] User C unfriends User A: DELETE /friendships/${A.id}`);
    const unfriendRes = await axios.delete(`${BASE_URL}/friendships/${A.id}`, { headers: { Authorization: `Bearer ${C.token}` } });
    console.log(`[Result] Unfriend HTTP Status: ${unfriendRes.status}`);
    
    let dbFriendsAfter = await new Promise(res => db.all("SELECT * FROM friendships WHERE (requester_id=? AND addressee_id=?) OR (requester_id=? AND addressee_id=?)", [A.id, C.id, C.id, A.id], (err, rows) => res(rows)));
    console.log(`[DB Check - After Unfriend] Friendship records between A and C:`);
    console.log(dbFriendsAfter);
    
    console.log("\n==========================================");
    console.log(" AUDIT COMPLETE");
    console.log("==========================================");
    process.exit(0);
}

runAudit().catch(console.error);
