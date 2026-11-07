const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// -------------------------------------------------------------------
// Validate required env vars early
// -------------------------------------------------------------------
const required = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`❌ Missing required env var: ${key}`);
    process.exit(1);
  }
}

// -------------------------------------------------------------------
// CA certificate (Aiven MySQL requires TLS with their CA)
//   .gitignore excludes *.pem / *.crt, so the file is NOT on Render.
//   On Render put the certificate text in the env var DB_CA
//   (Aiven Console → MySQL → CA certificate → copy everything,
//   including the BEGIN/END lines). Locally you can keep ca.pem instead.
// -------------------------------------------------------------------
let CA;
if (process.env.DB_CA) {
  CA = process.env.DB_CA.replace(/\\n/g, "\n");
} else {
  const CA_PATH = path.join(__dirname, "../", "ca.pem");
  if (!fs.existsSync(CA_PATH)) {
    console.error("❌ No CA certificate: set the DB_CA env var (Render) or add ca.pem (local)");
    process.exit(1);
  }
  CA = fs.readFileSync(CA_PATH);
}

// -------------------------------------------------------------------
// Connection pool (Aiven MySQL)
// -------------------------------------------------------------------
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    ca: CA,
    rejectUnauthorized: true,
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

// -------------------------------------------------------------------
// Startup connectivity check
// -------------------------------------------------------------------
(async () => {
  try {
    const conn = await pool.getConnection();
    await conn.query('SELECT 1');
    conn.release();
    console.log('✅ MySQL pool ready');
  } catch (err) {
    console.error('❌ MySQL pool connectivity check failed:', err.message);
    console.error('   Check DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_CA');
    process.exit(1);
  }
})();

// -------------------------------------------------------------------
// executeQuery
//   - SELECT / SHOW / DESCRIBE / WITH  → returns rows array
//   - INSERT / UPDATE / DELETE / DDL   → returns { affectedRows, insertId }
//
// Real MySQL (Aiven): transactions, AUTO_INCREMENT, foreign keys,
// LIMIT x, y all work normally.
// -------------------------------------------------------------------
async function executeQuery(query, params = []) {
  let connection;
  try {
    connection = await pool.getConnection();
    const [result] = await connection.query(query, params);

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
