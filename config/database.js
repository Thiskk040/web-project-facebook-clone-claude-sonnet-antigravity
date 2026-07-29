const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./facebook.db', (err) => {
    if (err) console.error("DB Connection Error:", err.message);
});

// Enable Write-Ahead Logging for better concurrent read/write in Multicore
db.run("PRAGMA journal_mode = WAL;");

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        username TEXT UNIQUE NOT NULL, 
        password_hash TEXT NOT NULL, 
        profile_picture TEXT, 
        bio TEXT DEFAULT '',
        cover_photo TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`ALTER TABLE users ADD COLUMN two_factor_secret TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) console.error(err);
    });
    db.run(`ALTER TABLE users ADD COLUMN two_factor_enabled INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column')) console.error(err);
    });
    db.run(`ALTER TABLE users ADD COLUMN email TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) console.error(err);
    });
    db.run(`ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column')) console.error(err);
    });
    db.run(`ALTER TABLE users ADD COLUMN token_version INTEGER DEFAULT 1`, (err) => {
        if (err && !err.message.includes('duplicate column')) console.error(err);
    });
    db.run(`ALTER TABLE users ADD COLUMN live_typing_enabled INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column')) console.error(err);
    });
    db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL AND email != ''`);

    db.run(`CREATE TABLE IF NOT EXISTS password_resets (
        token_hash TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        used INTEGER DEFAULT 0,
        ip_address TEXT,
        user_agent TEXT,
        created_at INTEGER
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS email_verifications (
        token_hash TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        email TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        used INTEGER DEFAULT 0,
        created_at INTEGER
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS otp_attempts (
        key TEXT PRIMARY KEY,
        attempts INTEGER DEFAULT 1,
        first_attempt INTEGER
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        user_id INTEGER NOT NULL, 
        content TEXT, 
        image_url TEXT, 
        bait_score INTEGER DEFAULT 0,
        bait_translation TEXT DEFAULT '',
        bait_roasts TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id)`);

    db.run(`CREATE TABLE IF NOT EXISTS interactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        post_id INTEGER NOT NULL, 
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(post_id) REFERENCES posts(id),
        FOREIGN KEY(user_id) REFERENCES users(id),
        UNIQUE(post_id, user_id, type)
    )`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_interactions_post_id ON interactions(post_id)`);

    db.run(`CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        post_id INTEGER NOT NULL, 
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(post_id) REFERENCES posts(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS friendships (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        requester_id INTEGER NOT NULL, 
        addressee_id INTEGER NOT NULL, 
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(requester_id) REFERENCES users(id),
        FOREIGN KEY(addressee_id) REFERENCES users(id),
        UNIQUE(requester_id, addressee_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        user_id INTEGER NOT NULL, 
        actor_id INTEGER NOT NULL, 
        type TEXT NOT NULL, 
        target_id INTEGER, 
        is_read BOOLEAN DEFAULT 0, 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(actor_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        post_id INTEGER NOT NULL, 
        tagged_user_id INTEGER NOT NULL, 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(post_id) REFERENCES posts(id),
        FOREIGN KEY(tagged_user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(sender_id) REFERENCES users(id),
        FOREIGN KEY(receiver_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS bait_patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        regex_pattern TEXT NOT NULL,
        flags TEXT DEFAULT '',
        label TEXT NOT NULL,
        roast TEXT NOT NULL
    )`, (err) => {
        if (err) return console.error(err);
        
        db.get("SELECT COUNT(*) as count FROM bait_patterns", (err, row) => {
            if (err) return console.error(err);
            if (row.count === 0) {
                console.log("[Database] Seeding 5,000 bait patterns into SQLite...");
                const { generate5000Patterns } = require('./baitPatternsGenerator');
                const initialPatterns = generate5000Patterns();

                db.serialize(() => {
                    db.run("BEGIN TRANSACTION");
                    const stmt = db.prepare("INSERT INTO bait_patterns (regex_pattern, flags, label, roast) VALUES (?, ?, ?, ?)");
                    initialPatterns.forEach(p => {
                        stmt.run([p.regex_pattern, p.flags || '', p.label, p.roast]);
                    });
                    stmt.finalize();
                    db.run("COMMIT", (err) => {
                        if (err) {
                            console.error("[Database] Failed to commit seeding transaction:", err);
                        } else {
                            console.log("[Database] Successfully seeded 5,000 patterns.");
                        }
                    });
                });
            }
        });
    });
});

module.exports = db;
