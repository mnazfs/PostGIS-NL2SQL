import { pool } from '../config/db.js';

/**
 * SQL Executor Service
 * 
 * Executes SQL queries safely with transaction support,
 * timeout enforcement, and row limits
 */

/**
 * Execute SQL query with transaction and safety constraints
 * 
 * @param {string} sql - The SQL query to execute
 * @returns {Promise<Array>} Array of result rows
 * @throws {Error} If execution fails
 */
async function executeSQL(sql) {
  const client = await pool.connect();
  
  try {
    // Begin transaction
    await client.query('BEGIN');
    
    // Get configuration from environment variables
    const statementTimeout = process.env.STATEMENT_TIMEOUT || 5000; // Default 5 seconds
    const maxRows = parseInt(process.env.MAX_ROWS) || 50; // Default 50 rows
    
    // Set local statement timeout for this transaction
    await client.query(`SET LOCAL statement_timeout = ${statementTimeout}`);
    
    // Execute the query
    console.log(`Executing SQL with timeout ${statementTimeout}ms, max rows ${maxRows}`);
    const result = await client.query(sql);
    
    // Enforce max rows limit
    if (result.rows.length > maxRows) {
      throw new Error(
        `Query returned ${result.rows.length} rows, which exceeds the maximum allowed (${maxRows}). ` +
        `Please add a more restrictive LIMIT clause.`
      );
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log(`✓ Query executed successfully: ${result.rows.length} rows returned`);
    return result.rows;
    
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
    console.error('SQL execution error:', error.message);
    
    // Provide more specific error messages
    if (error.message.includes('statement timeout')) {
      throw new Error(
        `Query execution timed out after ${process.env.STATEMENT_TIMEOUT || 5000}ms. ` +
        `Please simplify your query or add more specific filters.`
      );
    }
    
    throw error;
    
  } finally {
    // Always release the client back to the pool
    client.release();
  }
}

export { executeSQL };
