const express = require('express');
const crypto = require('crypto');
const db = require('../config/database');
const { asyncHandler } = require('../utils/authHelpers');

const router = express.Router();

// Verify Email Confirmation Token
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
