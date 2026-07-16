const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/pending', authenticateToken, (req, res) => {
    db.all(`
        SELECT f.requester_id as id, u.username, u.profile_picture, f.created_at
        FROM friendships f
        JOIN users u ON f.requester_id = u.id
        WHERE f.addressee_id = ? AND f.status = 'pending'
    `, [req.user.id], (err, rows) => {
        if (err) throw err;
        res.json(rows);
    });
});

module.exports = router;
