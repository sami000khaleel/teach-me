const mysql = require('mysql2/promise');
require('dotenv').config();

// -------------------------------------------------------------------
// Validate required env vars early
// -------------------------------------------------------------------
const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`❌ Missing required env var: ${key}`);
    process.exit(1);
  }
}

// -------------------------------------------------------------------
// Connection pool (ClickHouse Cloud MySQL-interface)
//   DB_PORT must be 3306 (MySQL wire port), not 8443.
//   DB_USER must be mysql4<subdomain>, not default.
//   TLS is mandatory on ClickHouse Cloud.
// -------------------------------------------------------------------
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: true },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

// -------------------------------------------------------------------
// Startup connectivity check (non-fatal warning)
// -------------------------------------------------------------------
(async () => {
  try {
    const conn = await pool.getConnection();
    await conn.query('SELECT 1');
    conn.release();
    console.log('✅ MySQL (ClickHouse) pool ready');
  } catch (err) {
    console.error('⚠️  MySQL pool connectivity check failed:', err.message);
    console.error('   → Check DB_HOST / DB_PORT=3306 / DB_USER=mysql4... / SSL');
  }
})();

// -------------------------------------------------------------------
// executeQuery
//   - SELECT / SHOW / DESCRIBE / WITH  → returns rows array
//   - everything else                  → returns { affectedRows }
//
// Notes for ClickHouse's MySQL shim:
//   • No transactions (BEGIN/COMMIT/ROLLBACK are invalid)
//   • No AUTO_INCREMENT — pass id values explicitly
//   • UPDATE/DELETE need ALTER TABLE ... UPDATE/DELETE ... WHERE ...
//   • LIMIT x, y is unsupported — use LIMIT y OFFSET x
// -------------------------------------------------------------------
async function executeQuery(query, params = []) {
  let connection;
  try {
    connection = await pool.getConnection();

    const [result] = await connection.query(query, params);

    // mysql2 returns:
    //   - array of RowDataPacket for SELECT/SHOW/DESCRIBE
    //   - ResultSetHeader { affectedRows, insertId, ... } for writes
    if (Array.isArray(result)) {
      return result;
    }
    return {
      affectedRows: result.affectedRows ?? 0,
      insertId: result.insertId ?? null,
    };
  } catch (error) {
    console.error('❌ Query error:', error.message);
    console.error('   SQL:', query.trim().slice(0, 200));
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

module.exports = executeQuery;