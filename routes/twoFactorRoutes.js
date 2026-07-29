const express = require('express');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const db = require('../config/database');
const { asyncHandler, checkOtpRateLimit, issueAuthToken } = require('../utils/authHelpers');

const router = express.Router();

// 1. Resend/Regenerate 2FA QR (Requires valid unexpired tempToken proof)
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
            { purpose: 'register_2fa_pending', username: decoded.username, email: decoded.email, passwordHash: decoded.passwordHash, tempSecret: secret.base32 },
            process.env.JWT_SECRET,
            { expiresIn: '10m' }
        );

        res.json({ message: "New 2FA setup generated", tempToken: newTempToken, qrCodeUrl, secretKey: secret.base32 });
    });
}));

// 2. Verify 2FA & Complete Register
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

        const initialTokenVersion = 1;
        const initialEmailVerified = decoded.email ? 1 : 0;

        db.run(
            "INSERT INTO users (username, password_hash, email, email_verified, token_version, two_factor_secret, two_factor_enabled) VALUES (?, ?, ?, ?, ?, ?, 1)",
            [decoded.username, decoded.passwordHash, decoded.email, initialEmailVerified, initialTokenVersion, decoded.tempSecret],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: "Username or Email already exists" });
                    throw err;
                }

                const userId = this.lastID;
                const { token, user: userPayload } = issueAuthToken({
                    id: userId,
                    username: decoded.username,
                    email: decoded.email,
                    token_version: initialTokenVersion
                });

                res.status(201).json({
                    message: "Registration & 2FA complete",
                    token,
                    user: userPayload
                });
            }
        );
    });
}));

// 3. Verify 2FA on Login
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

            const { token, user: userPayload } = issueAuthToken(user);
            res.json({
                message: "2FA Verification successful",
                token,
                user: userPayload
            });
        });
    });
}));

// 4. Reset Password Step 2 (Verify 2FA OTP for 2FA-enabled Users)
router.post('/reset-password-verify-2fa', asyncHandler(async (req, res) => {
    const { resetSessionToken, code } = req.body;
    if (!resetSessionToken || !code) {
        return res.status(400).json({ error: "Reset session token and OTP code required" });
    }

    const key = `reset_2fa_${resetSessionToken.slice(-20) || req.ip}`;
    const limitResult = await checkOtpRateLimit(key);
    if (limitResult.blocked) {
        return res.status(429).json({ error: "Too many failed attempts. Please try again in 10 minutes." });
    }

    jwt.verify(resetSessionToken, process.env.JWT_SECRET, async (err, decoded) => {
        if (err || decoded.purpose !== 'reset_2fa_pending') {
            return res.status(401).json({ error: "Invalid or expired password reset 2FA session" });
        }

        db.get("SELECT * FROM users WHERE id = ?", [decoded.userId], (err, user) => {
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

            // OTP verified! Update password, increment token_version to invalidate old sessions, and mark reset token used=1
            db.run(
                "UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?",
                [decoded.newPasswordHash, user.id],
                function(err) {
                    if (err) throw err;
                    db.run("UPDATE password_resets SET used = 1 WHERE token_hash = ?", [decoded.tokenHash], () => {
                        res.json({ message: "Password reset successful" });
                    });
                }
            );
        });
    });
}));

module.exports = router;
