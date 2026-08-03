const oracledb = require('oracledb');
require('dotenv').config();

console.log("Testing Oracle DB Connection...");

async function testConnection(connectString) {
    console.log(`\nTrying connectString: ${connectString}`);
    try {
        const conn = await oracledb.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: connectString
        });
        console.log(`SUCCESS connected to ${connectString}!`);
        const res = await conn.execute("SELECT 1 FROM DUAL");
        console.log("Query result:", res.rows);
        await conn.close();
        return true;
    } catch (err) {
        console.error(`FAILED for ${connectString}:`, err.message);
        return false;
    }
}

async function run() {
    await testConnection('localhost:1521/XEPDB1');
    await testConnection('192.168.1.126:1521/XEPDB1');
    await testConnection('host.docker.internal:1521/XEPDB1');
}

run();
