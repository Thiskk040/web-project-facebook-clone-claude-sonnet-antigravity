/**
 * Benchmark & EXPLAIN PLAN Verification Script (scratch/benchmark_queries.js)
 * Usage:
 *   node scratch/benchmark_queries.js [--label "BEFORE"|"AFTER"]
 */

const db = require('../config/database');
const oracledb = require('oracledb');

const label = process.argv.includes('--label') 
    ? process.argv[process.argv.indexOf('--label') + 1] 
    : 'BASELINE';

async function runBenchmark() {
    console.log(`\n=================================================`);
    console.log(`  DATABASE BENCHMARK & EXPLAIN PLAN (${label})`);
    console.log(`=================================================\n`);

    // Fetch test user & friend IDs
    const users = await db.all("SELECT id, username FROM users FETCH NEXT 5 ROWS ONLY");
    if (!users || users.length < 2) {
        console.error("Not enough users in DB to benchmark!");
        process.exit(1);
    }
    const testUserId = users[0].id;
    const testFriendId = users[1].id;
    const searchKeyword = users[0].username.slice(0, 3);

    console.log(`Benchmark parameters: testUserId=${testUserId}, testFriendId=${testFriendId}, searchKeyword="${searchKeyword}"\n`);

    // 1. READ BENCHMARKS
    console.log(`--- 1. READ LATENCY BENCHMARKS (100 iterations average) ---`);

    // Query A: GET /posts (Feed Query)
    const feedSql = `
        SELECT p.*, u.username, u.profile_picture 
        FROM posts p 
        JOIN users u ON p.user_id = u.id 
        WHERE p.user_id = ? 
           OR p.user_id IN (
               SELECT addressee_id FROM friendships WHERE requester_id = ? AND status = 'accepted'
               UNION 
               SELECT requester_id FROM friendships WHERE addressee_id = ? AND status = 'accepted'
           )
        ORDER BY p.created_at DESC 
        OFFSET 0 ROWS FETCH NEXT 20 ROWS ONLY
    `;
    const feedTime = await measureAvgLatency(feedSql, [testUserId, testUserId, testUserId], 100);
    console.log(`Query A [Feed GET /posts]:            ${feedTime.toFixed(3)} ms`);

    // Query B: GET /messages/:friendId (Chat Query)
    const chatSql = `
        SELECT * FROM messages 
        WHERE (sender_id = ? AND receiver_id = ?) 
           OR (sender_id = ? AND receiver_id = ?) 
        ORDER BY created_at ASC 
        OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY
    `;
    const chatTime = await measureAvgLatency(chatSql, [testUserId, testFriendId, testFriendId, testUserId], 100);
    console.log(`Query B [Chat GET /messages/:id]:     ${chatTime.toFixed(3)} ms`);

    // Query C: GET /notifications (Notification Dropdown Query)
    const notifSql = `
        SELECT * FROM notifications 
        WHERE user_id = ? 
        ORDER BY is_read ASC, created_at DESC 
        OFFSET 0 ROWS FETCH NEXT 20 ROWS ONLY
    `;
    const notifTime = await measureAvgLatency(notifSql, [testUserId], 100);
    console.log(`Query C [Notifications GET /notif]:   ${notifTime.toFixed(3)} ms`);

    // Query D: GET /users/search (User Prefix Search Query)
    const searchSql = `
        SELECT id, username, profile_picture FROM users 
        WHERE UPPER(username) LIKE UPPER(?) || '%' 
        ORDER BY username ASC 
        OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY
    `;
    const searchTime = await measureAvgLatency(searchSql, [searchKeyword], 100);
    console.log(`Query D [Search GET /users/search]:   ${searchTime.toFixed(3)} ms\n`);

    // 2. WRITE BENCHMARKS
    console.log(`--- 2. WRITE LATENCY BENCHMARKS (30 INSERTs & CLEANUP) ---`);

    // Write A: INSERT INTO posts
    const writePostTime = await measureWriteLatency(
        "INSERT INTO posts (user_id, content, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
        [testUserId, "Benchmark temporary test post"],
        "DELETE FROM posts"
    );
    console.log(`Write A [INSERT INTO posts]:        ${writePostTime.toFixed(3)} ms`);

    // Write B: INSERT INTO messages
    const writeMsgTime = await measureWriteLatency(
        "INSERT INTO messages (sender_id, receiver_id, content, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
        [testUserId, testFriendId, "Benchmark temporary message"],
        "DELETE FROM messages"
    );
    console.log(`Write B [INSERT INTO messages]:     ${writeMsgTime.toFixed(3)} ms`);

    const postsList = await db.all("SELECT id FROM posts FETCH NEXT 1 ROWS ONLY");
    const testPostId = postsList && postsList.length > 0 ? postsList[0].id : 1;

    // Write C: INSERT INTO interactions
    await db.run("DELETE FROM interactions WHERE user_id = ? AND post_id = ? AND type = 'benchmark_like'", [testUserId, testPostId]);
    const writeInterTime = await measureWriteLatency(
        "INSERT INTO interactions (user_id, post_id, type, created_at) VALUES (?, ?, 'benchmark_like', CURRENT_TIMESTAMP)",
        [testUserId, testPostId],
        "DELETE FROM interactions"
    );
    console.log(`Write C [INSERT INTO interactions]: ${writeInterTime.toFixed(3)} ms\n`);

    // 3. EXPLAIN PLAN VERIFICATION
    console.log(`--- 3. EXPLAIN PLAN ANALYSIS FOR CORE QUERIES ---`);
    await explainPlan('Query A (Feed)', feedSql, [testUserId, testUserId, testUserId]);
    await explainPlan('Query B (Chat)', chatSql, [testUserId, testFriendId, testFriendId, testUserId]);
    await explainPlan('Query C (Notifications)', notifSql, [testUserId]);
    await explainPlan('Query D (Search)', searchSql, [searchKeyword]);

    process.exit(0);
}

