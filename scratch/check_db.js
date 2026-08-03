const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./facebook.db');
db.all("SELECT id, username FROM users WHERE password_hash NOT LIKE '$2a$%' AND password_hash NOT LIKE '$2b$%'", (err, rows) => {
    if (err) throw err;
    console.log("Unhashed users count:", rows.length);
    if (rows.length > 0) {
        console.log(rows.map(r => r.username));
    }
});
