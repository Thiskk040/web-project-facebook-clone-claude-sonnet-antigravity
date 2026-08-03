const express = require('express');
const db = require('../config/database');
const upload = require('../config/upload');
const { authenticateToken } = require('../middleware/auth');
const { detectBait } = require('../utils/baitDetector');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
    const limit = parseInt(req.query.limit || '20', 10);
    const page = parseInt(req.query.page || '1', 10);
    const offset = (page - 1) * limit;

    db.all(`
        SELECT p.*, u.username, u.profile_picture,
               (SELECT COUNT(*) FROM interactions WHERE post_id = p.id AND type='like') as like_count,
               (SELECT COUNT(*) FROM interactions WHERE post_id = p.id AND type='like' AND user_id = ?) as has_liked,
               (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.user_id = ? OR p.user_id IN (
            SELECT addressee_id FROM friendships WHERE requester_id = ? AND status='accepted'
            UNION
            SELECT requester_id FROM friendships WHERE addressee_id = ? AND status='accepted'
        )
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
    `, [req.user.id, req.user.id, req.user.id, req.user.id, limit, offset], (err, rows) => {
        if (err) throw err;
        res.json(rows || []);
    });
});

router.post('/', authenticateToken, upload.single('image'), upload.validateImageMagicBytes, async (req, res) => {
    const { content } = req.body;
    const userId = req.user.id;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const io = req.app.get('io');

    if (!content && !imageUrl) return res.status(400).json({ error: "Content or image is required" });

    try {
        const bait = await detectBait(content);
        const baitScore = bait.score;
        const baitTranslation = bait.translations.join(', ');
        const baitRoasts = bait.roasts.join(' | ');

        db.run(
            "INSERT INTO posts (user_id, content, image_url, bait_score, bait_translation, bait_roasts) VALUES (?, ?, ?, ?, ?, ?)",
            [userId, content, imageUrl, baitScore, baitTranslation, baitRoasts],
            function(err) {
                if (err) {
                    console.error("DB Insert Error:", err.message);
                    return res.status(500).json({ error: "Database error" });
                }
                const postId = this.lastID;

                io.emit('new_post', {
                    id: postId,
                    user_id: userId,
                    username: req.user.username,
                    content,
                    image_url: imageUrl,
                    created_at: new Date().toISOString(),
                    bait_score: baitScore,
                    bait_translation: baitTranslation,
                    bait_roasts: baitRoasts
                });

                db.run(`INSERT INTO notifications (user_id, actor_id, type, target_id) SELECT id, ?, 'new_post', ? FROM users WHERE id != ?`, [userId, postId, userId]);

                const mentions = content ? content.match(/@(\w+)/g) : null;
                if (mentions) {
                    const usernames = [...new Set(mentions.map(m => m.substring(1)))];
                    const placeholders = usernames.map(() => '?').join(',');
                    db.all(`SELECT id, username FROM users WHERE username IN (${placeholders})`, usernames, (err, taggedUsers) => {
                        if (taggedUsers) {
                            taggedUsers.forEach(tu => {
                                db.run("INSERT INTO tags (post_id, tagged_user_id) VALUES (?, ?)", [postId, tu.id]);
                                db.run("INSERT INTO notifications (user_id, actor_id, type, target_id) VALUES (?, ?, 'tag', ?)", [tu.id, userId, postId]);
                                io.to(`user_${tu.id}`).emit(`notification_${tu.id}`, { msg: `${req.user.username} tagged you in a post.`, type: 'tag' });
                            });
                        }
                    });
                }

                res.status(201).json({ message: "Post created", postId });
            }
        );
    } catch (baitErr) {
        console.error("Bait detection error:", baitErr.message);
        res.status(500).json({ error: "Bait detection failed" });
    }
});

router.get('/:id/comments', authenticateToken, (req, res) => {
    db.all(`
        SELECT c.*, u.username 
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = ?
        ORDER BY c.created_at ASC
    `, [req.params.id], (err, rows) => {
        if (err) throw err;
        res.json(rows);
    });
});

router.delete('/:id', authenticateToken, (req, res) => {
    const postId = req.params.id;
    const io = req.app.get('io');
    
    db.run("DELETE FROM posts WHERE id = ? AND user_id = ?", [postId, req.user.id], function(err) {
        if (err) throw err;
        if (this.changes === 0) return res.status(403).json({ error: "Unauthorized or post not found" });
        db.run("DELETE FROM comments WHERE post_id = ?", [postId]);
        db.run("DELETE FROM interactions WHERE post_id = ?", [postId]);
        io.emit('post_deleted', { id: postId });
        res.json({ message: "Post deleted" });
    });
});

module.exports = router;
