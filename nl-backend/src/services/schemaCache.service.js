const { query } = require('../config/db');

class SchemaCache {
  constructor() {
    this.cache = null;
    this.lastUpdated = null;
    this.cacheDuration = 1000 * 60 * 60; // 1 hour in milliseconds
  }

  // Get schema from cache or fetch if expired
  async getSchema() {
    if (this.isCacheValid()) {
      console.log('Returning cached schema');
      return this.cache;
    }

    console.log('Fetching fresh schema from database');
    return await this.refreshCache();
  }

  // Check if cache is still valid
  isCacheValid() {
    if (!this.cache || !this.lastUpdated) {
      return false;
    }
    const now = Date.now();
    return (now - this.lastUpdated) < this.cacheDuration;
  }

  // Fetch and cache schema information
  async refreshCache() {
    try {
      const schema = {
        tables: await this.fetchTables(),
        columns: await this.fetchColumns(),
        spatialColumns: await this.fetchSpatialColumns(),
        relationships: await this.fetchRelationships(),
      };

      this.cache = schema;
      this.lastUpdated = Date.now();
      
      return schema;
    } catch (error) {
      console.error('Error refreshing schema cache:', error);
      throw error;
    }
  }

  // Fetch all tables
  async fetchTables() {
    const result = await query(`
      SELECT 
        table_schema,
        table_name,
        table_type
      FROM information_schema.tables
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_schema, table_name
    `);
    return result.rows;
  }

  // Fetch all columns with their data types
  async fetchColumns() {
    const result = await query(`
      SELECT 
        table_schema,
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_schema, table_name, ordinal_position
    `);
    return result.rows;
  }

  // Fetch PostGIS spatial columns
  async fetchSpatialColumns() {
    try {
      const result = await query(`
        SELECT 
          f_table_schema,
          f_table_name,
          f_geometry_column,
          coord_dimension,
          srid,
          type
        FROM geometry_columns
      `);
      return result.rows;
    } catch (error) {
      // PostGIS might not be installed
      console.warn('Could not fetch spatial columns:', error.message);
      return [];
    }
  }

  // Fetch foreign key relationships
  async fetchRelationships() {
    const result = await query(`
      SELECT
        tc.table_schema,
        tc.table_name,
        kcu.column_name,
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY tc.table_schema, tc.table_name
    `);
    return result.rows;
  }

  // Get schema summary as text for LLM context
  getSchemaDescription() {
    if (!this.cache) {
      return 'Schema not loaded';
    }

    const { tables, columns, spatialColumns } = this.cache;
    
    let description = 'Database Schema:\n\n';
    
    // Group columns by table
    const tableMap = {};
    columns.forEach(col => {
      const key = `${col.table_schema}.${col.table_name}`;
      if (!tableMap[key]) {
        tableMap[key] = [];
      }
      tableMap[key].push(col);
    });

    // Build description
    Object.keys(tableMap).forEach(tableKey => {
      const cols = tableMap[tableKey];
      description += `Table: ${tableKey}\n`;
      description += 'Columns:\n';
      cols.forEach(col => {
        description += `  - ${col.column_name} (${col.data_type})`;
        if (col.is_nullable === 'NO') description += ' NOT NULL';
        description += '\n';
      });
      
      // Add spatial info if available
      const spatialInfo = spatialColumns.find(
        sc => `${sc.f_table_schema}.${sc.f_table_name}` === tableKey
      );
      if (spatialInfo) {
        description += `  Spatial Column: ${spatialInfo.f_geometry_column} (${spatialInfo.type}, SRID: ${spatialInfo.srid})\n`;
      }
      description += '\n';
    });

    return description;
  }
}

// Export singleton instance
module.exports = new SchemaCache();
