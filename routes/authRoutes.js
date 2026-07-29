const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const db = require('../config/database');
const { asyncHandler, issueAuthToken } = require('../utils/authHelpers');

const router = express.Router();

// 1. Initial Register (Generates Secret + Temp Token + QR Code)
router.post('/register-init', asyncHandler(async (req, res) => {
    const { username, password, email } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });
    if (username.length < 3) return res.status(400).json({ error: "Username must be at least 3 characters" });
    if (password.length < 4) return res.status(400).json({ error: "Password must be at least 4 characters" });

    let formattedEmail = email ? email.trim().toLowerCase() : null;
    if (formattedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formattedEmail)) {
        return res.status(400).json({ error: "Invalid email format" });
    }

    db.get("SELECT id FROM users WHERE username = ?", [username], (err, existingUser) => {
        if (err) throw err;
        if (existingUser) return res.status(400).json({ error: "Username already exists" });

        if (formattedEmail) {
            db.get("SELECT id FROM users WHERE LOWER(email) = ? AND email IS NOT NULL AND email != ''", [formattedEmail], async (err, existingEmail) => {
                if (err) throw err;
                if (existingEmail) return res.status(400).json({ error: "Email already registered" });
                proceedWithInit();
            });
        } else {
            proceedWithInit();
        }

        async function proceedWithInit() {
            const hashedPassword = await bcrypt.hash(password, 10);
            const secret = speakeasy.generateSecret({ name: `glaze (${username})` });
            const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

            const tempToken = jwt.sign(
                { purpose: 'register_2fa_pending', username, email: formattedEmail, passwordHash: hashedPassword, tempSecret: secret.base32 },
                process.env.JWT_SECRET,
                { expiresIn: '10m' }
            );

            res.json({ message: "2FA setup initialized", tempToken, qrCodeUrl, secretKey: secret.base32 });
        }
    });
}));

// 2. Overhauled Login (Checks 2FA requirement)
router.post('/login', asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });

    db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
        if (err) throw err;
        if (!user) return res.status(400).json({ error: "Invalid credentials" });

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(400).json({ error: "Invalid credentials" });

        const tokenVersion = user.token_version || 1;

        if (user.two_factor_enabled) {
            const loginTempToken = jwt.sign(
                { purpose: 'login_2fa_pending', id: user.id, username: user.username, token_version: tokenVersion },
                process.env.JWT_SECRET,
                { expiresIn: '5m' }
            );
            return res.json({ requires2FA: true, loginTempToken });
        }

        const { token, user: userPayload } = issueAuthToken(user);
        res.json({
            message: "Logged in",
            token,
            user: userPayload
        });
    });
}));

module.exports = router;
