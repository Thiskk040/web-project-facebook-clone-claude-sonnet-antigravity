const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const db = require('../config/database');
const { asyncHandler } = require('../middleware/auth');
const { sendResetPasswordEmail, sendEmailVerificationEmail } = require('../utils/mailer');

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
            { purpose: 'register_2fa_pending', username: decoded.username, email: decoded.email, passwordHash: decoded.passwordHash, tempSecret: secret.base32 },
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
                const token = jwt.sign(
                    { id: userId, username: decoded.username, email: decoded.email, token_version: initialTokenVersion },
                    process.env.JWT_SECRET,
                    { expiresIn: '24h' }
                );
                res.status(201).json({
                    message: "Registration & 2FA complete",
                    token,
                    user: { id: userId, username: decoded.username, email: decoded.email, token_version: initialTokenVersion }
                });
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

        const tokenVersion = user.token_version || 1;

        if (user.two_factor_enabled) {
            const loginTempToken = jwt.sign(
                { purpose: 'login_2fa_pending', id: user.id, username: user.username, token_version: tokenVersion },
                process.env.JWT_SECRET,
                { expiresIn: '5m' }
            );
            return res.json({ requires2FA: true, loginTempToken });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email, token_version: tokenVersion },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        res.json({
            message: "Logged in",
            token,
            user: { id: user.id, username: user.username, email: user.email, token_version: tokenVersion }
        });
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

            const tokenVersion = user.token_version || 1;
            const token = jwt.sign(
                { id: user.id, username: user.username, email: user.email, token_version: tokenVersion },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );
            res.json({
                message: "2FA Verification successful",
                token,
                user: { id: user.id, username: user.username, email: user.email, token_version: tokenVersion }
            });
        });
    });
}));

// 6. Request Password Reset (Forgot Password)
router.post('/forgot-password', asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email || !email.trim()) {
        return res.status(400).json({ error: "Email is required" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const key = `forgot_pw_${cleanEmail}_${req.ip || 'client'}`;
    const limitResult = await checkOtpRateLimit(key);
    if (limitResult.blocked) {
        return res.status(429).json({ error: "Too many reset requests for this email. Please try again in 10 minutes." });
    }

    const UNIFORM_MESSAGE = "If that email exists, a reset link has been sent.";

    db.get("SELECT id, username, email, two_factor_enabled FROM users WHERE LOWER(email) = ?", [cleanEmail], (err, user) => {
        if (err) throw err;

        if (user) {
            // Invalidate older unused tokens for this user
            db.run("UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0", [user.id], () => {
                const rawToken = crypto.randomBytes(32).toString('hex');
                const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
                const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

                db.run(
                    "INSERT INTO password_resets (token_hash, user_id, expires_at, used, ip_address, user_agent, created_at) VALUES (?, ?, ?, 0, ?, ?, ?)",
                    [tokenHash, user.id, expiresAt, req.ip || '', req.headers['user-agent'] || '', Date.now()],
                    (err) => {
                        if (err) console.error("[ForgotPW DB Error]", err);
                        // Async non-blocking email sending for constant timing
                        setImmediate(() => {
                            sendResetPasswordEmail(user.email, rawToken).catch(err => console.error("[ForgotPW Mailer Error]", err));
                        });
                        return res.json({ message: UNIFORM_MESSAGE });
                    }
                );
            });
        } else {
            // Dummy work to maintain timing alignment against enumeration attacks
            setImmediate(() => {
                crypto.createHash('sha256').update('dummy_enumeration_defense').digest('hex');
            });
            return res.json({ message: UNIFORM_MESSAGE });
        }
    });
}));

// 7. Reset Password Step 1 (Validate Token + Enforce 2FA if enabled)
router.post('/reset-password', asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
        return res.status(400).json({ error: "Reset token and new password required" });
    }
    if (newPassword.length < 4) {
        return res.status(400).json({ error: "Password must be at least 4 characters" });
    }

    const key = `reset_pw_${req.ip || 'client'}`;
    const limitResult = await checkOtpRateLimit(key);
    if (limitResult.blocked) {
        return res.status(429).json({ error: "Too many attempts. Please try again in 10 minutes." });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const now = Date.now();

    db.get("SELECT * FROM password_resets WHERE token_hash = ? AND used = 0 AND expires_at > ?", [tokenHash, now], async (err, resetRow) => {
        if (err) throw err;
        if (!resetRow) {
            return res.status(400).json({ error: "Invalid or expired reset token" });
        }

        db.get("SELECT * FROM users WHERE id = ?", [resetRow.user_id], async (err, user) => {
            if (err) throw err;
            if (!user) return res.status(400).json({ error: "User associated with token not found" });

            const newPasswordHash = await bcrypt.hash(newPassword, 10);

            if (user.two_factor_enabled) {
                // Return 2FA challenge WITHOUT marking used=1 yet
                const resetSessionToken = jwt.sign(
                    { purpose: 'reset_2fa_pending', userId: user.id, tokenHash, newPasswordHash },
                    process.env.JWT_SECRET,
                    { expiresIn: '5m' }
                );
                return res.json({ requires2FA: true, resetSessionToken });
            }

            // Non-2FA User: Complete Password Reset immediately & increment token_version for session invalidation
            db.run(
                "UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?",
                [newPasswordHash, user.id],
                function(err) {
                    if (err) throw err;
                    db.run("UPDATE password_resets SET used = 1 WHERE token_hash = ?", [tokenHash], () => {
                        res.json({ message: "Password reset successful" });
                    });
                }
            );
        });
    });
}));

// 8. Reset Password Step 2 (Verify 2FA OTP for 2FA-enabled Users)
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

// 9. Verify Email Confirmation Token
router.get('/verify-email', asyncHandler(async (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: "Token required" });

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const now = Date.now();

    db.get("SELECT * FROM email_verifications WHERE token_hash = ? AND used = 0 AND expires_at > ?", [tokenHash, now], (err, row) => {
        if (err) throw err;
        if (!row) return res.status(400).json({ error: "Invalid or expired verification token" });

        db.run("UPDATE users SET email = ?, email_verified = 1 WHERE id = ?", [row.email, row.user_id], (err) => {
            if (err) throw err;
            db.run("UPDATE email_verifications SET used = 1 WHERE token_hash = ?", [tokenHash], () => {
                res.json({ message: "Email successfully verified!" });
            });
        });
    });
}));

module.exports = router;
