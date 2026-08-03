/**
 * Idempotent Database Index Provisioning System for Oracle 21c XE
 * 
 * Features:
 *  - Queries USER_INDEXES prior to index creation to prevent ORA-00955 errors.
 *  - Gated execution: Runs via `npm run migrate:indexes` or `RUN_INDEX_MIGRATION=true node config/init_indexes.js`.
 *  - Tests `CREATE INDEX ... ONLINE` availability on Oracle 21c XE.
 */

const db = require('./database');

const INDEX_DEFINITIONS = [
    {
        name: 'IDX_POSTS_USER_CREATED',
        table: 'POSTS',
        sql: 'CREATE INDEX IDX_POSTS_USER_CREATED ON POSTS (user_id, created_at DESC)'
    },
    {
        name: 'IDX_MSG_CONV_FORWARD',
        table: 'MESSAGES',
        sql: 'CREATE INDEX IDX_MSG_CONV_FORWARD ON MESSAGES (sender_id, receiver_id, created_at ASC)'
    },
    {
        name: 'IDX_MSG_CONV_REVERSE',
        table: 'MESSAGES',
        sql: 'CREATE INDEX IDX_MSG_CONV_REVERSE ON MESSAGES (receiver_id, sender_id, created_at ASC)'
    },
    {
        name: 'IDX_MSG_UNREAD',
        table: 'MESSAGES',
        sql: 'CREATE INDEX IDX_MSG_UNREAD ON MESSAGES (receiver_id, is_read)'
    },
    {
        name: 'IDX_NOTIF_USER_CREATED',
        table: 'NOTIFICATIONS',
        sql: 'CREATE INDEX IDX_NOTIF_USER_CREATED ON NOTIFICATIONS (user_id, is_read, created_at DESC)'
    },
    {
        name: 'IDX_FRIENDSHIP_PAIR',
        table: 'FRIENDSHIPS',
        sql: 'CREATE INDEX IDX_FRIENDSHIP_PAIR ON FRIENDSHIPS (requester_id, addressee_id, status)'
    },
    {
        name: 'IDX_FRIENDSHIP_REVERSE',
        table: 'FRIENDSHIPS',
        sql: 'CREATE INDEX IDX_FRIENDSHIP_REVERSE ON FRIENDSHIPS (addressee_id, requester_id, status)'
    },
    {
        name: 'IDX_INTERACTIONS_POST',
        table: 'INTERACTIONS',
        sql: 'CREATE INDEX IDX_INTERACTIONS_POST ON INTERACTIONS (post_id, user_id, type)'
    },
    {
        name: 'IDX_COMMENTS_POST',
        table: 'COMMENTS',
        sql: 'CREATE INDEX IDX_COMMENTS_POST ON COMMENTS (post_id, created_at ASC)'
    },
    {
        name: 'IDX_TAGS_USER',
        table: 'TAGS',
        sql: 'CREATE INDEX IDX_TAGS_USER ON TAGS (tagged_user_id, post_id)'
    },
    {
        name: 'IDX_USERS_USERNAME_LOWER',
        table: 'USERS',
        sql: 'CREATE INDEX IDX_USERS_USERNAME_LOWER ON USERS (UPPER(username))'
    }
];

async function applyIndexes() {
    console.log('\n=================================================');
    console.log('   ORACLE DB INDEX PROVISIONING & MIGRATION');
    console.log('=================================================\n');

    // 1. Fetch existing user indexes
    const existingIndexRows = await db.all("SELECT index_name FROM user_indexes");
    const existingIndexes = new Set((existingIndexRows || []).map(r => r.index_name.toUpperCase()));

    console.log(`Found ${existingIndexes.size} existing indexes in schema.\n`);

    // 2. Test ONLINE DDL capability under Oracle 21c XE
    let supportsOnline = false;
    try {
        // Create temporary dummy table to test CREATE INDEX ... ONLINE
        await db.run("CREATE TABLE temp_online_test (id NUMBER)");
        await db.run("CREATE INDEX idx_temp_online_test ON temp_online_test (id) ONLINE");
        await db.run("DROP TABLE temp_online_test PURGE");
        supportsOnline = true;
        console.log("✔ [ONLINE DDL Audit]: CREATE INDEX ... ONLINE is SUPPORTED on Oracle 21c XE.\n");
    } catch (onlineErr) {
        console.log("ℹ [ONLINE DDL Audit]: CREATE INDEX ... ONLINE restricted or unavailable on Oracle 21c XE. Falling back to standard DDL.\n");
        try { await db.run("DROP TABLE temp_online_test PURGE"); } catch (e) {}
    }

    let createdCount = 0;
    let skippedCount = 0;

    for (const def of INDEX_DEFINITIONS) {
        const indexName = def.name.toUpperCase();

        if (existingIndexes.has(indexName)) {
            console.log(`- [SKIP] ${indexName} already exists on ${def.table}.`);
            skippedCount++;
            continue;
        }

        const ddlSql = supportsOnline ? `${def.sql} ONLINE` : def.sql;
        try {
            console.log(`+ [CREATE] Creating index ${indexName} on ${def.table}...`);
            await db.run(ddlSql);
            console.log(`✔ [SUCCESS] ${indexName} created successfully.`);
            createdCount++;
        } catch (err) {
            if (err.message.includes('ORA-00955') || err.message.includes('ORA-01408')) {
                console.log(`- [SKIP] ${indexName} already exists / column list already indexed (${err.message.split('\n')[0]}).`);
                skippedCount++;
            } else {
                console.error(`❌ [ERROR] Failed to create ${indexName}:`, err.message);
            }
        }
    }

    console.log('\n=================================================');
    console.log(` Migration Summary: Created=${createdCount}, Skipped=${skippedCount}, Total=${INDEX_DEFINITIONS.length}`);
    console.log('=================================================\n');
}

if (require.main === module) {
    applyIndexes()
        .then(() => process.exit(0))
        .catch(err => {
            console.error('Index migration failed:', err);
            process.exit(1);
        });
}

module.exports = { applyIndexes };
