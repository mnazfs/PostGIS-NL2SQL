/**
 * Query Helper Functions
 * 
 * Utilities for processing and formatting database query results
 */

/**
 * Sanitize rows by removing null geometry fields
 * Cleans up the result set by removing geometry columns that are null
 * 
 * @param {Array<Object>} rows - Array of row objects from database
 * @returns {Array<Object>} Sanitized rows with null geometry fields removed
 */
function sanitizeRows(rows) {
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return rows;
  }

  return rows.map(row => {
    const sanitizedRow = { ...row };
    
    // Common geometry column names in PostGIS
    const geometryColumns = ['geom', 'geometry', 'geog', 'geography', 'the_geom', 'wkb_geometry'];
    
    // Remove null geometry fields
    for (const col of geometryColumns) {
      if (col in sanitizedRow && sanitizedRow[col] === null) {
        delete sanitizedRow[col];
      }
    }
    
    // Also check for any column name containing 'geom' or 'geography'
    for (const key in sanitizedRow) {
      if (sanitizedRow[key] === null && 
          (key.toLowerCase().includes('geom') || key.toLowerCase().includes('geog'))) {
        delete sanitizedRow[key];
      }
    }
    
    return sanitizedRow;
  });
}

/**
 * Extract GeoJSON from rows that contain ST_AsGeoJSON fields
 * Looks for fields that contain GeoJSON strings and parses them
 * 
 * @param {Array<Object>} rows - Array of row objects from database
 * @returns {Object} GeoJSON FeatureCollection or null if no geometry found
 */
function extractGeoJSON(rows) {
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  const features = [];
  
  for (const row of rows) {
    let geometryField = null;
    let geometryKey = null;
    
    // Look for GeoJSON fields (common names from ST_AsGeoJSON)
    const geoJsonKeys = ['geojson', 'st_asgeojson', 'json', 'geometry_json'];
    
    for (const key of geoJsonKeys) {
      if (key in row && row[key]) {
        geometryField = row[key];
        geometryKey = key;
        break;
      }
    }
    
    // If not found in common names, look for any field containing 'json' or parsed JSON objects
    if (!geometryField) {
      for (const key in row) {
        const value = row[key];
        
        // Check if it's a string that looks like GeoJSON
        if (typeof value === 'string' && 
            (value.trim().startsWith('{') || value.trim().startsWith('['))) {
          try {
            const parsed = JSON.parse(value);
            if (parsed.type && (parsed.coordinates || parsed.geometries)) {
              geometryField = parsed;
              geometryKey = key;
              break;
            }
          } catch (e) {
            // Not valid JSON, continue
          }
        }
        
        // Check if it's already a parsed object with geometry structure
        if (typeof value === 'object' && value !== null && 
            value.type && (value.coordinates || value.geometries)) {
          geometryField = value;
          geometryKey = key;
          break;
        }
      }
    }
    
    // If we found a geometry field, create a feature
    if (geometryField) {
      // Parse if it's a string
      const geometry = typeof geometryField === 'string' 
        ? JSON.parse(geometryField) 
        : geometryField;
      
      // Get properties (all fields except the geometry field)
      const properties = { ...row };
      delete properties[geometryKey];
      
      features.push({
        type: 'Feature',
        geometry: geometry,
        properties: properties
      });
    }
  }
  
  // Return FeatureCollection if we found any features
  if (features.length > 0) {
    return {
      type: 'FeatureCollection',
      features: features
    };
  }
  
  return null;
}

export { sanitizeRows, extractGeoJSON };
