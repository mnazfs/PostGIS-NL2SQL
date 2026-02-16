/**
 * Input sanitization utilities
 */

class Sanitizer {
  // Sanitize user input to prevent injection attacks
  sanitizeInput(input) {
    if (typeof input !== 'string') {
      return input;
    }

    // Remove null bytes
    let sanitized = input.replace(/\0/g, '');

    // Trim whitespace
    sanitized = sanitized.trim();

    // Limit length
    const maxLength = 10000;
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  }

  // Sanitize object by sanitizing all string values
  sanitizeObject(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const sanitized = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeInput(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  // Escape special characters for SQL LIKE patterns
  escapeLikePattern(pattern) {
    if (typeof pattern !== 'string') {
      return pattern;
    }
    
    // Escape special LIKE characters: %, _, \
    return pattern
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_');
  }

  // Remove potentially dangerous characters from identifiers
  sanitizeIdentifier(identifier) {
    if (typeof identifier !== 'string') {
      return identifier;
    }

    // Allow only alphanumeric, underscore, and dot
    return identifier.replace(/[^a-zA-Z0-9_.]/g, '');
  }

  // Validate and sanitize table name
  sanitizeTableName(tableName) {
    if (typeof tableName !== 'string') {
      throw new Error('Table name must be a string');
    }

    const sanitized = this.sanitizeIdentifier(tableName);
    
    // Check if sanitized name is different from original
    if (sanitized !== tableName) {
      throw new Error('Invalid characters in table name');
    }

    // Check for valid format (schema.table or just table)
    const parts = sanitized.split('.');
    if (parts.length > 2) {
      throw new Error('Invalid table name format');
    }

    return sanitized;
  }

  // Validate email format
  isValidEmail(email) {
    if (typeof email !== 'string') {
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate UUID format
  isValidUUID(uuid) {
    if (typeof uuid !== 'string') {
      return false;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  // Remove HTML tags
  stripHtmlTags(input) {
    if (typeof input !== 'string') {
      return input;
    }

    return input.replace(/<[^>]*>/g, '');
  }

  // Encode HTML special characters
  encodeHtml(input) {
    if (typeof input !== 'string') {
      return input;
    }

    const htmlEntities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };

    return input.replace(/[&<>"'/]/g, char => htmlEntities[char]);
  }

  // Validate numeric input
  sanitizeNumber(value, options = {}) {
    const num = Number(value);
    
    if (isNaN(num)) {
      if (options.default !== undefined) {
        return options.default;
      }
      throw new Error('Invalid number');
    }

    // Check min/max bounds
    if (options.min !== undefined && num < options.min) {
      return options.min;
    }
    
    if (options.max !== undefined && num > options.max) {
      return options.max;
    }

    return num;
  }

  // Validate boolean input
  sanitizeBoolean(value) {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      if (lower === 'true' || lower === '1' || lower === 'yes') {
        return true;
      }
      if (lower === 'false' || lower === '0' || lower === 'no') {
        return false;
      }
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    return false;
  }
}

// Export singleton instance
const sanitizer = new Sanitizer();

module.exports = {
  sanitizeInput: sanitizer.sanitizeInput.bind(sanitizer),
  sanitizeObject: sanitizer.sanitizeObject.bind(sanitizer),
  escapeLikePattern: sanitizer.escapeLikePattern.bind(sanitizer),
  sanitizeIdentifier: sanitizer.sanitizeIdentifier.bind(sanitizer),
  sanitizeTableName: sanitizer.sanitizeTableName.bind(sanitizer),
  isValidEmail: sanitizer.isValidEmail.bind(sanitizer),
  isValidUUID: sanitizer.isValidUUID.bind(sanitizer),
  stripHtmlTags: sanitizer.stripHtmlTags.bind(sanitizer),
  encodeHtml: sanitizer.encodeHtml.bind(sanitizer),
  sanitizeNumber: sanitizer.sanitizeNumber.bind(sanitizer),
  sanitizeBoolean: sanitizer.sanitizeBoolean.bind(sanitizer),
};
