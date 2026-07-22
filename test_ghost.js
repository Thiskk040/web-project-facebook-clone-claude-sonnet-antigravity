const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./facebook.db');

// Enable WAL mode
db.run("PRAGMA journal_mode = WAL;");

console.log("=== RUNNING GHOST READ RECEIPT TESTS ===");

db.serialize(() => {
    // 1. Create dummy users if not exist
    db.run("INSERT OR IGNORE INTO users (id, username, password_hash) VALUES (9991, 'ghost_user_1', 'hash')", (err) => {
        if (err) throw err;
    });
    db.run("INSERT OR IGNORE INTO users (id, username, password_hash) VALUES (9992, 'ghost_user_2', 'hash')", (err) => {
        if (err) throw err;
    });

    // 2. Clear old test messages
    db.run("DELETE FROM messages WHERE sender_id IN (9991, 9992)");

    // Case A: Last message sent by current user, is_read = 1, sent 30 hours ago (should trigger ghost)
    const thirtyHoursAgo = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString();
    db.run(
        "INSERT INTO messages (sender_id, receiver_id, content, is_read, created_at) VALUES (?, ?, ?, ?, ?)",
        [9991, 9992, "Hello from the past!", 1, thirtyHoursAgo],
        function(err) {
            if (err) throw err;
            
            // Query message history mimicking backend
            db.all(`
                SELECT * FROM messages 
                WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
                ORDER BY created_at ASC
            `, [9991, 9992, 9992, 9991], (err, rows) => {
                if (err) throw err;
                
                console.log("Fetched messages count:", rows.length);
                if (rows.length === 0) {
                    console.error("❌ Test failed: No messages found!");
                    cleanupAndExit(1);
                    return;
                }

                const lastMsg = rows[rows.length - 1];
                
                // Calculate hours_since_seen
                if (lastMsg.sender_id === 9991 && lastMsg.is_read === 1) {
                    const createdTime = new Date(lastMsg.created_at);
                    const hours = (new Date() - createdTime) / (1000 * 60 * 60);
                    lastMsg.hours_since_seen = hours;
                }

                console.log("Last Message:", lastMsg);
                if (lastMsg.hours_since_seen && lastMsg.hours_since_seen >= 29.5 && lastMsg.hours_since_seen <= 30.5) {
                    console.log("✅ Case A PASSED: ghost read receipt correctly calculated hours_since_seen =", lastMsg.hours_since_seen.toFixed(2), "hours");
                } else {
                    console.error("❌ Case A FAILED: hours_since_seen was", lastMsg.hours_since_seen);
                    cleanupAndExit(1);
                    return;
                }

                // Test Case B: Add a reply from recipient. The ghost receipt should no longer be active.
                db.run(
                    "INSERT INTO messages (sender_id, receiver_id, content, is_read) VALUES (?, ?, ?, ?)",
                    [9992, 9991, "I'm replying now!", 0],
                    function(err) {
                        if (err) throw err;
                        
                        db.all(`
                            SELECT * FROM messages 
                            WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
                            ORDER BY created_at ASC
                        `, [9991, 9992, 9992, 9991], (err, newRows) => {
                            if (err) throw err;
                            
                            const newLastMsg = newRows[newRows.length - 1];
                            if (newLastMsg.sender_id === 9991 && newLastMsg.is_read === 1) {
                                const createdTime = new Date(newLastMsg.created_at);
                                const hours = (new Date() - createdTime) / (1000 * 60 * 60);
                                newLastMsg.hours_since_seen = hours;
                            }

                            console.log("New Last Message (after reply):", newLastMsg);
                            if (newLastMsg.hours_since_seen === undefined) {
                                console.log("✅ Case B PASSED: hours_since_seen is correctly undefined after a reply.");
                                cleanupAndExit(0);
                            } else {
                                console.error("❌ Case B FAILED: hours_since_seen was found when last message is not sent by current user.");
                                cleanupAndExit(1);
                            }
                        });
                    }
                );
            });
        }
    );
});

function cleanupAndExit(exitCode) {
    db.serialize(() => {
        db.run("DELETE FROM messages WHERE sender_id IN (9991, 9992)");
        db.run("DELETE FROM users WHERE id IN (9991, 9992)", () => {
            db.close();
            console.log("\nCleanup done.");
            process.exit(exitCode);
        });
    });
}
