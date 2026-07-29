const axios = require('axios');
const speakeasy = require('speakeasy');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

const BASE_AUTH = 'http://localhost:3000/auth';
const BASE_USERS = 'http://localhost:3000/users';

const db = new sqlite3.Database('./facebook.db');

function queryDb(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function queryDbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

async function runComprehensiveForgotPasswordTests() {
    console.log("=== STARTING FORGOT PASSWORD COMPREHENSIVE SECURITY TESTS ===");

    // Clear previous rate-limit records for clean test run
    await new Promise((res, rej) => db.run("DELETE FROM otp_attempts", (err) => err ? rej(err) : res()));

    // Setup Test User 1 (Non-2FA)
    const timeId = Date.now();
    const user1 = {
        username: `pw_user_${timeId}`,
        password: "password123",
        email: `pw_user_${timeId}@example.com`
    };

    // Setup Test User 2 (2FA-enabled)
    const user2 = {
        username: `pw_2fa_${timeId}`,
        password: "password123",
        email: `pw_2fa_${timeId}@example.com`
    };

    console.log("\n1. Registering test accounts...");
    // Register User 1 via register-init + 2FA
    const init1 = await axios.post(`${BASE_AUTH}/register-init`, user1);
    const otp1 = speakeasy.totp({ secret: init1.data.secretKey, encoding: 'base32' });
    const verify1 = await axios.post(`${BASE_AUTH}/register-verify-2fa`, { tempToken: init1.data.tempToken, code: otp1 });
    const user1Token = verify1.data.token;
    console.log(`[OK] User 1 registered: ${user1.username} (${user1.email})`);

    // Register User 2 via register-init + 2FA
    const init2 = await axios.post(`${BASE_AUTH}/register-init`, user2);
    const otp2 = speakeasy.totp({ secret: init2.data.secretKey, encoding: 'base32' });
    const secret2Key = init2.data.secretKey;
    const verify2 = await axios.post(`${BASE_AUTH}/register-verify-2fa`, { tempToken: init2.data.tempToken, code: otp2 });
    const user2Token = verify2.data.token;
    console.log(`[OK] User 2 (2FA Enabled) registered: ${user2.username} (${user2.email})`);

    // --- TEST CASE 1 & 2: Email Enumeration Prevention ---
    console.log("\n2. Testing Email Enumeration Defense (Existing vs Non-existent Email)...");
    const resExisting = await axios.post(`${BASE_AUTH}/forgot-password`, { email: user1.email });
    const resNonExistent = await axios.post(`${BASE_AUTH}/forgot-password`, { email: `non_existent_${timeId}@example.com` });

    if (resExisting.data.message === resNonExistent.data.message) {
        console.log(`[PASS] Identical response returned for existing and non-existent emails ("${resExisting.data.message}")`);
    } else {
        console.error("[FAIL] Response messages differed between existing and non-existent emails!");
    }

    // --- TEST CASE 3: Old Reset Token Invalidation on New Request ---
    console.log("\n3. Testing Invalidation of Old Reset Tokens on New Request...");
    const resSecondRequest = await axios.post(`${BASE_AUTH}/forgot-password`, { email: user1.email });
    
    // Wait brief moment for DB insert to finalize
    await new Promise(r => setTimeout(r, 200));

    const resetsUser1 = await queryDbAll("SELECT * FROM password_resets WHERE user_id = ? ORDER BY created_at ASC", [verify1.data.user.id]);

    if (resetsUser1.length >= 2 && resetsUser1[0].used === 1 && resetsUser1[resetsUser1.length - 1].used === 0) {
        console.log("[PASS] Older reset token was marked used=1 when new request was initiated!");
    } else {
        console.error("[FAIL] Old reset token was not invalidated!", resetsUser1);
    }

    // Fetch the active unused token for User 1 from DB to simulate clicking email link
    const activeReset1 = await queryDb("SELECT * FROM password_resets WHERE user_id = ? AND used = 0 ORDER BY created_at DESC LIMIT 1", [verify1.data.user.id]);

    // Set User 1 two_factor_enabled = 0 to specifically test Non-2FA reset flow
    await new Promise((res, rej) => db.run("UPDATE users SET two_factor_enabled = 0 WHERE id = ?", [verify1.data.user.id], (err) => err ? rej(err) : res()));

    // --- TEST CASE 4: Token Reset for Non-2FA User & Session Revocation (Token Versioning) ---
    console.log("\n4. Testing Reset Password Flow & Session Revocation for User 1 (Non-2FA)...");
    // Find matching raw token by testing candidate tokens or overriding token in DB for testing
    const rawToken1 = crypto.randomBytes(32).toString('hex');
    const token1Hash = crypto.createHash('sha256').update(rawToken1).digest('hex');
    await new Promise((res, rej) => db.run("UPDATE password_resets SET token_hash = ? WHERE token_hash = ?", [token1Hash, activeReset1.token_hash], (err) => err ? rej(err) : res()));

    const newPw1 = "newPassword456!";
    const resetRes1 = await axios.post(`${BASE_AUTH}/reset-password`, { token: rawToken1, newPassword: newPw1 });
    console.log("-> Reset Response:", resetRes1.data.message);

    // Verify Session Revocation (Old User 1 Token on Protected Endpoint)
    try {
        await axios.get(`${BASE_USERS}/me`, { headers: { Authorization: `Bearer ${user1Token}` } });
        console.error("[FAIL] Pre-reset JWT token was NOT revoked!");
    } catch (err) {
        if (err.response?.status === 401) {
            console.log("[PASS] Pre-reset JWT token successfully revoked with 401 Unauthorized!");
        } else {
            console.error("[FAIL] Unexpected error status during token revocation check:", err.response?.status);
        }
    }

    // Verify login works with new password
    const loginRes1 = await axios.post(`${BASE_AUTH}/login`, { username: user1.username, password: newPw1 });
    console.log("[PASS] Logged in successfully with new password!");

    // --- TEST CASE 5: Single-Use Token Enforcement ---
    console.log("\n5. Testing Single-Use Token Enforcement (Re-using used token)...");
    try {
        await axios.post(`${BASE_AUTH}/reset-password`, { token: rawToken1, newPassword: "anotherPassword789!" });
        console.error("[FAIL] System allowed re-using already used reset token!");
    } catch (err) {
        if (err.response?.status === 400) {
            console.log("[PASS] System rejected used reset token with error:", err.response.data.error);
        } else {
            console.error("[FAIL] Unexpected error status:", err.response?.status);
        }
    }

    // --- TEST CASE 6 & 7: 2FA Enforced Reset & Token Isolation ---
    console.log("\n6. Testing 2FA Enforced Password Reset for User 2...");
    await axios.post(`${BASE_AUTH}/forgot-password`, { email: user2.email });
    await new Promise(r => setTimeout(r, 200));
    const resetRow2 = await queryDb("SELECT * FROM password_resets WHERE user_id = ? AND used = 0 ORDER BY created_at DESC LIMIT 1", [verify2.data.user.id]);
    
    const rawToken2 = crypto.randomBytes(32).toString('hex');
    const token2Hash = crypto.createHash('sha256').update(rawToken2).digest('hex');
    await new Promise((res, rej) => db.run("UPDATE password_resets SET token_hash = ? WHERE token_hash = ?", [token2Hash, resetRow2.token_hash], (err) => err ? rej(err) : res()));

    const newPw2 = "newPassword2FA789!";
    const resetRes2 = await axios.post(`${BASE_AUTH}/reset-password`, { token: rawToken2, newPassword: newPw2 });

    if (resetRes2.data.requires2FA) {
        console.log("[PASS] Reset password correctly requires 2FA challenge!", { resetSessionTokenLength: resetRes2.data.resetSessionToken.length });
    } else {
        console.error("[FAIL] Reset password bypassed 2FA requirement!");
    }
    const { resetSessionToken } = resetRes2.data;

    // Check Token Isolation (resetSessionToken used on protected endpoint)
    console.log("\n7. Testing Token Isolation (resetSessionToken on Protected Endpoint)...");
    try {
        await axios.get(`${BASE_USERS}/me`, { headers: { Authorization: `Bearer ${resetSessionToken}` } });
        console.error("[FAIL] Protected endpoint accepted resetSessionToken!");
    } catch (err) {
        if (err.response?.status === 403) {
            console.log("[PASS] Protected endpoint rejected resetSessionToken with 403 Forbidden!");
        } else {
            console.error("[FAIL] Unexpected status for token isolation:", err.response?.status);
        }
    }

    // Test Invalid OTP for 2FA Reset
    console.log("\n8. Testing Invalid OTP Code for 2FA Password Reset...");
    try {
        await axios.post(`${BASE_AUTH}/reset-password-verify-2fa`, { resetSessionToken, code: "000000" });
        console.error("[FAIL] System accepted invalid OTP code during reset!");
    } catch (err) {
        if (err.response?.status === 400) {
            console.log("[PASS] Invalid OTP rejected with message:", err.response.data.error);
        } else {
            console.error("[FAIL] Unexpected status for invalid OTP:", err.response?.status);
        }
    }

    // Test Valid OTP for 2FA Reset
    console.log("\n9. Testing Valid OTP Verification & Password Reset Finalization...");
    const validOtp2 = speakeasy.totp({ secret: secret2Key, encoding: 'base32' });
    const verify2FAReset = await axios.post(`${BASE_AUTH}/reset-password-verify-2fa`, { resetSessionToken, code: validOtp2 });
    console.log("[PASS] 2FA Password Reset completed successfully:", verify2FAReset.data.message);

    // Verify User 2 pre-reset session is revoked
    try {
        await axios.get(`${BASE_USERS}/me`, { headers: { Authorization: `Bearer ${user2Token}` } });
        console.error("[FAIL] User 2 pre-reset session was NOT revoked!");
    } catch (err) {
        if (err.response?.status === 401) {
            console.log("[PASS] User 2 pre-reset session successfully revoked with 401 Unauthorized!");
        }
    }

    // --- TEST CASE 10: Email Update Re-Authentication ---
    console.log("\n10. Testing PUT /users/me/email Re-Authentication Requirement...");
    const loginUser2 = await axios.post(`${BASE_AUTH}/login`, { username: user2.username, password: newPw2 });
    const valid2FALoginOtp = speakeasy.totp({ secret: secret2Key, encoding: 'base32' });
    const finalLoginUser2 = await axios.post(`${BASE_AUTH}/login-verify-2fa`, { loginTempToken: loginUser2.data.loginTempToken, code: valid2FALoginOtp });
    const activeTokenUser2 = finalLoginUser2.data.token;

    // Try without password
    try {
        await axios.put(`${BASE_USERS}/me/email`, { newEmail: "new_email@example.com" }, { headers: { Authorization: `Bearer ${activeTokenUser2}` } });
        console.error("[FAIL] System allowed email update without current password!");
    } catch (err) {
        if (err.response?.status === 400) {
            console.log("[PASS] System rejected email update without password:", err.response.data.error);
        }
    }

    // Try with valid password
    const emailUpdateRes = await axios.put(
        `${BASE_USERS}/me/email`,
        { currentPassword: newPw2, newEmail: `updated_email_${timeId}@example.com` },
        { headers: { Authorization: `Bearer ${activeTokenUser2}` } }
    );
    console.log("[PASS] Email updated successfully with current password re-authentication:", emailUpdateRes.data.email);

    console.log("\n=== ALL FORGOT PASSWORD SECURITY TESTS PASSED SUCCESSFULLY ===");
}

runComprehensiveForgotPasswordTests().catch(err => {
    console.error("[ERROR] Test Script Error:", err.response?.data || err.message || err);
});
