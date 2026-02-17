import { query } from '../config/db.js';

/**
 * Schema Cache Service
 * 
 * Fetches and stores database schema information in memory:
 * - Tables in public schema
 * - Columns with their data types
 * - Sample distinct values for text/varchar columns (up to 20)
 */

// In-memory cache
let schemaCache = null;

/**
 * Fetch all tables in the public schema
 */
async function fetchTables() {
  const result = await query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  
  return result.rows.map(row => row.table_name);
}

/**
 * Fetch columns for a specific table
 */
async function fetchTableColumns(tableName) {
  const result = await query(`
    SELECT 
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);
  
  return result.rows;
}

/**
 * Fetch up to 20 distinct values for a text/varchar column
 */
async function fetchDistinctValues(tableName, columnName) {
  try {
    // Use double quotes to preserve case sensitivity in PostgreSQL
    const result = await query(`
      SELECT DISTINCT "${columnName}"
      FROM public."${tableName}"
      WHERE "${columnName}" IS NOT NULL
      LIMIT 20
    `);
    
    return result.rows.map(row => row[columnName]);
  } catch (error) {
    console.error(`Error fetching distinct values for ${tableName}.${columnName}:`, error.message);
    return [];
  }
}

/**
 * Check if column is a text type
 */
function isTextColumn(dataType) {
  const textTypes = [
    'character varying',
    'varchar',
    'character',
    'char',
    'text'
  ];
  return textTypes.includes(dataType.toLowerCase());
}

/**
 * Initialize the schema cache
 * Fetches all tables, columns, and sample values
 */
async function initializeSchemaCache() {
  try {
    console.log('🔄 Initializing schema cache...');
    
    const tables = await fetchTables();
    console.log(`📊 Found ${tables.length} tables in public schema`);
    
    const schema = {};
    
    for (const tableName of tables) {
      console.log(`  📋 Processing table: ${tableName}`);
      
      const columns = await fetchTableColumns(tableName);
      const tableSchema = {};
      
      for (const column of columns) {
        const columnInfo = {
          name: column.column_name,
          dataType: column.data_type,
          nullable: column.is_nullable === 'YES',
          default: column.column_default,
        };
        
        // Fetch distinct values for text columns
        if (isTextColumn(column.data_type)) {
          columnInfo.sampleValues = await fetchDistinctValues(
            tableName,
            column.column_name
          );
          
          if (columnInfo.sampleValues.length > 0) {
            console.log(`    ✓ ${column.column_name}: ${columnInfo.sampleValues.length} sample values`);
          }
        }
        
        tableSchema[column.column_name] = columnInfo;
      }
      
      schema[tableName] = {
        name: tableName,
        columns: tableSchema,
      };
    }
    
    schemaCache = {
      tables: schema,
      lastUpdated: new Date(),
      tableCount: tables.length,
    };
    
    console.log('✅ Schema cache initialized successfully');
    console.log(`📈 Cached ${tables.length} tables with column metadata and sample values`);
    
    return schemaCache;
    
  } catch (error) {
    console.error('❌ Error initializing schema cache:', error);
    throw error;
  }
}

/**
 * Get the current schema cache
 * Returns null if cache hasn't been initialized
 */
function getSchemaCache() {
  if (!schemaCache) {
    console.warn('⚠️  Schema cache not initialized. Call initializeSchemaCache() first.');
    return null;
  }
  
  return schemaCache;
}

/**
 * Check if identifier needs quoting (has mixed case, spaces, or special chars)
 */
function needsQuoting(identifier) {
  // Check if it has uppercase letters (mixed case)
  if (/[A-Z]/.test(identifier)) {
    return true;
  }
  // Check if it has spaces or starts with a number
  if (/\s/.test(identifier) || /^\d/.test(identifier)) {
    return true;
  }
  return false;
}

/**
 * Format identifier with quotes if needed
 */
function formatIdentifier(identifier) {
  if (needsQuoting(identifier)) {
    return `"${identifier}"`;
  }
  return identifier;
}

/**
 * Get a formatted schema description for LLM context
 */
function getSchemaDescription() {
  const cache = getSchemaCache();
  
  if (!cache) {
    return 'Schema cache not initialized';
  }
  
  let description = 'Database Schema (Public Schema):\n\n';
  description += 'IMPORTANT: PostgreSQL is case-sensitive. Column/table names with mixed case MUST be quoted with double quotes.\n\n';
  
  Object.values(cache.tables).forEach(table => {
    const tableName = formatIdentifier(table.name);
    description += `Table: ${tableName}\n`;
    description += 'Columns:\n';
    
    Object.values(table.columns).forEach(column => {
      const columnName = formatIdentifier(column.name);
      description += `  - ${columnName} (${column.dataType})`;
      
      if (!column.nullable) {
        description += ' NOT NULL';
      }
      
      if (column.sampleValues && column.sampleValues.length > 0) {
        description += `\n    Sample values: ${column.sampleValues.slice(0, 5).join(', ')}`;
        if (column.sampleValues.length > 5) {
          description += ` ... (${column.sampleValues.length} total)`;
        }
      }
      
      description += '\n';
    });
    
    description += '\n';
  });
  
  return description;
}

export { 
  initializeSchemaCache, 
  getSchemaCache,
  getSchemaDescription 
};
