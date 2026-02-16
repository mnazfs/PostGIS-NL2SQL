const { query, getClient } = require('../config/db');
const sqlValidator = require('./sqlValidator.service');

class SQLExecutor {
  constructor() {
    this.defaultTimeout = 30000; // 30 seconds
    this.maxResultRows = 10000;
  }

  // Execute SQL query with safety checks
  async execute(sql, options = {}) {
    const startTime = Date.now();
    
    try {
      // Validate SQL before execution
      const validation = sqlValidator.validate(sql);
      
      if (!validation.valid) {
        throw new Error(`SQL validation failed: ${validation.errors.join(', ')}`);
      }

      // Add safety constraints
      const safeSql = sqlValidator.addSafetyConstraints(sql, {
        maxLimit: options.maxLimit || this.maxResultRows
      });

      // Execute query with timeout
      const timeout = options.timeout || this.defaultTimeout;
      const result = await this.executeWithTimeout(safeSql, [], timeout);

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data: result.rows,
        rowCount: result.rowCount,
        executionTime,
        warnings: validation.warnings,
        sql: safeSql
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      console.error('SQL execution error:', error);
      
      return {
        success: false,
        error: error.message,
        executionTime,
        sql: sql
      };
    }
  }

  // Execute query with timeout
  async executeWithTimeout(sql, params, timeout) {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Query execution timeout after ${timeout}ms`));
      }, timeout);

      try {
        const result = await query(sql, params);
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  // Execute query and return formatted results
  async executeAndFormat(sql, options = {}) {
    const result = await this.execute(sql, options);

    if (!result.success) {
      return result;
    }

    // Format data based on options
    const format = options.format || 'json';
    
    switch (format) {
      case 'json':
        return result;
      
      case 'csv':
        return {
          ...result,
          data: this.formatAsCSV(result.data)
        };
      
      case 'geojson':
        return {
          ...result,
          data: this.formatAsGeoJSON(result.data, options.geometryColumn)
        };
      
      default:
        return result;
    }
  }

  // Format data as CSV
  formatAsCSV(data) {
    if (!data || data.length === 0) {
      return '';
    }

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = data.map(row => {
      return headers.map(header => {
        const value = row[header];
        // Escape commas and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',');
    });

    return [csvHeaders, ...csvRows].join('\n');
  }

  // Format PostGIS data as GeoJSON
  formatAsGeoJSON(data, geometryColumn = 'geom') {
    if (!data || data.length === 0) {
      return {
        type: 'FeatureCollection',
        features: []
      };
    }

    const features = data.map(row => {
      const { [geometryColumn]: geometry, ...properties } = row;
      
      return {
        type: 'Feature',
        geometry: typeof geometry === 'string' ? JSON.parse(geometry) : geometry,
        properties
      };
    });

    return {
      type: 'FeatureCollection',
      features
    };
  }

  // Test query execution without returning data
  async testQuery(sql) {
    try {
      const validation = sqlValidator.validate(sql);
      
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings
        };
      }

      // Execute EXPLAIN to test query without running it
      const explainSql = `EXPLAIN ${sql}`;
      const result = await query(explainSql);

      return {
        success: true,
        warnings: validation.warnings,
        queryPlan: result.rows
      };

    } catch (error) {
      return {
        success: false,
        errors: [error.message]
      };
    }
  }
}

// Export singleton instance
module.exports = new SQLExecutor();
