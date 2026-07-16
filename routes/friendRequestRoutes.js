const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticateToken, (req, res) => {
    const { addressee_id } = req.body;
    const requesterId = req.user.id;
    const io = req.app.get('io');

    if (!addressee_id || addressee_id === requesterId) return res.status(400).json({ error: "Invalid addressee ID" });

    db.run("INSERT INTO friendships (requester_id, addressee_id) VALUES (?, ?)", [requesterId, addressee_id], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.status(400).json({ error: "Friend request already exists" });
            }
            throw err;
        }
        
        io.to(`user_${addressee_id}`).emit(`friend_request_${addressee_id}`, { requester_id: requesterId, requester_username: req.user.username });
        db.run("INSERT INTO notifications (user_id, actor_id, type) VALUES (?, ?, 'friend_request')", [addressee_id, requesterId]);

        res.status(201).json({ message: "Friend request sent" });
    });
});

router.put('/accept', authenticateToken, (req, res) => {
    const { requester_id } = req.body;
    const addresseeId = req.user.id;
    const io = req.app.get('io');

    if (!requester_id) return res.status(400).json({ error: "Requester ID required" });

    db.run("UPDATE friendships SET status = 'accepted' WHERE requester_id = ? AND addressee_id = ?", [requester_id, addresseeId], function(err) {
        if (err) throw err;
        if (this.changes === 0) return res.status(404).json({ error: "Friend request not found" });
        
        io.to(`user_${requester_id}`).emit(`friend_accept_${requester_id}`, { addressee_id: addresseeId, addressee_username: req.user.username });
        db.run("INSERT INTO notifications (user_id, actor_id, type) VALUES (?, ?, 'friend_accept')", [requester_id, addresseeId]);
        io.to(`user_${requester_id}`).emit(`notification_${requester_id}`, { msg: `${req.user.username} accepted your friend request.`, type: 'friend_accept' });
        
        res.json({ message: "Friend request accepted" });
    });
});

router.put('/reject', authenticateToken, (req, res) => {
    const { requester_id } = req.body;
    const addresseeId = req.user.id;

    if (!requester_id) return res.status(400).json({ error: "Requester ID required" });

    db.run("DELETE FROM friendships WHERE requester_id = ? AND addressee_id = ?", [requester_id, addresseeId], function(err) {
        if (err) throw err;
        if (this.changes === 0) return res.status(404).json({ error: "Friend request not found" });
        res.json({ message: "Friend request rejected" });
    });
});

module.exports = router;
