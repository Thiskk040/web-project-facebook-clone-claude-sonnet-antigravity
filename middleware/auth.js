const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: "Access Denied" });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid Token" });
        if (user.purpose) return res.status(403).json({ error: "Token not valid for this action" });
        
        db.get("SELECT token_version FROM users WHERE id = ?", [user.id], (err, dbUser) => {
            if (err || !dbUser) return res.status(401).json({ error: "User session invalid" });
            if (user.token_version !== undefined && dbUser.token_version !== user.token_version) {
                return res.status(401).json({ error: "Session expired or revoked" });
            }
            req.user = user;
            next();
        });
    });
};

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { authenticateToken, asyncHandler };
