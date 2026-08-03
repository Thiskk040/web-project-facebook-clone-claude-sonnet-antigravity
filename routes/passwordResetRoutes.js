const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/database');
const { asyncHandler, checkOtpRateLimit } = require('../utils/authHelpers');
const { sendResetPasswordEmail } = require('../utils/mailer');

const router = express.Router();

// 1. Request Password Reset (Forgot Password)
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

    db.get("SELECT id, username, email, email_verified, two_factor_enabled FROM users WHERE LOWER(email) = ?", [cleanEmail], (err, user) => {
        if (err) throw err;

        if (user && !user.email_verified) {
            // Unverified email: return UNIFORM_MESSAGE without sending email
            setImmediate(() => {
                crypto.createHash('sha256').update('dummy_enumeration_defense').digest('hex');
            });
            return res.json({ message: UNIFORM_MESSAGE });
        }

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

// 2. Reset Password Step 1 (Validate Token + Enforce 2FA if enabled)
router.post('/reset-password', asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
        return res.status(400).json({ error: "Reset token and new password required" });
    }
    if (newPassword.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
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

module.exports = router;
