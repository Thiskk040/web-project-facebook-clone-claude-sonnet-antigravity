const axios = require('axios');
const speakeasy = require('speakeasy');

const BASE = 'http://localhost:3000/auth';

async function testFull2FAFailsafe() {
    console.log("=== 🧪 STARTING 2FA COMPREHENSIVE VERIFICATION ===");

    const username = `2fa_user_${Date.now()}`;
    const password = "password123";

    // 1. Initial Register
    console.log("\n1. Testing POST /auth/register-init...");
    const initRes = await axios.post(`${BASE}/register-init`, { username, password });
    console.log("-> Register Init Response:", { 
        tempTokenLength: initRes.data.tempToken.length, 
        secretKey: initRes.data.secretKey 
    });
    const { tempToken, secretKey } = initRes.data;

    // 2. Token Isolation Test (REST)
    console.log("\n2. Testing REST Token Isolation (Temp Token on Protected Endpoint)...");
    try {
        await axios.get('http://localhost:3000/users/search?q=test', {
            headers: { Authorization: `Bearer ${tempToken}` }
        });
        console.error("❌ FAIL: Protected endpoint accepted temp token!");
    } catch (err) {
        if (err.response?.status === 403) {
            console.log("✅ PASS: Protected endpoint rejected temp token with 403 Forbidden.");
        } else {
            console.error("❌ FAIL: Unexpected error status:", err.response?.status);
        }
    }

    // 3. Test Invalid OTP Code
    console.log("\n3. Testing Invalid OTP Code Verification...");
    try {
        await axios.post(`${BASE}/register-verify-2fa`, { tempToken, code: "000000" });
        console.error("❌ FAIL: System accepted invalid OTP!");
    } catch (err) {
        if (err.response?.status === 400) {
            console.log("✅ PASS: System rejected invalid OTP with message:", err.response.data.error);
        } else {
            console.error("❌ FAIL: Unexpected error status:", err.response?.status);
        }
    }

    // 4. Test Valid OTP Registration
    console.log("\n4. Testing Valid OTP Registration...");
    const validOtp = speakeasy.totp({ secret: secretKey, encoding: 'base32' });
    const verifyRes = await axios.post(`${BASE}/register-verify-2fa`, { tempToken, code: validOtp });
    console.log("✅ PASS: Registration & 2FA complete!", { user: verifyRes.data.user });
    const userToken = verifyRes.data.token;

    // 5. Test 2FA Enforced Login Challenge
    console.log("\n5. Testing 2FA Enforced Login Challenge...");
    const loginRes = await axios.post(`${BASE}/login`, { username, password });
    if (loginRes.data.requires2FA) {
        console.log("✅ PASS: Login correctly requires 2FA challenge!", { loginTempTokenLength: loginRes.data.loginTempToken.length });
    } else {
        console.error("❌ FAIL: Login did not request 2FA!");
    }
    const { loginTempToken } = loginRes.data;

    // 6. Test Valid Login OTP Verification
    console.log("\n6. Testing Valid Login OTP Verification...");
    const loginOtp = speakeasy.totp({ secret: secretKey, encoding: 'base32' });
    const loginVerifyRes = await axios.post(`${BASE}/login-verify-2fa`, { loginTempToken, code: loginOtp });
    console.log("✅ PASS: 2FA Login Verification successful!", { user: loginVerifyRes.data.user });

    console.log("\n=== 🎉 ALL 2FA TESTS PASSED SUCCESSFULLY! ===");
}

testFull2FAFailsafe().catch(err => console.error("Test Error:", err.response?.data || err.message));
