const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.delete('/:userId', authenticateToken, (req, res) => {
    const friendId = req.params.userId;
    const myId = req.user.id;
    db.run("DELETE FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)", [myId, friendId, friendId, myId], function(err) {
        if (err) throw err;
        res.json({ message: "Friend removed" });
    });
});

module.exports = router;
