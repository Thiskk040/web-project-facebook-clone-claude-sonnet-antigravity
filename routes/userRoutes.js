const express = require('express');
const db = require('../config/database');
const upload = require('../config/upload');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/suggested', authenticateToken, (req, res) => {
    const userId = req.user.id;
    db.all(`
        SELECT id, username, profile_picture
        FROM users
        WHERE id != ? AND id NOT IN (
            SELECT addressee_id FROM friendships WHERE requester_id = ?
            UNION
            SELECT requester_id FROM friendships WHERE addressee_id = ?
        )
        LIMIT 5
    `, [userId, userId, userId], (err, rows) => {
        if (err) throw err;
        res.json(rows);
    });
});

router.get('/search', authenticateToken, (req, res) => {
    const query = req.query.q;
    const userId = req.user.id;
    if (!query) return res.json([]);
    
    db.all(`
        SELECT u.id, u.username, u.profile_picture,
            (SELECT status FROM friendships WHERE 
                (requester_id = u.id AND addressee_id = ?) OR 
                (requester_id = ? AND addressee_id = u.id)
            ) as friend_status
        FROM users u
        WHERE u.username LIKE ? AND u.id != ?
        LIMIT 15
    `, [userId, userId, `%${query}%`, userId], (err, rows) => {
        if (err) throw err;
        res.json(rows);
    });
});

router.get('/profile/:username', authenticateToken, (req, res) => {
    db.get("SELECT id, username, profile_picture, bio, cover_photo FROM users WHERE username = ?", [req.params.username], (err, user) => {
        if (err || !user) return res.status(404).json({ error: "User not found" });
        res.json(user);
    });
});

router.get('/:username/friends', authenticateToken, (req, res) => {
    db.get("SELECT id FROM users WHERE username = ?", [req.params.username], (err, targetUser) => {
        if (err || !targetUser) return res.json([]);
        db.all(`
            SELECT u.id, u.username, u.profile_picture 
            FROM users u
            JOIN friendships f ON (f.requester_id = u.id OR f.addressee_id = u.id)
            WHERE (f.requester_id = ? OR f.addressee_id = ?) 
              AND u.id != ? AND f.status = 'accepted'
        `, [targetUser.id, targetUser.id, targetUser.id], (err, rows) => {
            if (err) throw err;
            res.json(rows);
        });
    });
});

router.put('/me/profile', authenticateToken, upload.fields([{name: 'cover_photo', maxCount: 1}, {name: 'profile_picture', maxCount: 1}]), (req, res) => {
    const { bio } = req.body;
    let coverUrl = req.files && req.files['cover_photo'] ? `/uploads/${req.files['cover_photo'][0].filename}` : req.body.cover_photo;
    let avatarUrl = req.files && req.files['profile_picture'] ? `/uploads/${req.files['profile_picture'][0].filename}` : req.body.profile_picture;
    
    db.run("UPDATE users SET bio = COALESCE(?, bio), cover_photo = COALESCE(?, cover_photo), profile_picture = COALESCE(?, profile_picture) WHERE id = ?", [bio, coverUrl, avatarUrl, req.user.id], function(err) {
        if (err) return res.status(500).json({ error: "Update failed" });
        res.json({ message: "Profile updated", coverUrl, profile_picture: avatarUrl, bio });
    });
});

router.get('/:username/posts', authenticateToken, (req, res) => {
    db.all(`
        SELECT p.*, u.username, u.profile_picture,
        (SELECT COUNT(*) FROM interactions WHERE post_id = p.id AND type='like') as like_count,
        (SELECT COUNT(*) FROM interactions WHERE post_id = p.id AND type='like' AND user_id = ?) as has_liked,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
        FROM posts p JOIN users u ON p.user_id = u.id
        WHERE u.username = ?
        ORDER BY p.created_at DESC
    `, [req.user.id, req.params.username], (err, rows) => {
        if (err) throw err;
        res.json(rows || []);
    });
});

router.get('/:username/tagged_posts', authenticateToken, (req, res) => {
    db.all(`
        SELECT p.*, u.username, u.profile_picture,
        (SELECT COUNT(*) FROM interactions WHERE post_id = p.id AND type='like') as like_count,
        (SELECT COUNT(*) FROM interactions WHERE post_id = p.id AND type='like' AND user_id = ?) as has_liked,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
        FROM posts p 
        JOIN users u ON p.user_id = u.id
        JOIN tags t ON t.post_id = p.id
        JOIN users tu ON t.tagged_user_id = tu.id
        WHERE tu.username = ?
        ORDER BY p.created_at DESC
    `, [req.user.id, req.params.username], (err, rows) => {
        if (err) throw err;
        res.json(rows || []);
    });
});

module.exports = router;
