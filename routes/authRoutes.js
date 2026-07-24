const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const db = require('../config/database');
const { asyncHandler } = require('../middleware/auth');

const router = express.Router();

// Helper for Atomic Rate Limiting with sliding window reset across cluster workers
const checkOtpRateLimit = (key) => {
    return new Promise((resolve, reject) => {
        const now = Date.now();
        const windowMs = 10 * 60 * 1000; // 10 minutes
        const maxAttempts = 5;

        // Clean up expired records > 24 hours
        db.run(`DELETE FROM otp_attempts WHERE (? - first_attempt) > 86400000`, [now]);

        // Atomic Upsert with Sliding Window Reset
        const upsertSql = `
            INSERT INTO otp_attempts (key, attempts, first_attempt) VALUES (?, 1, ?)
            ON CONFLICT(key) DO UPDATE SET
                attempts = CASE
                    WHEN (? - first_attempt) > ? THEN 1
                    ELSE attempts + 1
                END,
                first_attempt = CASE
                    WHEN (? - first_attempt) > ? THEN ?
                    ELSE first_attempt
                END
        `;

        db.run(upsertSql, [key, now, now, windowMs, now, windowMs, now], function(err) {
            if (err) return reject(err);

            db.get(`SELECT attempts, first_attempt FROM otp_attempts WHERE key = ?`, [key], (err, row) => {
                if (err) return reject(err);
                if (row && row.attempts > maxAttempts && (now - row.first_attempt) <= windowMs) {
                    return resolve({ blocked: true });
                }
                return resolve({ blocked: false });
            });
        });
    });
};

// 1. Initial Register (Generates Secret + Temp Token + QR Code)
router.post('/register-init', asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });
    if (username.length < 3) return res.status(400).json({ error: "Username must be at least 3 characters" });
    if (password.length < 4) return res.status(400).json({ error: "Password must be at least 4 characters" });

    db.get("SELECT id FROM users WHERE username = ?", [username], async (err, existingUser) => {
        if (err) throw err;
        if (existingUser) return res.status(400).json({ error: "Username already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const secret = speakeasy.generateSecret({ name: `glaze (${username})` });
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

        const tempToken = jwt.sign(
            { purpose: 'register_2fa_pending', username, passwordHash: hashedPassword, tempSecret: secret.base32 },
            process.env.JWT_SECRET,
            { expiresIn: '10m' }
        );

        res.json({ message: "2FA setup initialized", tempToken, qrCodeUrl, secretKey: secret.base32 });
    });
}));

// 2. Resend/Regenerate 2FA QR (Requires valid unexpired tempToken proof)
router.post('/register-resend-2fa', asyncHandler(async (req, res) => {
    const { tempToken } = req.body;
    if (!tempToken) return res.status(400).json({ error: "Temporary token required for 2FA resend" });

    jwt.verify(tempToken, process.env.JWT_SECRET, async (err, decoded) => {
        if (err || decoded.purpose !== 'register_2fa_pending') {
            return res.status(401).json({ error: "Session expired. Please restart registration." });
        }

        const secret = speakeasy.generateSecret({ name: `glaze (${decoded.username})` });
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

        const newTempToken = jwt.sign(
            { purpose: 'register_2fa_pending', username: decoded.username, passwordHash: decoded.passwordHash, tempSecret: secret.base32 },
            process.env.JWT_SECRET,
            { expiresIn: '10m' }
        );

        res.json({ message: "New 2FA setup generated", tempToken: newTempToken, qrCodeUrl, secretKey: secret.base32 });
    });
}));

// 3. Verify 2FA & Complete Register
router.post('/register-verify-2fa', asyncHandler(async (req, res) => {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) return res.status(400).json({ error: "Temporary token and OTP code required" });

    const key = tempToken || req.ip;
    const limitResult = await checkOtpRateLimit(key);
    if (limitResult.blocked) {
        return res.status(429).json({ error: "Too many failed attempts. Please try again in 10 minutes." });
    }

    jwt.verify(tempToken, process.env.JWT_SECRET, async (err, decoded) => {
        if (err || decoded.purpose !== 'register_2fa_pending') {
            return res.status(401).json({ error: "Invalid or expired registration session" });
        }

        const verified = speakeasy.totp.verify({
            secret: decoded.tempSecret,
            encoding: 'base32',
            token: code.trim(),
            window: 1
        });

        if (!verified) {
            return res.status(400).json({ error: "Invalid 2FA code. Please check your Authenticator app." });
        }

        db.run(
            "INSERT INTO users (username, password_hash, two_factor_secret, two_factor_enabled) VALUES (?, ?, ?, 1)",
            [decoded.username, decoded.passwordHash, decoded.tempSecret],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: "Username already exists" });
                    throw err;
                }

                const userId = this.lastID;
                const token = jwt.sign({ id: userId, username: decoded.username }, process.env.JWT_SECRET, { expiresIn: '24h' });
                res.status(201).json({ message: "Registration & 2FA complete", token, user: { id: userId, username: decoded.username } });
            }
        );
    });
}));

// 4. Overhauled Login (Checks 2FA requirement)
router.post('/login', asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });

    db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
        if (err) throw err;
        if (!user) return res.status(400).json({ error: "Invalid credentials" });

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(400).json({ error: "Invalid credentials" });

        if (user.two_factor_enabled) {
            const loginTempToken = jwt.sign(
                { purpose: 'login_2fa_pending', id: user.id, username: user.username },
                process.env.JWT_SECRET,
                { expiresIn: '5m' }
            );
            return res.json({ requires2FA: true, loginTempToken });
        }

        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({ message: "Logged in", token, user: { id: user.id, username: user.username } });
    });
}));

// 5. Verify 2FA on Login
router.post('/login-verify-2fa', asyncHandler(async (req, res) => {
    const { loginTempToken, code } = req.body;
    if (!loginTempToken || !code) return res.status(400).json({ error: "Login session token and OTP code required" });

    const key = loginTempToken || req.ip;
    const limitResult = await checkOtpRateLimit(key);
    if (limitResult.blocked) {
        return res.status(429).json({ error: "Too many failed attempts. Please try again in 10 minutes." });
    }

    jwt.verify(loginTempToken, process.env.JWT_SECRET, async (err, decoded) => {
        if (err || decoded.purpose !== 'login_2fa_pending') {
            return res.status(401).json({ error: "Invalid or expired 2FA login session" });
        }

        db.get("SELECT * FROM users WHERE id = ?", [decoded.id], (err, user) => {
            if (err) throw err;
            if (!user || !user.two_factor_secret) return res.status(400).json({ error: "User 2FA configuration error" });

            const verified = speakeasy.totp.verify({
                secret: user.two_factor_secret,
                encoding: 'base32',
                token: code.trim(),
                window: 1
            });

            if (!verified) {
                return res.status(400).json({ error: "Invalid 2FA code. Please check your Authenticator app." });
            }

            const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '24h' });
            res.json({ message: "2FA Verification successful", token, user: { id: user.id, username: user.username } });
        });
    });
}));

module.exports = router;
