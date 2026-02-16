import { pool } from '../config/db.js';

/**
 * SQL Executor Service
 * 
 * Executes SQL queries safely with transaction support,
 * timeout enforcement, and row limits
 */

/**
 * Execute SQL query or array of queries with transaction and safety constraints
 * 
 * @param {string|string[]} sql - The SQL query or array of queries to execute
 * @returns {Promise<Array>} Array of result rows (combined if multiple queries)
 * @throws {Error} If execution fails
 */
async function executeSQL(sql) {
  // Handle array of SQL queries
  if (Array.isArray(sql)) {
    return await executeSQLArray(sql);
  }
  
  // Single SQL query
  return await executeSingleSQL(sql);
}

/**
 * Execute array of SQL queries sequentially
 * 
 * @param {string[]} sqlArray - Array of SQL queries to execute
 * @returns {Promise<Array>} Combined array of all result rows
 * @throws {Error} If any execution fails
 */
async function executeSQLArray(sqlArray) {
  const allResults = [];
  
  console.log(`Executing ${sqlArray.length} SQL queries sequentially...`);
  
  for (let i = 0; i < sqlArray.length; i++) {
    console.log(`\n→ Executing query ${i + 1}/${sqlArray.length}`);
    const results = await executeSingleSQL(sqlArray[i]);
    allResults.push(...results);
    console.log(`✓ Query ${i + 1} returned ${results.length} rows`);
  }
  
  console.log(`\n✓ All queries completed: ${allResults.length} total rows`);
  return allResults;
}

/**
 * Execute a single SQL query with transaction and safety constraints
 * 
 * @param {string} sql - The SQL query to execute
 * @returns {Promise<Array>} Array of result rows
 * @throws {Error} If execution fails
 */
async function executeSingleSQL(sql) {
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
    
    // Check if result contains geometry columns and convert them to GeoJSON
    const processedRows = await convertGeometryToGeoJSON(client, result);
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log(`✓ Query executed successfully: ${processedRows.length} rows returned`);
    return processedRows;
    
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

/**
 * Convert geometry columns to GeoJSON format
 * Detects geometry columns and converts them using ST_AsGeoJSON
 * 
 * @param {object} client - Database client
 * @param {object} result - Query result with rows and fields
 * @returns {Promise<Array>} Processed rows with geometry as GeoJSON
 */
async function convertGeometryToGeoJSON(client, result) {
  if (!result.rows || result.rows.length === 0) {
    return result.rows;
  }
  
  // Identify geometry columns by checking column names and data types
  const geometryColumns = [];
  const commonGeomNames = ['geom', 'geometry', 'geog', 'geography', 'the_geom', 'wkb_geometry', 'shape'];
  
  // Check each field in the result
  for (const field of result.fields) {
    const columnName = field.name.toLowerCase();
    
    // Check if column name suggests it's a geometry column
    const isLikelyGeometry = commonGeomNames.includes(columnName) || 
                            columnName.includes('geom') || 
                            columnName.includes('geog');
    
    // Also check if any row has Buffer data in this column (binary geometry)
    if (isLikelyGeometry || result.rows.some(row => Buffer.isBuffer(row[field.name]))) {
      // Verify at least one row has non-null geometry data
      const hasData = result.rows.some(row => 
        row[field.name] !== null && 
        row[field.name] !== undefined &&
        (Buffer.isBuffer(row[field.name]) || typeof row[field.name] === 'object')
      );
      
      if (hasData) {
        geometryColumns.push(field.name);
      }
    }
  }
  
  // If no geometry columns found, return original rows
  if (geometryColumns.length === 0) {
    return result.rows;
  }
  
  console.log(`🗺️  Detected ${geometryColumns.length} geometry column(s): ${geometryColumns.join(', ')}`);
  
  // Process each row to convert geometry columns
  const processedRows = await Promise.all(result.rows.map(async (row, rowIndex) => {
    const processedRow = { ...row };
    
    for (const geomCol of geometryColumns) {
      const geomValue = row[geomCol];
      
      if (geomValue === null || geomValue === undefined) {
        continue;
      }
      
      try {
        // Check if already a GeoJSON string
        if (typeof geomValue === 'string') {
          try {
            const parsed = JSON.parse(geomValue);
            if (parsed.type && (parsed.coordinates || parsed.geometries)) {
              processedRow[geomCol] = parsed;
              continue;
            }
          } catch (e) {
            // Not JSON, attempt conversion
          }
        }
        
        // Convert geometry to GeoJSON using ST_AsGeoJSON
        // Handle both WKB (Buffer) and geometry objects
        let conversionQuery;
        let params;
        
        if (Buffer.isBuffer(geomValue)) {
          // WKB format - convert from bytea
          conversionQuery = `SELECT ST_AsGeoJSON(ST_GeomFromWKB($1)) as geojson`;
          params = [geomValue];
        } else {
          // Try direct conversion (might be EWKB or other format)
          conversionQuery = `SELECT ST_AsGeoJSON($1::geometry) as geojson`;
          params = [geomValue];
        }
        
        const conversionResult = await client.query(conversionQuery, params);
        
        if (conversionResult.rows.length > 0 && conversionResult.rows[0].geojson) {
          const geoJSON = JSON.parse(conversionResult.rows[0].geojson);
          processedRow[geomCol] = geoJSON;
          // Also provide raw GeoJSON string for compatibility
          processedRow[`${geomCol}_json`] = conversionResult.rows[0].geojson;
        }
      } catch (convError) {
        console.warn(`⚠️  Row ${rowIndex + 1}: Could not convert geometry column '${geomCol}':`, convError.message);
        // Remove the unconvertible geometry column to avoid sending binary data
        delete processedRow[geomCol];
      }
    }
    
    return processedRow;
  }));
  
  console.log(`✓ Converted geometry columns to GeoJSON for ${processedRows.length} rows`);
  return processedRows;
}

export { executeSQL };
