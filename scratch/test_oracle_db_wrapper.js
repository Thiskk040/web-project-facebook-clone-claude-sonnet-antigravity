const oracledb = require('oracledb');
require('dotenv').config();

// Enable Thin Mode and fetch CLOB as string
oracledb.autoCommit = true;
oracledb.fetchAsString = [oracledb.CLOB];
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

let pool;

async function initPool() {
    if (!pool) {
        pool = await oracledb.createPool({
            user: process.env.ORACLE_USER || 'Glaze',
            password: process.env.ORACLE_PASSWORD || 'Gl@ze123',
            connectString: process.env.ORACLE_CONNECT_STRING || 'localhost:1521/XEPDB1',
            poolMin: 2,
            poolMax: 10,
            poolIncrement: 1
        });
    }
    return pool;
}

function processSql(sql) {
    let paramIndex = 1;
    let processed = sql.replace(/\?/g, () => `:${paramIndex++}`);
    
    // Replace LIMIT / OFFSET for Oracle 12c+
    processed = processed.replace(/\bLIMIT\s+(\d+)\s+OFFSET\s+(\d+)\b/gi, 'OFFSET $2 ROWS FETCH NEXT $1 ROWS ONLY');
    processed = processed.replace(/\bLIMIT\s+(\d+)\b/gi, 'FETCH NEXT $1 ROWS ONLY');

    return processed;
}

function normalizeKeys(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(normalizeKeys);
    if (obj instanceof Date) return obj.toISOString();

    const normalized = {};
    for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        if (value instanceof Date) {
            normalized[lowerKey] = value.toISOString();
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            normalized[lowerKey] = normalizeKeys(value);
        } else {
            normalized[lowerKey] = value;
        }
    }
    return normalized;
}

const db = {
    async get(sql, params = [], callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        try {
            const p = await initPool();
            const connection = await p.getConnection();
            try {
                const finalSql = processSql(sql);
                const res = await connection.execute(finalSql, params);
                const row = res.rows && res.rows.length > 0 ? normalizeKeys(res.rows[0]) : undefined;
                if (callback) callback(null, row);
                return row;
            } finally {
                await connection.close();
            }
        } catch (err) {
            if (callback) callback(err);
            else throw err;
        }
    },

    async all(sql, params = [], callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        try {
            const p = await initPool();
            const connection = await p.getConnection();
            try {
                const finalSql = processSql(sql);
                const res = await connection.execute(finalSql, params);
                const rows = (res.rows || []).map(normalizeKeys);
                if (callback) callback(null, rows);
                return rows;
            } finally {
                await connection.close();
            }
        } catch (err) {
            if (callback) callback(err);
            else throw err;
        }
    },

    async run(sql, params = [], callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        let isInsert = /^\s*INSERT\s+INTO/i.test(sql);
        let hasReturning = /RETURNING\b/i.test(sql);

        try {
            const p = await initPool();
            const connection = await p.getConnection();
            try {
                let finalSql = processSql(sql);
                let bindParams = Array.isArray(params) ? [...params] : { ...params };
                let outIdBindNeeded = isInsert && !hasReturning && /\b(users|posts|interactions|comments|friendships|notifications|tags|messages|bait_patterns)\b/i.test(sql);

                if (outIdBindNeeded) {
                    finalSql += ' RETURNING id INTO :out_id_res';
                    if (Array.isArray(bindParams)) {
                        bindParams.push({ dir: oracledb.BIND_OUT, type: oracledb.NUMBER });
                    } else {
                        bindParams.out_id_res = { dir: oracledb.BIND_OUT, type: oracledb.NUMBER };
                    }
                }

                const res = await connection.execute(finalSql, bindParams);
                const context = {
                    changes: res.rowsAffected || 0,
                    lastID: undefined
                };

                if (outIdBindNeeded && res.outBinds) {
                    let outVal = res.outBinds.out_id_res || (Array.isArray(res.outBinds) ? res.outBinds[res.outBinds.length - 1] : undefined);
                    if (Array.isArray(outVal)) outVal = outVal[0];
                    context.lastID = outVal;
                }

                if (callback) callback.call(context, null);
                return context;
            } finally {
                await connection.close();
            }
        } catch (err) {
            if (callback) callback.call({ changes: 0 }, err);
            else throw err;
        }
    },

    serialize(cb) {
        if (cb) cb();
    }
};

async function testWrapper() {
    console.log("Testing Oracle DB wrapper...");
    db.get("SELECT COUNT(*) AS total FROM users", (err, row) => {
        if (err) return console.error("Error get:", err);
        console.log("Get user count:", row);
    });

    db.all("SELECT id, username, email FROM users WHERE id <= ?", [5], (err, rows) => {
        if (err) return console.error("Error all:", err);
        console.log("All sample users:", rows);
    });

    db.run("INSERT INTO posts (user_id, content) VALUES (?, ?)", [1, "Test post from Oracle wrapper"], function(err) {
        if (err) return console.error("Error run:", err);
        console.log("Run insert post success, lastID:", this.lastID, "changes:", this.changes);
    });
}

testWrapper();
