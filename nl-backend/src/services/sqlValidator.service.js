/**
 * SQL Validator Service
 * 
 * Strict validation of SQL queries to ensure security and correctness
 */

/**
 * Validate SQL query with strict security checks
 * 
 * @param {string} sql - The SQL query to validate
 * @param {object} schemaCache - The schema cache object from schemaCache service
 * @returns {object} { valid: true } or { valid: false, reason: "..." }
 */
function validateSQL(sql, schemaCache) {
  // Normalize SQL (trim and handle whitespace)
  const normalizedSQL = sql.trim().replace(/\s+/g, ' ');
  const upperSQL = normalizedSQL.toUpperCase();
  
  // 1. Ensure query starts with SELECT
  if (!upperSQL.startsWith('SELECT')) {
    return {
      valid: false,
      reason: 'Query must start with SELECT. Only SELECT queries are allowed.'
    };
  }
  
  // 2. Reject dangerous keywords
  const dangerousKeywords = [
    'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 
    'CREATE', 'TRUNCATE', 'GRANT', 'REVOKE', 'EXEC',
    'EXECUTE', 'CALL', 'PRAGMA'
  ];
  
  for (const keyword of dangerousKeywords) {
    // Use word boundaries to avoid false positives
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(normalizedSQL)) {
      return {
        valid: false,
        reason: `Dangerous keyword detected: ${keyword}. Only SELECT queries are allowed.`
      };
    }
  }
  
  // 3. Ensure LIMIT clause exists
  const hasLimit = /\bLIMIT\s+\d+/i.test(normalizedSQL);
  if (!hasLimit) {
    return {
      valid: false,
      reason: 'Query must include a LIMIT clause to prevent excessive data retrieval.'
    };
  }
  
  // 4. Ensure referenced tables exist in schema cache
  if (!schemaCache || !schemaCache.tables) {
    return {
      valid: false,
      reason: 'Schema cache not available for table validation.'
    };
  }
  
  // Extract potential table names from FROM and JOIN clauses
  const tableNames = extractTableNames(normalizedSQL);
  const availableTables = Object.keys(schemaCache.tables);
  
  for (const tableName of tableNames) {
    if (!availableTables.includes(tableName)) {
      return {
        valid: false,
        reason: `Table '${tableName}' does not exist in the schema. Available tables: ${availableTables.join(', ')}`
      };
    }
  }
  
  // All checks passed
  return { valid: true };
}

/**
 * Extract table names from SQL query
 * Simple regex-based extraction for FROM and JOIN clauses
 * 
 * @param {string} sql - Normalized SQL query
 * @returns {string[]} Array of table names
 */
function extractTableNames(sql) {
  const tableNames = new Set();
  
  // Match FROM clause: FROM table_name or FROM schema.table_name
  const fromMatches = sql.matchAll(/\bFROM\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)/gi);
  for (const match of fromMatches) {
    const tableName = match[1].toLowerCase();
    // If schema.table, extract just table name
    const parts = tableName.split('.');
    tableNames.add(parts[parts.length - 1]);
  }
  
  // Match JOIN clauses: JOIN table_name or JOIN schema.table_name
  const joinMatches = sql.matchAll(/\bJOIN\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)/gi);
  for (const match of joinMatches) {
    const tableName = match[1].toLowerCase();
    // If schema.table, extract just table name
    const parts = tableName.split('.');
    tableNames.add(parts[parts.length - 1]);
  }
  
  return Array.from(tableNames);
}

export { validateSQL };
