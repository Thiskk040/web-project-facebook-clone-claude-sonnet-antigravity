const jwt = require('jsonwebtoken');
const db = require('../config/database');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

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

function issueAuthToken(user) {
    const tokenVersion = user.token_version || 1;
    const payload = {
        id: user.id,
        username: user.username,
        email: user.email,
        token_version: tokenVersion
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
    return { token, user: payload };
}

module.exports = {
    asyncHandler,
    checkOtpRateLimit,
    issueAuthToken
};
