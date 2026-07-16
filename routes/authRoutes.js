const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { asyncHandler } = require('../middleware/auth');

const router = express.Router();

router.post('/register', asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run("INSERT INTO users (username, password_hash) VALUES (?, ?)", [username, hashedPassword], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.status(400).json({ error: "Username already exists" });
            }
            throw err;
        }
        res.status(201).json({ message: "User created", userId: this.lastID });
    });
}));

router.post('/login', asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });

    db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
        if (err) throw err;
        if (!user) return res.status(400).json({ error: "Invalid credentials" });

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(400).json({ error: "Invalid credentials" });

        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({ message: "Logged in", token, user: { id: user.id, username: user.username } });
    });
}));

module.exports = router;
