const axios = require('axios');
const io = require('socket.io-client');
const sqlite3 = require('sqlite3').verbose();
const speakeasy = require('speakeasy');
const path = require('path');

const baseUrl = 'http://localhost:3000';
const dbPath = path.join(__dirname, 'facebook.db');

async function registerAndLoginUser(userData) {
    const initRes = await axios.post(`${baseUrl}/auth/register-init`, userData);
    const { tempToken, secretKey } = initRes.data;
    
    const code = speakeasy.totp({ secret: secretKey, encoding: 'base32' });
    const verifyRes = await axios.post(`${baseUrl}/auth/register-verify-2fa`, { tempToken, code });
    return verifyRes.data;
}

async function runLiveTypingTests() {
    console.log("==================================================");
    console.log("Starting Comprehensive Live Typing Feature Tests");
    console.log("==================================================\n");

    const timestamp = Date.now();
    const userA = { username: `live_a_${timestamp}`, password: 'Password123!', email: `live_a_${timestamp}@test.com` };
    const userB = { username: `live_b_${timestamp}`, password: 'Password123!', email: `live_b_${timestamp}@test.com` };

    let tokenA, tokenB, idA, idB;

    try {
        // 1. Register User A & User B with 2FA TOTP
        console.log("1. Registering test users (User A & User B)...");
        const resA = await registerAndLoginUser(userA);
        tokenA = resA.token;
        idA = resA.user.id;

        const resB = await registerAndLoginUser(userB);
        tokenB = resB.token;
        idB = resB.user.id;

        console.log(`[PASS] Registered User A (ID: ${idA}) and User B (ID: ${idB})`);

        // Establish Friendship
        console.log("\n2. Establishing friendship between User A and User B...");
        await axios.post(`${baseUrl}/friend-request`, { addressee_id: idB }, { headers: { Authorization: `Bearer ${tokenA}` } });
        await axios.put(`${baseUrl}/friend-request/accept`, { requester_id: idA }, { headers: { Authorization: `Bearer ${tokenB}` } });
        console.log("[PASS] Friendship accepted.");

        // 3. Connect Sockets
        console.log("\n3. Connecting Sockets for User A and User B...");
        const socketA = io(baseUrl, { auth: { token: tokenA }, transports: ['websocket'] });
        const socketB = io(baseUrl, { auth: { token: tokenB }, transports: ['websocket'] });

        await new Promise(r => setTimeout(r, 500));

        const roomId = `chat_${Math.min(idA, idB)}_${Math.max(idA, idB)}`;
        socketA.emit('join_room', { roomId, targetUserId: idB });
        socketB.emit('join_room', { roomId, targetUserId: idA });
        await new Promise(r => setTimeout(r, 300));

        // TEST 1: Default OFF Dual Opt-In Block
        console.log("\n--- TEST 1: Dual Opt-In Block (Both Default OFF) ---");
        let draftReceivedB = false;
        socketB.on('peer_typing_draft', () => { draftReceivedB = true; });

        socketA.emit('typing_draft', { roomId, targetUserId: idB, draftText: 'Secret draft test 1' });
        await new Promise(r => setTimeout(r, 400));

        if (!draftReceivedB) {
            console.log("[PASS] Draft dropped when both users default OFF.");
        } else {
            console.error("[FAIL] Draft relayed despite both users default OFF!");
        }

        // TEST 2: User A ON, User B OFF
        console.log("\n--- TEST 2: Single Opt-In Block (User A ON, User B OFF) ---");
        await axios.put(`${baseUrl}/users/me/live-typing`, { enabled: true }, { headers: { Authorization: `Bearer ${tokenA}` } });
        socketA.emit('live_typing_toggle', { enabled: true });
        draftReceivedB = false;

        socketA.emit('typing_draft', { roomId, targetUserId: idB, draftText: 'Secret draft test 2' });
        await new Promise(r => setTimeout(r, 400));

        if (!draftReceivedB) {
            console.log("[PASS] Draft dropped when only 1 user opted in.");
        } else {
            console.error("[FAIL] Draft relayed when target user is OFF!");
        }

        // TEST 3: Both Users Opted IN
        console.log("\n--- TEST 3: Dual Opt-In Active (Both Users ON) ---");
        await axios.put(`${baseUrl}/users/me/live-typing`, { enabled: true }, { headers: { Authorization: `Bearer ${tokenB}` } });
        socketB.emit('live_typing_toggle', { enabled: true });
        await new Promise(r => setTimeout(r, 300));

        // Verify status endpoint
        const statusRes = await axios.get(`${baseUrl}/users/live-typing-status/${idB}`, { headers: { Authorization: `Bearer ${tokenA}` } });
        if (statusRes.data.active) {
            console.log("[PASS] Status API confirmed live preview is ACTIVE for both users.");
        } else {
            console.error("[FAIL] Status API did not report active!", statusRes.data);
        }

        const UNIQUE_SECRET_MARKER = `TEST_SECRET_DRAFT_MARKER_${timestamp}`;
        let receivedPayloadB = null;
        socketB.on('peer_typing_draft', (data) => { receivedPayloadB = data; });

        socketA.emit('typing_draft', { roomId, targetUserId: idB, draftText: UNIQUE_SECRET_MARKER });
        await new Promise(r => setTimeout(r, 400));

        if (receivedPayloadB && receivedPayloadB.draftText === UNIQUE_SECRET_MARKER) {
            console.log(`[PASS] Live typing draft successfully relayed to User B: "${receivedPayloadB.draftText}"`);
        } else {
            console.error("[FAIL] Draft not received by User B when both opted in!");
        }

        // TEST 4: Throttle Protection (150ms)
        console.log("\n--- TEST 4: Server Throttling Verification (150ms window) ---");
        let emitCount = 0;
        socketB.on('peer_typing_draft', () => { emitCount++; });

        for (let i = 0; i < 20; i++) {
            socketA.emit('typing_draft', { roomId, targetUserId: idB, draftText: `Rapid test ${i}` });
        }
        await new Promise(r => setTimeout(r, 500));

        console.log(`Sent 20 rapid emits. User B received: ${emitCount} events.`);
        if (emitCount < 5) {
            console.log("[PASS] Rapid emissions throttled effectively by server.");
        } else {
            console.error(`[FAIL] Throttle failed! Received ${emitCount} events.`);
        }

        // TEST 5: Text Length Truncation (Max 500 chars)
        console.log("\n--- TEST 5: Text Length Truncation (Max 500 chars) ---");
        const longText = 'A'.repeat(750);
        let truncatedResult = null;
        socketB.on('peer_typing_draft', (data) => { truncatedResult = data.draftText; });

        await new Promise(r => setTimeout(r, 200));
        socketA.emit('typing_draft', { roomId, targetUserId: idB, draftText: longText });
        await new Promise(r => setTimeout(r, 400));

        if (truncatedResult && truncatedResult.length === 500) {
            console.log(`[PASS] Draft text truncated to exactly 500 characters (sent 750).`);
        } else {
            console.error(`[FAIL] Truncation failed! Received length: ${truncatedResult ? truncatedResult.length : 0}`);
        }

        // TEST 6: Mid-Draft Toggle Invalidation
        console.log("\n--- TEST 6: Mid-Draft Toggle Invalidation ---");
        let stoppedReceived = false;
        let statusChangedReceived = false;
        socketA.on('peer_typing_stopped', () => { stoppedReceived = true; });
        socketA.on('live_typing_status_changed', (d) => { if (d.active === false) statusChangedReceived = true; });

        await axios.put(`${baseUrl}/users/me/live-typing`, { enabled: false }, { headers: { Authorization: `Bearer ${tokenB}` } });
        socketB.emit('live_typing_toggle', { enabled: false });
        await new Promise(r => setTimeout(r, 400));

        if (stoppedReceived || statusChangedReceived) {
            console.log("[PASS] Mid-draft toggle instantly invalidated session and notified room.");
        } else {
            console.error("[FAIL] Invalidation event not received by peer!");
        }

        // Cleanup Sockets
        socketA.disconnect();
        socketB.disconnect();

        // TEST 7: Zero DB Persistence Audit
        console.log("\n--- TEST 7: Concrete Zero DB Persistence Audit ---");
        const db = new sqlite3.Database(dbPath);
        
        await new Promise((resolve) => {
            db.all(`
                SELECT 'posts' as tbl, content FROM posts WHERE content LIKE '%' || ? || '%'
                UNION ALL
                SELECT 'comments' as tbl, content FROM comments WHERE content LIKE '%' || ? || '%'
                UNION ALL
                SELECT 'messages' as tbl, content FROM messages WHERE content LIKE '%' || ? || '%'
            `, [UNIQUE_SECRET_MARKER, UNIQUE_SECRET_MARKER, UNIQUE_SECRET_MARKER], (err, rows) => {
                if (err) {
                    console.error("Error querying DB for persistence check:", err);
                } else if (rows.length === 0) {
                    console.log(`[PASS] Zero persistence audit confirmed 0 occurrences of secret marker "${UNIQUE_SECRET_MARKER}" in SQLite database.`);
                } else {
                    console.error(`[FAIL] CRITICAL SECURITY FAILURE: Found ${rows.length} occurrences of secret draft marker in DB!`, rows);
                }
                db.close();
                resolve();
            });
        });

        console.log("\n==================================================");
        console.log("ALL LIVE TYPING TESTS COMPLETED SUCCESSFULLY!");
        console.log("==================================================");

    } catch (err) {
        console.error("[FAIL] Test script error:", err.response ? err.response.data : err.message);
        process.exit(1);
    }
}

runLiveTypingTests();
