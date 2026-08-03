const db = require('../config/database');

async function testSearchExplain() {
    const stmtId = `SEARCH_TEST_${Date.now()}`;
    const sql = `EXPLAIN PLAN SET STATEMENT_ID = '${stmtId}' FOR SELECT id, username FROM users WHERE UPPER(username) LIKE 'PW%'`;
    await db.run(sql);
    
    const rows = await db.all(`SELECT operation, options, object_name FROM plan_table WHERE statement_id = '${stmtId}'`);
    console.log("EXPLAIN PLAN FOR Search Index (IDX_USERS_USERNAME_LOWER):");
    console.table(rows);
    
    await db.run(`DELETE FROM plan_table WHERE statement_id = '${stmtId}'`);
    process.exit(0);
}

testSearchExplain();
