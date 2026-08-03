/**
 * CLI Tool for querying and searching (grepping) Oracle DB data without DBeaver.
 * Usage:
 *   node scratch/grep_db.js                            (List all tables and row counts)
 *   node scratch/grep_db.js <tableName> [limit]        (Show first N rows of table)
 *   node scratch/grep_db.js --search <keyword>        (Search keyword across ALL text columns in ALL tables)
 *   node scratch/grep_db.js --table <tableName> --grep <keyword> (Search keyword in specific table)
 *   node scratch/grep_db.js --schema <tableName>      (Show columns and data types)
 */

const db = require('../config/database');
const oracledb = require('oracledb');

const args = process.argv.slice(2);

async function main() {
    try {
        if (args.length === 0) {
            await listTables();
        } else if (args[0] === '--search') {
            const keyword = args[1];
            if (!keyword) {
                console.log("Usage: node scratch/grep_db.js --search <keyword>");
                process.exit(1);
            }
            await searchAllTables(keyword);
        } else if (args[0] === '--schema') {
            const tableName = args[1];
            if (!tableName) {
                console.log("Usage: node scratch/grep_db.js --schema <tableName>");
                process.exit(1);
            }
            await showSchema(tableName);
        } else if (args[0] === '--table' || args.includes('--grep')) {
            const tableIdx = args.indexOf('--table');
            const grepIdx = args.indexOf('--grep');
            const tableName = tableIdx !== -1 ? args[tableIdx + 1] : args[0];
            const keyword = grepIdx !== -1 ? args[grepIdx + 1] : null;

            if (keyword) {
                await grepTable(tableName, keyword);
            } else {
                await showTableRows(tableName, 20);
            }
        } else {
            const tableName = args[0];
            const limit = parseInt(args[1] || '20', 10);
            await showTableRows(tableName, limit);
        }
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        process.exit(0);
    }
}

async function listTables() {
    console.log("\n=========================================");
    console.log("      ORACLE DB TABLES SUMMARY");
    console.log("=========================================");
    const tables = await db.all("SELECT table_name FROM user_tables ORDER BY table_name");
    
    for (const t of tables) {
        const name = t.table_name;
        try {
            const countRes = await db.get(`SELECT COUNT(*) AS total FROM ${name}`);
            console.log(`- ${name.padEnd(25)} (${countRes.total} rows)`);
        } catch (e) {
            console.log(`- ${name.padEnd(25)} (Error counting)`);
        }
    }
    console.log("\nTips:");
    console.log("  node scratch/grep_db.js <tableName> [limit]");
    console.log("  node scratch/grep_db.js --search <keyword>");
    console.log("  node scratch/grep_db.js --schema <tableName>\n");
}

async function showTableRows(tableName, limit = 20) {
    console.log(`\n--- First ${limit} rows of table: ${tableName.toUpperCase()} ---`);
    const rows = await db.all(`SELECT * FROM ${tableName} ORDER BY 1 DESC FETCH NEXT ${limit} ROWS ONLY`);
    if (!rows || rows.length === 0) {
        console.log("No data found.");
        return;
    }
    console.table(rows);
    console.log(`Total displayed: ${rows.length} rows.\n`);
}

async function showSchema(tableName) {
    console.log(`\n--- Schema for table: ${tableName.toUpperCase()} ---`);
    const columns = await db.all(
        `SELECT column_name, data_type, data_length, nullable 
         FROM user_tab_columns 
         WHERE table_name = UPPER(?) 
         ORDER BY column_id`,
        [tableName]
    );
    if (!columns || columns.length === 0) {
        console.log("Table not found or no columns.");
        return;
    }
    console.table(columns);
}

async function grepTable(tableName, keyword) {
    console.log(`\n--- Searching for "${keyword}" in table: ${tableName.toUpperCase()} ---`);
    const columns = await db.all(
        `SELECT column_name, data_type 
         FROM user_tab_columns 
         WHERE table_name = UPPER(?) 
         AND data_type IN ('VARCHAR2', 'NVARCHAR2', 'CLOB', 'CHAR', 'NUMBER')`,
        [tableName]
    );

    if (!columns || columns.length === 0) {
        console.log("No searchable columns found.");
        return;
    }

    const whereClauses = columns.map(c => {
        if (c.data_type === 'NUMBER') {
            return `TO_CHAR("${c.column_name}") LIKE :kw`;
        }
        return `UPPER("${c.column_name}") LIKE UPPER(:kw)`;
    });

    const sql = `SELECT * FROM ${tableName} WHERE ${whereClauses.join(' OR ')} FETCH NEXT 50 ROWS ONLY`;
    const searchPattern = `%${keyword}%`;
    
    // Bind parameter for each condition
    const params = Array(columns.length).fill(searchPattern);
    const rows = await db.all(sql, params);

    if (!rows || rows.length === 0) {
        console.log(`No records matching "${keyword}".`);
    } else {
        console.table(rows);
        console.log(`Found ${rows.length} matching rows.\n`);
    }
}

async function searchAllTables(keyword) {
    console.log(`\n=========================================`);
    console.log(`   SEARCHING FOR "${keyword}" ACROSS DB`);
    console.log(`=========================================\n`);

    const tables = await db.all("SELECT table_name FROM user_tables ORDER BY table_name");

    let totalMatches = 0;
    for (const t of tables) {
        const name = t.table_name;
        const columns = await db.all(
            `SELECT column_name, data_type 
             FROM user_tab_columns 
             WHERE table_name = UPPER(?) 
             AND data_type IN ('VARCHAR2', 'NVARCHAR2', 'CLOB', 'CHAR', 'NUMBER')`,
            [name]
        );

        if (!columns || columns.length === 0) continue;

        const whereClauses = columns.map(c => {
            if (c.data_type === 'NUMBER') {
                return `TO_CHAR("${c.column_name}") LIKE :kw`;
            }
            return `UPPER("${c.column_name}") LIKE UPPER(:kw)`;
        });

        const sql = `SELECT * FROM ${name} WHERE ${whereClauses.join(' OR ')} FETCH NEXT 10 ROWS ONLY`;
        const searchPattern = `%${keyword}%`;
        const params = Array(columns.length).fill(searchPattern);

        try {
            const rows = await db.all(sql, params);
            if (rows && rows.length > 0) {
                console.log(`\n📌 Table [${name}] - ${rows.length} match(es):`);
                console.table(rows);
                totalMatches += rows.length;
            }
        } catch (err) {
            // Ignore individual table search errors if type mismatch
        }
    }

    if (totalMatches === 0) {
        console.log(`No matches found for "${keyword}" in any table.\n`);
    } else {
        console.log(`\nTotal matches found: ${totalMatches}\n`);
    }
}

main();
