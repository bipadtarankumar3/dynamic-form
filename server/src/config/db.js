// server/src/config/db.js
// Raw pg Pool — one pool per company deployment (reads DB_NAME from .env)
// All new modules use this instead of Sequelize.

require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,                    // max connections in pool
  idleTimeoutMillis: 30000,   // close idle connections after 30s
  connectionTimeoutMillis: 5000,
  application_name: process.env.APP_NAME || "csrplatform-api",
});

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error("[DB] Failed to connect to PostgreSQL:", err.message);
    process.exit(1);
  }
  release();
  console.log(`[DB] Connected to PostgreSQL — database: ${process.env.DB_NAME}`);
});

pool.on("error", (err) => {
  console.error("[DB] Unexpected error on idle pg client:", err.message);
});

/**
 * Execute a parameterized query.
 * @param {string} text  SQL query string with $1, $2 ... placeholders
 * @param {Array}  params  Array of parameter values
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = (text, params) => pool.query(text, params);

/**
 * Get a client from the pool for transactions.
 * Always call client.release() in a finally block.
 * @returns {Promise<import('pg').PoolClient>}
 */
const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
