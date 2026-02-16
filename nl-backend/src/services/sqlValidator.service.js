const { Parser } = require('node-sql-parser');

class SQLValidator {
  constructor() {
    this.parser = new Parser();
    this.allowedStatements = ['SELECT', 'WITH'];
    this.dangerousKeywords = [
      'DROP', 'DELETE', 'TRUNCATE', 'INSERT', 'UPDATE',
      'ALTER', 'CREATE', 'GRANT', 'REVOKE', 'EXEC',
      'EXECUTE', 'CALL', 'IMPORT', 'EXPORT'
    ];
  }

  // Validate SQL query for safety and correctness
  validate(sql) {
    const errors = [];
    const warnings = [];

    try {
      // Check for dangerous keywords
      const dangerousCheck = this.checkDangerousKeywords(sql);
      if (!dangerousCheck.safe) {
        errors.push(...dangerousCheck.errors);
      }

      // Parse SQL to check syntax
      const ast = this.parser.astify(sql, { database: 'PostgreSQL' });
      
      // Validate statement type
      const statementType = this.getStatementType(ast);
      if (!this.allowedStatements.includes(statementType)) {
        errors.push(`Statement type '${statementType}' is not allowed. Only SELECT queries are permitted.`);
      }

      // Check for potential issues
      const structureCheck = this.checkQueryStructure(ast);
      warnings.push(...structureCheck.warnings);

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        statementType,
        ast: errors.length === 0 ? ast : null
      };

    } catch (error) {
      return {
        valid: false,
        errors: [`SQL syntax error: ${error.message}`],
        warnings,
        statementType: null,
        ast: null
      };
    }
  }

  // Check for dangerous SQL keywords
  checkDangerousKeywords(sql) {
    const upperSQL = sql.toUpperCase();
    const errors = [];

    this.dangerousKeywords.forEach(keyword => {
      // Use word boundaries to avoid false positives
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(sql)) {
        errors.push(`Dangerous keyword detected: ${keyword}`);
      }
    });

    return {
      safe: errors.length === 0,
      errors
    };
  }

  // Get statement type from AST
  getStatementType(ast) {
    if (Array.isArray(ast)) {
      return ast[0]?.type?.toUpperCase() || 'UNKNOWN';
    }
    return ast?.type?.toUpperCase() || 'UNKNOWN';
  }

  // Check query structure for potential issues
  checkQueryStructure(ast) {
    const warnings = [];
    
    // This is a simplified check - expand based on needs
    if (Array.isArray(ast)) {
      const selectAst = ast[0];
      
      // Check for SELECT *
      if (selectAst.columns === '*') {
        warnings.push('Query uses SELECT * which may return excessive data');
      }

      // Check for missing LIMIT clause
      if (!selectAst.limit) {
        warnings.push('Query does not have a LIMIT clause - consider adding one to prevent large result sets');
      }

      // Check for excessive LIMIT
      if (selectAst.limit && selectAst.limit.value) {
        const limitValue = selectAst.limit.value[0]?.value;
        if (limitValue > 1000) {
          warnings.push(`Large LIMIT value (${limitValue}) may return excessive data`);
        }
      }
    }

    return { warnings };
  }

  // Sanitize SQL by removing comments and normalizing whitespace
  sanitize(sql) {
    // Remove single-line comments
    sql = sql.replace(/--[^\n]*/g, '');
    
    // Remove multi-line comments
    sql = sql.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Normalize whitespace
    sql = sql.replace(/\s+/g, ' ').trim();
    
    return sql;
  }

  // Add safety constraints to query (LIMIT, timeout)
  addSafetyConstraints(sql, options = {}) {
    const maxLimit = options.maxLimit || 1000;
    const sanitized = this.sanitize(sql);
    
    // Check if query already has LIMIT
    const hasLimit = /LIMIT\s+\d+/i.test(sanitized);
    
    if (!hasLimit) {
      // Add LIMIT clause
      return `${sanitized} LIMIT ${maxLimit}`;
    }
    
    return sanitized;
  }
}

// Export singleton instance
module.exports = new SQLValidator();
