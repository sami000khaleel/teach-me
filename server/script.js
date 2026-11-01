const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: 'lr7sykrg7m.germanywestcentral.azure.clickhouse.cloud',
    port: 3306,                              // MySQL interface port, not 8443
    user: 'mysql4lr7sykrg7m',                // Dedicated username, not default
    password: 'W7qnF~y.E~zGb',               // Same as default password
    database: 'TeachMe',
    ssl: { rejectUnauthorized: true },       // ClickHouse Cloud requires TLS
  });

  const [rows] = await connection.query('SELECT 1 AS n');
  console.log('✅ SELECT 1:', rows);

  const [tables] = await connection.query('SHOW TABLES');
  console.log('✅ Tables:', tables);

  await connection.end();
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});