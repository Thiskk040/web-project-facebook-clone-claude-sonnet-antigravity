const oracledb = require('oracledb');
require('dotenv').config();

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

async function checkUrls() {
    let connection;
    try {
        connection = await oracledb.getConnection({
            user: process.env.ORACLE_USER || 'Glaze',
            password: process.env.ORACLE_PASSWORD || 'Gl@ze123',
            connectString: process.env.ORACLE_CONNECT_STRING || 'localhost:1521/XEPDB1'
        });

        console.log("--- Sample Users Image Paths in Oracle DB ---");
        const users = await connection.execute("SELECT id, username, profile_picture, cover_photo FROM users WHERE profile_picture IS NOT NULL OR cover_photo IS NOT NULL FETCH NEXT 5 ROWS ONLY");
        console.log(users.rows);

        console.log("\n--- Sample Posts Image Paths in Oracle DB ---");
        const posts = await connection.execute("SELECT id, user_id, image_url FROM posts WHERE image_url IS NOT NULL FETCH NEXT 5 ROWS ONLY");
        console.log(posts.rows);

    } catch (err) {
        console.error("Query Error:", err);
    } finally {
        if (connection) await connection.close();
    }
}

checkUrls();
