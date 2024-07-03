const mysql = require('mysql2/promise');

// Create a connection pool to the MySQL database
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Sami@khalil242761',
  database: 'project',
  port: 3306
});

// Function to execute a query
async function executeQuery(query, params = []) {
  try {
    // Get a connection from the pool
    const connection = await pool.getConnection();
    
    // Execute the query
    const [rows, fields] = await connection.query(query, params);
    
    // Release the connection back to the pool
    connection.release();
    return rows;
    
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
}


module.exports = executeQuery;