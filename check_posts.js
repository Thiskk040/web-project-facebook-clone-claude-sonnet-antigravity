const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./facebook.db');
const { detectBait } = require('./utils/baitDetector');

db.all("SELECT * FROM posts ORDER BY id DESC LIMIT 20", async (err, rows) => {
    if (err) throw err;
    console.log("=== LATEST POSTS IN DB ===");
    for (const r of rows) {
        const bait = await detectBait(r.content);
        console.log(`ID: ${r.id} | Content: [${r.content}] | Detected Score: ${bait.score}% | Matches: [${(bait.translations || []).join(', ')}]`);
    }
    db.close();
});
