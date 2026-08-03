const oracledb = require('oracledb');
require('dotenv').config();

const currentPass = process.env.ORACLE_PASSWORD;
const newPass = 'GlazePass2026!SecureKey';

async function rotatePassword() {
    console.log("[Password Rotation] Connecting to Oracle DB...");
    const conn = await oracledb.getConnection({
        user: process.env.ORACLE_USER,
        password: currentPass,
        connectString: process.env.ORACLE_CONNECT_STRING
    });

    console.log("[Password Rotation] Altering password for user Glaze...");
    await conn.execute(`ALTER USER Glaze IDENTIFIED BY "${newPass}"`);
    await conn.close();

    console.log("[Password Rotation] SUCCESS! Oracle user Glaze password rotated.");
    console.log(`New password: ${newPass}`);
}

rotatePassword().catch(err => {
    console.error("[Password Rotation Error]", err.message);
    process.exit(1);
});
