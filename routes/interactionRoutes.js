const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticateToken, (req, res) => {
    const { post_id, type } = req.body;
    const userId = req.user.id;
    const io = req.app.get('io');

    if (!post_id || !type) return res.status(400).json({ error: "Post ID and interaction type required" });

    db.run("INSERT INTO interactions (post_id, user_id, type) VALUES (?, ?, ?)", [post_id, userId, type], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.status(400).json({ error: "Already interacted with this type" });
            }
            throw err;
        }
        
        const interactionId = this.lastID;
        io.emit('new_interaction', { id: interactionId, post_id, user_id: userId, type, username: req.user.username });
        
        db.get("SELECT user_id FROM posts WHERE id = ?", [post_id], (err, row) => {
            if (row && row.user_id !== userId) {
                db.run("INSERT INTO notifications (user_id, actor_id, type, target_id) VALUES (?, ?, 'like', ?)", [row.user_id, userId, post_id]);
                io.to(`user_${row.user_id}`).emit(`notification_${row.user_id}`, { msg: `${req.user.username} liked your post.`, type: 'like' });
            }
        });

        res.status(201).json({ message: "Interaction saved" });
    });
});

router.delete('/:postId/:type', authenticateToken, (req, res) => {
    const { postId, type } = req.params;
    db.run("DELETE FROM interactions WHERE post_id = ? AND user_id = ? AND type = ?", [postId, req.user.id, type], function(err) {
        if (err) throw err;
        res.json({ message: "Interaction removed" });
    });
});

module.exports = router;
