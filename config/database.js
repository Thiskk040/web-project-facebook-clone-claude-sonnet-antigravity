const oracledb = require('oracledb');
require('dotenv').config();

// Enable Thin Mode and fetch CLOB as string
oracledb.autoCommit = true;
oracledb.fetchAsString = [oracledb.CLOB];
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

const requiredEnvVars = ['ORACLE_USER', 'ORACLE_PASSWORD', 'ORACLE_CONNECT_STRING'];
const missingEnvVars = requiredEnvVars.filter(key => !process.env[key]);
if (missingEnvVars.length > 0) {
    console.error(`FATAL: Missing required Oracle env vars: ${missingEnvVars.join(', ')}`);
    process.exit(1);
}

let pool;
let poolPromise;

async function getPool() {
    if (pool) return pool;
    if (!poolPromise) {
        poolPromise = oracledb.createPool({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONNECT_STRING,
            poolMin: parseInt(process.env.ORACLE_POOL_MIN || '2', 10),
            poolMax: parseInt(process.env.ORACLE_POOL_MAX || '10', 10),
            poolIncrement: 1
        }).then(p => {
            pool = p;
            return pool;
        }).catch(err => {
            poolPromise = null;
            throw err;
        });
    }
    return poolPromise;
}

getPool().catch(err => console.error("[Oracle DB Pool Error]", err.message));

function processSql(sql) {
    let cleaned = sql.trim().replace(/;+$/, '');
    let paramIndex = 1;
    let processed = cleaned.replace(/\?/g, () => `:${paramIndex++}`);
    
    // Convert LIMIT / OFFSET to Oracle 12c+ syntax
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
    get(sql, params = [], callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        return (async () => {
            const p = await getPool();
            const connection = await p.getConnection();
            try {
                const finalSql = processSql(sql);
                const res = await connection.execute(finalSql, params || []);
                const row = res.rows && res.rows.length > 0 ? normalizeKeys(res.rows[0]) : undefined;
                if (callback) callback(null, row);
                return row;
            } finally {
                await connection.close();
            }
        })().catch(err => {
            if (callback) callback(err);
            else console.error("[DB Get Error]", err);
            throw err;
        });
    },

    all(sql, params = [], callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        return (async () => {
            const p = await getPool();
            const connection = await p.getConnection();
            try {
                const finalSql = processSql(sql);
                const res = await connection.execute(finalSql, params || []);
                const rows = (res.rows || []).map(normalizeKeys);
                if (callback) callback(null, rows);
                return rows;
            } finally {
                await connection.close();
            }
        })().catch(err => {
            if (callback) callback(err);
            else console.error("[DB All Error]", err);
            throw err;
        });
    },

    run(sql, params = [], callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        return (async () => {
            const isInsert = /^\s*INSERT\s+INTO/i.test(sql);
            const hasReturning = /RETURNING\b/i.test(sql);
            const p = await getPool();
            const connection = await p.getConnection();
            try {
                let finalSql = processSql(sql);
                let bindParams = Array.isArray(params) ? [...params] : { ...(params || {}) };
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
        })().catch(err => {
            if (callback) callback.call({ changes: 0 }, err);
            else console.error("[DB Run Error]", err);
            throw err;
        });
    },

    prepare(sql) {
        return {
            run: (params, callback) => db.run(sql, params, callback),
            finalize: () => {}
        };
    },

    serialize(cb) {
        if (cb) cb();
    }
};

module.exports = db;
