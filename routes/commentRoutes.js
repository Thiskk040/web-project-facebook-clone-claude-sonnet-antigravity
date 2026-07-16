const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticateToken, (req, res) => {
    const { post_id, content } = req.body;
    const userId = req.user.id;
    const io = req.app.get('io');

    if (!post_id || !content) return res.status(400).json({ error: "Post ID and content required" });

    db.run("INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)", [post_id, userId, content], function(err) {
        if (err) throw err;
        const commentId = this.lastID;
        io.emit('new_comment', { id: commentId, post_id, user_id: userId, content, username: req.user.username });
        
        db.get("SELECT user_id FROM posts WHERE id = ?", [post_id], (err, row) => {
            if (row && row.user_id !== userId) {
                db.run("INSERT INTO notifications (user_id, actor_id, type, target_id) VALUES (?, ?, 'comment', ?)", [row.user_id, userId, post_id]);
                io.to(`user_${row.user_id}`).emit(`notification_${row.user_id}`, { msg: `${req.user.username} commented on your post.`, type: 'comment' });
            }
        });

        res.status(201).json({ message: "Comment created", commentId });
    });
});

router.delete('/:id', authenticateToken, (req, res) => {
    db.run("DELETE FROM comments WHERE id = ? AND user_id = ?", [req.params.id, req.user.id], function(err) {
        if (err) throw err;
        if (this.changes === 0) return res.status(403).json({ error: "Unauthorized or not found" });
        res.json({ message: "Comment deleted" });
    });
});

module.exports = router;
