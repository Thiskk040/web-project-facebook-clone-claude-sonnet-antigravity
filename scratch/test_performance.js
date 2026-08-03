/**
 * High-Concurrency Performance & Stress Benchmark Script
 * Location: scratch/test_performance.js
 * 
 * Measures:
 *   - Requests Per Second (RPS)
 *   - Min, Max, Average, P95, and P99 Latency (ms)
 *   - Concurrent load execution across 50 parallel requests
 */

const db = require('../config/database');

async function runPerformanceCheck() {
    console.log('\n================================================================');
    console.log('    ORACLE 21c XE HIGH-CONCURRENCY PERFORMANCE BENCHMARK');
    console.log('================================================================\n');

    // Fetch sample users for realistic testing
    const users = await db.all("SELECT id, username FROM users FETCH NEXT 10 ROWS ONLY");
    if (!users || users.length < 2) {
        console.error("Not enough users in DB to benchmark!");
        process.exit(1);
    }

    const testUserId = users[0].id;
    const testFriendId = users[1].id;

    console.log(`Target User ID: ${testUserId} (${users[0].username})`);
    console.log(`Target Friend ID: ${testFriendId} (${users[1].username})\n`);

    // 1. CONCURRENT READ STRESS TEST
    console.log('--- 1. CONCURRENT READ PERFORMANCE (50 Concurrent Connections, 500 Total Requests) ---');
    
    // Test A: Feed Query
    await benchmarkConcurrent(
        'Feed Query (GET /posts)',
        `SELECT p.*, u.username, u.profile_picture 
         FROM posts p 
         JOIN users u ON p.user_id = u.id 
         WHERE p.user_id = ? 
            OR p.user_id IN (
                SELECT addressee_id FROM friendships WHERE requester_id = ? AND status = 'accepted'
                UNION 
                SELECT requester_id FROM friendships WHERE addressee_id = ? AND status = 'accepted'
            )
         ORDER BY p.created_at DESC 
         OFFSET 0 ROWS FETCH NEXT 20 ROWS ONLY`,
        [testUserId, testUserId, testUserId],
        500,
        50
    );

    // Test B: Chat Query
    await benchmarkConcurrent(
        'Chat History (GET /messages/:id)',
        `SELECT * FROM messages 
         WHERE (sender_id = ? AND receiver_id = ?) 
            OR (sender_id = ? AND receiver_id = ?) 
         ORDER BY created_at ASC 
         OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY`,
        [testUserId, testFriendId, testFriendId, testUserId],
        500,
        50
    );

    // Test C: Notifications Query
    await benchmarkConcurrent(
        'Notification Dropdown (GET /notifications)',
        `SELECT * FROM notifications 
         WHERE user_id = ? 
         ORDER BY is_read ASC, created_at DESC 
         OFFSET 0 ROWS FETCH NEXT 20 ROWS ONLY`,
        [testUserId],
        500,
        50
    );

    // Test D: User Search Query (Indexed Functional Search)
    await benchmarkConcurrent(
        'User Search (GET /users/search)',
        `SELECT id, username, profile_picture FROM users 
         WHERE UPPER(username) LIKE UPPER(?) || '%' AND id != ? 
         OFFSET 0 ROWS FETCH NEXT 15 ROWS ONLY`,
        ['usr', testUserId],
        500,
        50
    );

    // 2. CONCURRENT WRITE STRESS TEST
    console.log('\n--- 2. CONCURRENT WRITE PERFORMANCE (50 Parallel Inserts) ---');
    await benchmarkWriteConcurrent(testUserId, testFriendId);

    console.log('\n================================================================');
    console.log('    PERFORMANCE TEST COMPLETED SUCCESSFULLY');
    console.log('================================================================\n');

    process.exit(0);
}

async function benchmarkConcurrent(name, sql, params, totalRequests = 500, concurrency = 50) {
    const latencies = [];
    const overallStart = process.hrtime.bigint();

    // Warmup single call
    await db.all(sql, params);

    const executeBatch = async (count) => {
        const promises = [];
        for (let i = 0; i < count; i++) {
            promises.push((async () => {
                const reqStart = process.hrtime.bigint();
                await db.all(sql, params);
                const reqEnd = process.hrtime.bigint();
                latencies.push(Number(reqEnd - reqStart) / 1e6);
            })());
        }
        await Promise.all(promises);
    };

    const batches = Math.ceil(totalRequests / concurrency);
    for (let b = 0; b < batches; b++) {
        await executeBatch(concurrency);
    }

    const overallEnd = process.hrtime.bigint();
    const totalDurationSec = Number(overallEnd - overallStart) / 1e9;
    const rps = totalRequests / totalDurationSec;

    latencies.sort((a, b) => a - b);
    const avg = latencies.reduce((acc, v) => acc + v, 0) / latencies.length;
    const min = latencies[0];
    const max = latencies[latencies.length - 1];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];

    console.log(`\n🔹 ${name}`);
    console.log(`   - Throughput:    ${rps.toFixed(1)} req/sec`);
    console.log(`   - Average:       ${avg.toFixed(2)} ms`);
    console.log(`   - Min / Max:     ${min.toFixed(2)} ms / ${max.toFixed(2)} ms`);
    console.log(`   - P95 Latency:   ${p95.toFixed(2)} ms`);
    console.log(`   - P99 Latency:   ${p99.toFixed(2)} ms`);
}

async function benchmarkWriteConcurrent(userId, friendId) {
    const postIds = [];
    const count = 50;
    const start = process.hrtime.bigint();

    // 50 parallel inserts
    const promises = [];
    for (let i = 0; i < count; i++) {
        promises.push((async () => {
            const res = await db.run(
                "INSERT INTO posts (user_id, content, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
                [userId, `Stress test post #${i}`]
            );
            if (res && res.lastID) postIds.push(res.lastID);
        })());
    }
    await Promise.all(promises);

    const end = process.hrtime.bigint();
    const durationSec = Number(end - start) / 1e9;
    const rps = count / durationSec;
    const avgMs = (durationSec * 1000) / count;

    console.log(`\n🔹 Concurrent Inserts (POSTS)`);
    console.log(`   - Total Inserted: ${count} rows`);
    console.log(`   - Write Speed:    ${rps.toFixed(1)} inserts/sec`);
    console.log(`   - Avg Write Time: ${avgMs.toFixed(2)} ms/row`);

    // Cleanup
    for (const id of postIds) {
        await db.run("DELETE FROM posts WHERE id = ?", [id]);
    }
}

runPerformanceCheck().catch(err => {
    console.error("Performance benchmark error:", err);
    process.exit(1);
});