async function measureAvgLatency(sql, params, iterations = 100) {
    // Warmup
    await db.all(sql, params);

    const start = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
        await db.all(sql, params);
    }
    const end = process.hrtime.bigint();
    return Number(end - start) / (1e6 * iterations);
}

async function measureWriteLatency(insertSql, insertParams, deleteSqlPrefix) {
    let totalNs = BigInt(0);
    const count = 30;
    for (let i = 0; i < count; i++) {
        const start = process.hrtime.bigint();
        const res = await db.run(insertSql, insertParams);
        const end = process.hrtime.bigint();
        totalNs += (end - start);
        if (res && res.lastID) {
            await db.run(`${deleteSqlPrefix} WHERE id = ?`, [res.lastID]);
        }
    }
    return Number(totalNs) / (1e6 * count);
}

async function explainPlan(queryLabel, sql, params) {
    console.log(`\n===================================`);
    console.log(` EXPLAIN PLAN: ${queryLabel}`);
    console.log(`===================================`);
    try {
        const statementId = `STMT_${Date.now()}_${Math.floor(Math.random()*1000)}`;
        let processed = sql.trim().replace(/;+$/, '');
        let paramIndex = 1;
        processed = processed.replace(/\?/g, () => `'PARAM_${paramIndex++}'`);

        const explainSql = `EXPLAIN PLAN SET STATEMENT_ID = '${statementId}' FOR ${processed}`;
        await db.run(explainSql);

        const planRows = await db.all(`
            SELECT operation, options, object_name, depth, cost, bytes
            FROM plan_table 
            WHERE statement_id = '${statementId}'
            ORDER BY id
        `);

        if (!planRows || planRows.length === 0) {
            console.log("No execution plan generated.");
            return;
        }

        planRows.forEach(r => {
            const indent = '  '.repeat(r.depth || 0);
            const obj = r.object_name ? ` [${r.object_name}]` : '';
            const cost = r.cost !== undefined ? ` (Cost: ${r.cost})` : '';
            console.log(`${indent}${r.operation} ${r.options || ''}${obj}${cost}`);
        });

        // Clean up plan table
        await db.run(`DELETE FROM plan_table WHERE statement_id = '${statementId}'`);
    } catch (err) {
        console.error(`Explain Plan Error for ${queryLabel}:`, err.message);
    }
}

runBenchmark().catch(err => {
    console.error("Benchmark error:", err);
    process.exit(1);
});
