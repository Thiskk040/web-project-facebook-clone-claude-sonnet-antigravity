const axios = require('axios');
const speakeasy = require('speakeasy');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = require('../config/database');

const baseUrl = 'http://localhost:3000';

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

async function registerUser(userData) {
    const initRes = await axios.post(`${baseUrl}/auth/register-init`, userData);
    const { tempToken, secretKey } = initRes.data;
    const code = speakeasy.totp({ secret: secretKey, encoding: 'base32' });
    const verifyRes = await axios.post(`${baseUrl}/auth/register-verify-2fa`, { tempToken, code });
    return verifyRes.data;
}

async function runPart1Verification() {
    console.log("==================================================");
    console.log("Starting Part 1: Email Verification Fix Audit");
    console.log("==================================================\n");

    const timestamp = Date.now();
    const testUser = {
        username: `verify_user_${timestamp}`,
        password: 'Password123!',
        email: `initial_${timestamp}@test.com`
    };

    // Clean up test users
    await runDbRun("DELETE FROM users WHERE username = ?", [testUser.username]);

    // 1. Register User
    console.log("1. Registering test user...");
    const authData = await registerUser(testUser);
    const { token, user } = authData;
    console.log(`[PASS] Registered user ID: ${user.id}`);

    // Start live backend server if not running, or test directly
    // 2. Update email via PUT /me/email
    console.log("\n2. Updating email via PUT /me/email...");
    const newEmail = `unverified_${timestamp}@example.com`;
    const updateRes = await axios.put(`${baseUrl}/users/me/email`, {
        newEmail,
        currentPassword: testUser.password
    }, {
        headers: { Authorization: `Bearer ${token}` }
    });

    console.log("  - API Response:", updateRes.data);

    // Verify DB state for user (email_verified should be 0)
    const dbUserAfterUpdate = (await runDbQuery("SELECT * FROM users WHERE id = ?", [user.id]))[0];
    console.log(`  - DB email: ${dbUserAfterUpdate.email}, email_verified: ${dbUserAfterUpdate.email_verified}`);

    if (dbUserAfterUpdate.email_verified === 0 && dbUserAfterUpdate.email === newEmail) {
        console.log("[PASS] TEST A PASSED: email_verified is 0 after email update.");
    } else {
        console.error("[FAIL] TEST A FAILED: email_verified was not 0!", dbUserAfterUpdate);
        process.exit(1);
    }

    // Check email_verifications table for token
    const verifyRow = (await runDbQuery("SELECT * FROM email_verifications WHERE user_id = ? AND used = 0 ORDER BY created_at DESC", [user.id]))[0];
    if (!verifyRow || verifyRow.email !== newEmail) {
        console.error("[FAIL] TEST A FAILED: No valid token row in email_verifications table!", verifyRow);
        process.exit(1);
    }
    console.log("  - Verification token hash created in DB for email:", verifyRow.email);

    // 3. Test forgot-password with UNVERIFIED email
    console.log("\n3. Testing POST /auth/forgot-password with UNVERIFIED email...");
    const countBefore = (await runDbQuery("SELECT COUNT(*) as cnt FROM password_resets WHERE user_id = ?", [user.id]))[0].cnt;
    
    const forgotRes = await axios.post(`${baseUrl}/auth/forgot-password`, { email: newEmail });
    console.log("  - API Response:", forgotRes.data);

    const countAfter = (await runDbQuery("SELECT COUNT(*) as cnt FROM password_resets WHERE user_id = ?", [user.id]))[0].cnt;
    console.log(`  - password_resets count before: ${countBefore}, after: ${countAfter}`);

    if (countAfter === countBefore) {
        console.log("[PASS] TEST C PASSED: forgot-password ignored unverified email (0 new password_resets entry).");
    } else {
        console.error("[FAIL] TEST C FAILED: password_resets entry was created for unverified email!");
        process.exit(1);
    }

    // 4. Test normal login even when email_verified = 0
    console.log("\n4. Testing login for user with unverified email...");
    const loginRes = await axios.post(`${baseUrl}/auth/login`, {
        username: testUser.username,
        password: testUser.password
    });
    if (loginRes.data.requires2FA || loginRes.data.token) {
        console.log("[PASS] TEST D PASSED: User with email_verified = 0 can still login normally.");
    } else {
        console.error("[FAIL] TEST D FAILED: Login failed for unverified email user!", loginRes.data);
        process.exit(1);
    }

    // 5. Simulate clicking email verification link
    console.log("\n5. Simulating email verification click GET /auth/verify-email...");
    // We get the rawToken by fetching or testing tokenHash
    // In our test, let's query the DB and update directly or test via token
    // Since rawToken is sent in email, let's verify GET /auth/verify-email endpoint using a test token:
    const testRawToken = 'test_raw_token_' + timestamp;
    const crypto = require('crypto');
    const testHash = crypto.createHash('sha256').update(testRawToken).digest('hex');

    await runDbRun(
        "INSERT INTO email_verifications (token_hash, user_id, email, expires_at, used, created_at) VALUES (?, ?, ?, ?, 0, ?)",
        [testHash, user.id, newEmail, Date.now() + 86400000, Date.now()]
    );

    const verifyClickRes = await axios.get(`${baseUrl}/auth/verify-email?token=${testRawToken}`);
    console.log("  - Verification API Response:", verifyClickRes.data);

    const dbUserAfterVerify = (await runDbQuery("SELECT * FROM users WHERE id = ?", [user.id]))[0];
    console.log(`  - DB email_verified after click: ${dbUserAfterVerify.email_verified}`);

    if (dbUserAfterVerify.email_verified === 1) {
        console.log("[PASS] TEST B PASSED: email_verified set to 1 after verification link clicked.");
    } else {
        console.error("[FAIL] TEST B FAILED: email_verified was not set to 1!", dbUserAfterVerify);
        process.exit(1);
    }

    console.log("\n==================================================");
    console.log("ALL PART 1 EMAIL VERIFICATION TESTS PASSED!");
    console.log("==================================================");
}

// Start backend briefly if needed or run tests
runPart1Verification().catch(err => {
    console.error("[FAIL] Script error:", err.response ? err.response.data : err.message);
    process.exit(1);
});
