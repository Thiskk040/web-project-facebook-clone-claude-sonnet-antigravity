const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/database');
const upload = require('../config/upload');
const { authenticateToken } = require('../middleware/auth');
const { sendEmailVerificationEmail } = require('../utils/mailer');

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
        WHERE UPPER(u.username) LIKE UPPER(?) || '%' AND u.id != ?
        LIMIT 15
    `, [userId, userId, query, userId], (err, rows) => {
        if (err) throw err;
        res.json(rows);
    });
});

router.get('/by-id/:id', authenticateToken, (req, res) => {
    db.get("SELECT id, username, profile_picture, live_typing_enabled FROM users WHERE id = ?", [req.params.id], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json(user);
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

router.put('/me/profile', authenticateToken, upload.fields([{name: 'cover_photo', maxCount: 1}, {name: 'profile_picture', maxCount: 1}]), upload.validateImageMagicBytes, (req, res) => {
    const { bio } = req.body;
    const isValidLocalPath = (str) => typeof str === 'string' && (str.startsWith('/uploads/') || str === '');
    let coverUrl = req.files && req.files['cover_photo'] 
        ? `/uploads/${req.files['cover_photo'][0].filename}` 
        : (isValidLocalPath(req.body.cover_photo) ? req.body.cover_photo : null);
    let avatarUrl = req.files && req.files['profile_picture'] 
        ? `/uploads/${req.files['profile_picture'][0].filename}` 
        : (isValidLocalPath(req.body.profile_picture) ? req.body.profile_picture : null);
    
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

router.get('/me', authenticateToken, (req, res) => {
    db.get("SELECT id, username, email, email_verified, profile_picture, bio, cover_photo, live_typing_enabled FROM users WHERE id = ?", [req.user.id], (err, user) => {
        if (err || !user) return res.status(404).json({ error: "User not found" });
        res.json(user);
    });
});

router.put('/me/live-typing', authenticateToken, (req, res) => {
    const { enabled } = req.body;
    const val = enabled ? 1 : 0;
    db.run("UPDATE users SET live_typing_enabled = ? WHERE id = ?", [val, req.user.id], function(err) {
        if (err) return res.status(500).json({ error: "Failed to update setting" });
        const io = req.app.get('io');
        if (io) {
            db.all(`
                SELECT CASE WHEN requester_id = ? THEN addressee_id ELSE requester_id END as friend_id
                FROM friendships
                WHERE (requester_id = ? OR addressee_id = ?) AND status = 'accepted'
            `, [req.user.id, req.user.id, req.user.id], (err, friends) => {
                if (!err && friends) {
                    friends.forEach(f => {
                        io.to(`user_${f.friend_id}`).emit('user_live_typing_toggled', { userId: req.user.id, enabled: val === 1 });
                    });
                }
            });
        }
        res.json({ message: "Live typing setting updated", live_typing_enabled: val });
    });
});

router.get('/live-typing-status/:targetUserId', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const targetUserId = parseInt(req.params.targetUserId);
    if (!targetUserId || isNaN(targetUserId)) return res.status(400).json({ error: "Invalid target user ID" });

    db.get(`
        SELECT status FROM friendships 
        WHERE ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))
          AND status = 'accepted'
    `, [userId, targetUserId, targetUserId, userId], (err, friendship) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!friendship) return res.status(403).json({ error: "Access denied. Friendship required." });

        db.all("SELECT id, live_typing_enabled FROM users WHERE id IN (?, ?)", [userId, targetUserId], (err, users) => {
            if (err) return res.status(500).json({ error: err.message });
            const myOpt = users.find(u => u.id === userId)?.live_typing_enabled === 1;
            const peerOpt = users.find(u => u.id === targetUserId)?.live_typing_enabled === 1;
            res.json({ active: myOpt && peerOpt, myOpt, peerOpt });
        });
    });
});

router.put('/me/email', authenticateToken, (req, res) => {
    const { currentPassword, newEmail } = req.body;
    if (!newEmail || !newEmail.trim()) {
        return res.status(400).json({ error: "New email is required" });
    }
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({ error: "Invalid email format" });
    }

    db.get("SELECT * FROM users WHERE id = ?", [req.user.id], async (err, user) => {
        if (err || !user) return res.status(404).json({ error: "User not found" });

        // If user already has a password set (all active users have password_hash), require currentPassword re-auth
        if (!currentPassword) {
            return res.status(400).json({ error: "Current password required to update recovery email" });
        }
        const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!validPassword) {
            return res.status(400).json({ error: "Invalid current password" });
        }

        // Check if email already used by someone else
        db.get("SELECT id FROM users WHERE LOWER(email) = ? AND id != ?", [cleanEmail, req.user.id], (err, existing) => {
            if (err) throw err;
            if (existing) return res.status(400).json({ error: "Email is already in use by another account" });

            db.run("UPDATE users SET email = ?, email_verified = 0 WHERE id = ?", [cleanEmail, req.user.id], function(err) {
                if (err) return res.status(500).json({ error: "Failed to update email" });

                // Invalidate older unused verification tokens for this user
                db.run("UPDATE email_verifications SET used = 1 WHERE user_id = ? AND used = 0", [req.user.id], () => {
                    const rawToken = crypto.randomBytes(32).toString('hex');
                    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
                    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

                    db.run(
                        "INSERT INTO email_verifications (token_hash, user_id, email, expires_at, used, created_at) VALUES (?, ?, ?, ?, 0, ?)",
                        [tokenHash, req.user.id, cleanEmail, expiresAt, Date.now()],
                        (err) => {
                            if (err) console.error("[EmailVerify DB Error]", err);
                            setImmediate(() => {
                                sendEmailVerificationEmail(cleanEmail, rawToken).catch(err => console.error("[EmailVerify Mailer Error]", err));
                            });
                            res.json({ message: "Email updated. Please check your inbox to verify.", email: cleanEmail, email_verified: false });
                        }
                    );
                });
            });
        });
    });
});

module.exports = router;
