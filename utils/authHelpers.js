const jwt = require('jsonwebtoken');
const db = require('../config/database');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Helper for Atomic Rate Limiting with sliding window reset across cluster workers
const checkRateLimit = (key, maxAttempts = 5, windowMs = 10 * 60 * 1000) => {
    return new Promise((resolve, reject) => {
        const now = Date.now();

        // Clean up expired records > 24 hours
        db.run(`DELETE FROM otp_attempts WHERE (? - first_attempt) > 86400000`, [now]);

        db.get(`SELECT key, attempts, first_attempt FROM otp_attempts WHERE key = ?`, [key], (err, row) => {
            if (err) return reject(err);

            if (!row) {
                db.run(`INSERT INTO otp_attempts (key, attempts, first_attempt) VALUES (?, 1, ?)`, [key, now], (err) => {
                    if (err) return reject(err);
                    return resolve({ blocked: false });
                });
            } else {
                const expired = (now - row.first_attempt) > windowMs;
                const newAttempts = expired ? 1 : row.attempts + 1;
                const newFirstAttempt = expired ? now : row.first_attempt;

                db.run(
                    `UPDATE otp_attempts SET attempts = ?, first_attempt = ? WHERE key = ?`,
                    [newAttempts, newFirstAttempt, key],
                    (err) => {
                        if (err) return reject(err);
                        if (newAttempts > maxAttempts && !expired) {
                            return resolve({ blocked: true });
                        }
                        return resolve({ blocked: false });
                    }
                );
            }
        });
    });
};

const checkOtpRateLimit = (key) => checkRateLimit(key, 5, 10 * 60 * 1000);

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
    checkRateLimit,
    checkOtpRateLimit,
    issueAuthToken
};
