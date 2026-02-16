import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Configuration
export const config = {
  // Database configuration
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },
  // NLP Service configuration
  nlpServiceUrl: process.env.NLP_SERVICE_URL || 'http://localhost:8000',
  // Query configuration
  maxRows: parseInt(process.env.MAX_ROWS) || 50,
  statementTimeout: parseInt(process.env.STATEMENT_TIMEOUT) || 5000,
};

// Create a connection pool
const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('Database connected successfully at:', result.rows[0].now);
    client.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    throw error;
  }
};

// Query helper function
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('Query error:', error.message);
    throw error;
  }
};

// Get a client from the pool for transactions
const getClient = async () => {
  return await pool.connect();
};

export { pool, query, getClient, testConnection };
