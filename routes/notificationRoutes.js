const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
    db.all(`
        SELECT n.*, u.username as actor_username, u.profile_picture as actor_profile_picture
        FROM notifications n
        JOIN users u ON n.actor_id = u.id
        WHERE n.user_id = ?
        ORDER BY n.created_at DESC
        LIMIT 20
    `, [req.user.id], (err, rows) => {
        if (err) throw err;
        res.json(rows);
    });
});

router.put('/:id/read', authenticateToken, (req, res) => {
    db.run("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?", [req.params.id, req.user.id], function(err) {
        if (err) throw err;
        if (this.changes === 0) return res.status(403).json({ error: "Unauthorized or not found" });
        res.json({ message: "Marked as read" });
    });
});

module.exports = router;
