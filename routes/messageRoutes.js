const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/conversations', authenticateToken, (req, res) => {
    db.all(`
        SELECT u.id, u.username, u.profile_picture, m.content as last_message, m.created_at, m.is_read, m.sender_id
        FROM users u
        JOIN messages m ON m.id = (
            SELECT id FROM messages 
            WHERE (sender_id = u.id AND receiver_id = ?) OR (sender_id = ? AND receiver_id = u.id)
            ORDER BY created_at DESC LIMIT 1
        )
        WHERE u.id != ?
        ORDER BY m.created_at DESC
    `, [req.user.id, req.user.id, req.user.id], (err, rows) => {
        if (err) throw err;
        res.json(rows);
    });
});

router.get('/unread/count', authenticateToken, (req, res) => {
    db.get(`
        SELECT COUNT(*) as count FROM messages 
        WHERE receiver_id = ? AND is_read = 0
    `, [req.user.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ count: row ? row.count : 0 });
    });
});

router.get('/:userId', authenticateToken, (req, res) => {
    db.all(`
        SELECT * FROM messages 
        WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
        ORDER BY created_at ASC
    `, [req.user.id, req.params.userId, req.params.userId, req.user.id], (err, rows) => {
        if (err) throw err;
        
        if (rows && rows.length > 0) {
            const lastMsg = rows[rows.length - 1];
            if (lastMsg.sender_id === req.user.id && lastMsg.is_read === 1) {
                const createdTime = new Date(lastMsg.created_at);
                const hours = (new Date() - createdTime) / (1000 * 60 * 60);
                lastMsg.hours_since_seen = hours;
            }
        }

        db.run("UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ?", [req.params.userId, req.user.id]);
        res.json(rows);
    });
});

router.post('/', authenticateToken, (req, res) => {
    const { receiver_id, content } = req.body;
    const io = req.app.get('io');
    if (!receiver_id || !content) return res.status(400).json({ error: "Missing fields" });
    
    db.run("INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)", [req.user.id, receiver_id, content], function(err) {
        if (err) throw err;
        const msg = { id: this.lastID, sender_id: req.user.id, receiver_id: parseInt(receiver_id), content, is_read: 0, created_at: new Date().toISOString() };
        io.to(`user_${receiver_id}`).emit(`new_message_${receiver_id}`, msg);
        if (parseInt(receiver_id) !== parseInt(req.user.id)) {
            io.to(`user_${req.user.id}`).emit(`new_message_${req.user.id}`, msg);
        }
        res.status(201).json(msg);
    });
});

module.exports = router;
