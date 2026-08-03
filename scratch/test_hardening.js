const fs = require('fs');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');
const ioClient = require('socket.io-client');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const upload = require('../config/upload');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_facebook_clone_key_2026';

function runDbQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function runDbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

async function runHardeningTests() {
    console.log('=============== STARTING SECURITY HARDENING AUDIT ===============\n');

    // -------------------------------------------------------------
    // Item 3 Positive Test: Magic Byte Verification for Real Image Buffers
    // -------------------------------------------------------------
    console.log('[ITEM 3] Testing Magic Byte Validator on Real Image Formats...');
    const testDir = path.join(__dirname, 'temp_img_tests');
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir);

    const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
    const jpgBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const gifBuffer = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00]);
    // WEBP: RIFF + length + WEBP
    const webpBuffer = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
    // WAVE (RIFF audio - should be rejected!)
    const waveBuffer = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45]);
    // Fake TXT disguised as JPG
    const fakeTxtBuffer = Buffer.from("Hello world text file disguise");

    const pngPath = path.join(testDir, 'test.png');
    const jpgPath = path.join(testDir, 'test.jpg');
    const gifPath = path.join(testDir, 'test.gif');
    const webpPath = path.join(testDir, 'test.webp');
    const wavePath = path.join(testDir, 'test.wav');
    const fakeTxtPath = path.join(testDir, 'fake.jpg');

    fs.writeFileSync(pngPath, pngBuffer);
    fs.writeFileSync(jpgPath, jpgBuffer);
    fs.writeFileSync(gifPath, gifBuffer);
    fs.writeFileSync(webpPath, webpBuffer);
    fs.writeFileSync(wavePath, waveBuffer);
    fs.writeFileSync(fakeTxtPath, fakeTxtBuffer);

    const isPngValid = upload.validateMagicBytes(pngPath);
    const isJpgValid = upload.validateMagicBytes(jpgPath);
    const isGifValid = upload.validateMagicBytes(gifPath);
    const isWebpValid = upload.validateMagicBytes(webpPath);
    const isWaveValid = upload.validateMagicBytes(wavePath);
    const isFakeTxtValid = upload.validateMagicBytes(fakeTxtPath);

    console.log('  - PNG Valid:', isPngValid ? '[PASS]' : '[FAIL]');
    console.log('  - JPG Valid:', isJpgValid ? '[PASS]' : '[FAIL]');
    console.log('  - GIF Valid:', isGifValid ? '[PASS]' : '[FAIL]');
    console.log('  - WEBP Valid:', isWebpValid ? '[PASS]' : '[FAIL]');
    console.log('  - Audio WAVE Rejected:', !isWaveValid ? '[PASS]' : '[FAIL]');
    console.log('  - Fake TXT Rejected:', !isFakeTxtValid ? '[PASS]' : '[FAIL]');

    // Clean up test files
    fs.rmSync(testDir, { recursive: true, force: true });

    if (!isPngValid || !isJpgValid || !isGifValid || !isWebpValid || isWaveValid || isFakeTxtValid) {
        console.error('[FAIL] ITEM 3 Magic Byte validation assertion failed!');
        process.exit(1);
    }

    // -------------------------------------------------------------
    // Item 5: Fail-Fast Startup Check for missing JWT_SECRET
    // -------------------------------------------------------------
    console.log('\n[ITEM 5] Testing Fail-Fast Startup Check for missing JWT_SECRET...');
    try {
        const envWithoutJwt = { ...process.env, JWT_SECRET: '' };
        execSync('node server.js', { env: envWithoutJwt, stdio: 'pipe' });
        console.error('[FAIL] ITEM 5 FAIL: Server started without JWT_SECRET!');
        process.exit(1);
    } catch (err) {
        const stderr = err.stderr ? err.stderr.toString() : '';
        if (stderr.includes('FATAL: JWT_SECRET is not set')) {
            console.log('  - Fail-fast check caught missing secret! Stderr output:');
            console.log('    ' + stderr.trim());
            console.log('  - Status: [PASS]');
        } else {
            console.error('[FAIL] ITEM 5 FAIL: Error occurred but stderr message mismatched:', stderr);
            process.exit(1);
        }
    }

    // Setup Test Users in Database (User A, User B, User C)
    console.log('\nSetting up test users for socket & API tests...');
    await runDbRun("DELETE FROM users WHERE username IN ('hard_user_a', 'hard_user_b', 'hard_user_c')");
    
    await runDbRun("INSERT INTO users (username, password_hash, live_typing_enabled) VALUES ('hard_user_a', 'hash', 1)");
    await runDbRun("INSERT INTO users (username, password_hash, live_typing_enabled) VALUES ('hard_user_b', 'hash', 1)");
    await runDbRun("INSERT INTO users (username, password_hash, live_typing_enabled) VALUES ('hard_user_c', 'hash', 1)");

    const userA = (await runDbQuery("SELECT * FROM users WHERE username='hard_user_a'"))[0];
    const userB = (await runDbQuery("SELECT * FROM users WHERE username='hard_user_b'"))[0];
    const userC = (await runDbQuery("SELECT * FROM users WHERE username='hard_user_c'"))[0];

    // Establish Friendship ONLY between A and B
    await runDbRun("DELETE FROM friendships WHERE requester_id IN (?, ?, ?) OR addressee_id IN (?, ?, ?)", [userA.id, userB.id, userC.id, userA.id, userB.id, userC.id]);
    await runDbRun("INSERT INTO friendships (requester_id, addressee_id, status) VALUES (?, ?, 'accepted')", [userA.id, userB.id]);

    const tokenA = jwt.sign({ id: userA.id, username: userA.username, token_version: 1 }, JWT_SECRET, { expiresIn: '1h' });
    const tokenB = jwt.sign({ id: userB.id, username: userB.username, token_version: 1 }, JWT_SECRET, { expiresIn: '1h' });
    const tokenC = jwt.sign({ id: userC.id, username: userC.username, token_version: 1 }, JWT_SECRET, { expiresIn: '1h' });

    console.log(`  - User A ID: ${userA.id}, User B ID: ${userB.id}, User C (Stranger) ID: ${userC.id}`);

    // Start Server for Live E2E Verification
    console.log('\nLaunching live backend server for E2E verification...');
    const serverProc = require('child_process').spawn('node', ['server.js'], { cwd: path.join(__dirname, '..') });

    await new Promise(res => setTimeout(res, 2500));

    try {
        // -------------------------------------------------------------
        // Item 4: Helmet Security Headers Test
        // -------------------------------------------------------------
        console.log('\n[ITEM 4] Testing Helmet Security Headers on Live Server...');
        const helmetHeaders = await new Promise((resolve) => {
            http.get('http://localhost:3000/auth/login', (res) => {
                resolve(res.headers);
            });
        });

        console.log('  - Response Headers:');
        console.log('    x-dns-prefetch-control:', helmetHeaders['x-dns-prefetch-control']);
        console.log('    x-frame-options:', helmetHeaders['x-frame-options']);
        console.log('    x-content-type-options:', helmetHeaders['x-content-type-options']);
        console.log('    strict-transport-security:', helmetHeaders['strict-transport-security']);

        if (helmetHeaders['x-dns-prefetch-control'] && helmetHeaders['x-frame-options']) {
            console.log('  - Status: [PASS] (Helmet headers present)');
        } else {
            console.error('[FAIL] ITEM 4 FAIL: Helmet headers missing!');
            serverProc.kill();
            process.exit(1);
        }

        // -------------------------------------------------------------
        // Item 2: Tracking Pixel Guard Test
        // -------------------------------------------------------------
        console.log('\n[ITEM 2] Testing Tracking Pixel Guard on Profile Update...');
        const axios = require('axios');
        const updateRes = await axios.put('http://localhost:3000/users/me/profile', {
            cover_photo: 'http://attacker.com/pixel.png',
            profile_picture: 'http://attacker.com/avatar.png',
            bio: 'Security Test Bio'
        }, {
            headers: { Authorization: `Bearer ${tokenA}` }
        });

        const updatedUserA = (await runDbQuery("SELECT * FROM users WHERE id=?", [userA.id]))[0];
        console.log('  - Sent cover_photo: "http://attacker.com/pixel.png"');
        console.log('  - Database stored cover_photo:', updatedUserA.cover_photo);
        console.log('  - Database stored profile_picture:', updatedUserA.profile_picture);

        if (updatedUserA.cover_photo !== 'http://attacker.com/pixel.png' && updatedUserA.profile_picture !== 'http://attacker.com/avatar.png') {
            console.log('  - Status: [PASS] (External tracking pixel URL rejected and IGNORED by DB!)');
        } else {
            console.error('[FAIL] ITEM 2 FAIL: Tracking pixel URL was saved to DB!');
            serverProc.kill();
            process.exit(1);
        }

        // -------------------------------------------------------------
        // Item 1: Live Typing Unauthorized Room Join & Eavesdropping Test
        // -------------------------------------------------------------
        console.log('\n[ITEM 1] Testing Live Typing Unauthorized Room Eavesdropping Prevention...');
        const computedRoomId = `chat_${Math.min(userA.id, userB.id)}_${Math.max(userA.id, userB.id)}`;

        const socketA = ioClient('http://localhost:3000', { auth: { token: tokenA }, extraHeaders: { Origin: 'http://localhost:5173' } });
        const socketB = ioClient('http://localhost:3000', { auth: { token: tokenB }, extraHeaders: { Origin: 'http://localhost:5173' } });
        const socketC = ioClient('http://localhost:3000', { auth: { token: tokenC }, extraHeaders: { Origin: 'http://localhost:5173' } });

        await Promise.all([
            new Promise(res => socketA.on('connect', res)),
            new Promise(res => socketB.on('connect', res)),
            new Promise(res => socketC.on('connect', res))
        ]);

        console.log('  - All 3 sockets connected (A, B, C)');

        let userBCaughtDraft = null;
        let userCCaughtDraft = null;

        socketB.on('peer_typing_draft', (data) => {
            userBCaughtDraft = data;
        });

        socketC.on('peer_typing_draft', (data) => {
            userCCaughtDraft = data;
        });

        // User A and B join room
        socketA.emit('join_room', { targetUserId: userB.id });
        socketB.emit('join_room', { targetUserId: userA.id });

        // User C (Attacker) tries to join chat_A_B by sending targetUserId: userA.id (not friends) or spoofing
        socketC.emit('join_room', { targetUserId: userA.id, roomId: computedRoomId });

        await new Promise(res => setTimeout(res, 500));

        // User A emits a typing draft
        console.log('  - User A emitting typing draft to User B ("Secret draft text from A")...');
        socketA.emit('typing_draft', { targetUserId: userB.id, draftText: "Secret draft text from A" });

        await new Promise(res => setTimeout(res, 600));

        console.log('  - User B received draft:', userBCaughtDraft ? `"${userBCaughtDraft.draftText}"` : 'NONE');
        console.log('  - User C (Attacker) received draft:', userCCaughtDraft ? `"${userCCaughtDraft.draftText}"` : 'NONE (BLOCKED)');

        if (userBCaughtDraft && userBCaughtDraft.draftText === "Secret draft text from A" && !userCCaughtDraft) {
            console.log('  - Status: [PASS] (User B received draft, User C was strictly blocked!)');
        } else {
            console.error('[FAIL] ITEM 1 FAIL: Eavesdropping test failed!');
            serverProc.kill();
            process.exit(1);
        }

        socketA.disconnect();
        socketB.disconnect();
        socketC.disconnect();

        serverProc.kill();
        console.log('\n================ ALL 5 AUDIT TESTS PASSED SUCCESSFULLY! ================');
        process.exit(0);

    } catch (err) {
        console.error('Test Execution Error:', err);
        serverProc.kill();
        process.exit(1);
    }
}

runHardeningTests();
