const speakeasy = require('speakeasy');

const secret = process.argv[2];
if (!secret) {
    console.log("Usage: node generate_otp.js <BASE32_SECRET>");
    process.exit(1);
}

const token = speakeasy.totp({
    secret: secret.trim(),
    encoding: 'base32'
});

console.log(`Current Valid OTP for secret [${secret}]: ${token}`);
