/**
 * Geo Handler Service
 * 
 * Handles geospatial queries using PostGIS spatial functions
 */

import { executeSQL } from './sqlExecutor.service.js';
import { extractGeoJSON } from '../utils/queryHelpers.js';

/**
 * Handle geospatial query
 * 
 * @param {string} query - The user's geospatial query
 * @returns {Promise<object>} Formatted response with spatial results
 * @throws {Error} If geo query processing fails
 */
async function handleGeo(query) {
  try {
    console.log(`\n🗺️  Handling geospatial query: "${query}"`);
    
    // Detect query type and extract parameters
    const queryType = detectQueryType(query);
    const buildingName = extractBuildingName(query);
    const distance = extractDistance(query);
    
    console.log(`  Query type: ${queryType}`);
    console.log(`  Building: ${buildingName || 'not specified'}`);
    console.log(`  Distance: ${distance ? `${distance}m` : 'not specified'}`);
    
    let sql;
    let summary;
    
    if (queryType === 'nearest' && buildingName) {
      // Find nearest buildings to a reference building
      sql = buildNearestQuery(buildingName, distance || 1000);
      summary = `Finding buildings nearest to ${buildingName}`;
      
    } else if (queryType === 'within' && buildingName && distance) {
      // Find buildings within specified distance
      sql = buildWithinQuery(buildingName, distance);
      summary = `Finding buildings within ${distance}m of ${buildingName}`;
      
    } else if (queryType === 'distance' && buildingName) {
      // Calculate distances from a reference building
      sql = buildDistanceQuery(buildingName, distance || 1000);
      summary = `Calculating distances from ${buildingName}`;
      
    } else {
      throw new Error(
        'Unable to parse geospatial query. Please specify: ' +
        '"nearest [building]", "within X meters of [building]", or "distance from [building]"'
      );
    }
    
    console.log(`\n📝 Generated spatial SQL:\n${sql}\n`);
    
    // Execute spatial query
    console.log('⚡ Executing spatial query...');
    const results = await executeSQL(sql);
    
    console.log(`✓ Query returned ${results.length} results`);
    
    // Extract GeoJSON for map display
    const geojson = extractGeoJSON(results);
    
    // Format summary
    let formattedSummary;
    if (results.length === 0) {
      formattedSummary = 'No results found.';
    } else {
      formattedSummary = `Found ${results.length} building(s). ${summary}`;
    }
    
    console.log(`✨ Geospatial query complete\n`);
    
    return {
      success: true,
      summary: formattedSummary,
      rows: results,
      geojson: geojson,
      metadata: {
        query_type: queryType,
        reference_building: buildingName,
        distance_meters: distance
      }
    };
    
  } catch (error) {
    console.error('❌ Geo handler error:', error.message);
    throw new Error(`Failed to process geospatial query: ${error.message}`);
  }
}

/**
 * Detect the type of geospatial query
 * 
 * @param {string} query - The query text
 * @returns {string} Query type: 'nearest', 'within', or 'distance'
 */
function detectQueryType(query) {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('within') && /\d+\s*(m|meter|metre)/i.test(query)) {
    return 'within';
  }
  
  if (lowerQuery.includes('nearest') || lowerQuery.includes('closest')) {
    return 'nearest';
  }
  
  if (lowerQuery.includes('distance') || lowerQuery.includes('how far')) {
    return 'distance';
  }
  
  return 'nearest'; // Default
}

/**
 * Extract building name from query
 * 
 * @param {string} query - The query text
 * @returns {string|null} Building name or null
 */
function extractBuildingName(query) {
  // Try to extract building name from common patterns
  const patterns = [
    /(?:nearest|closest|from|to|of)\s+["']?([A-Z][^"'?.,]+)["']?/i,
    /(?:building|buildings?)\s+["']?([A-Z][^"'?.,]+)["']?/i,
    /["']([^"']+)["']/,
  ];
  
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
}

/**
 * Extract distance value from query
 * 
 * @param {string} query - The query text
 * @returns {number|null} Distance in meters or null
 */
function extractDistance(query) {
  // Match patterns like "100m", "100 meters", "500 metres"
  const match = query.match(/(\d+)\s*(m|meter|metre|km|kilometer|kilometre)/i);
  
  if (match) {
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    // Convert to meters
    if (unit.startsWith('k')) {
      return value * 1000;
    }
    return value;
  }
  
  return null;
}

/**
 * Build SQL for finding nearest buildings
 * 
 * @param {string} buildingName - Reference building name
 * @param {number} maxDistance - Maximum distance in meters
 * @returns {string} SQL query
 */
function buildNearestQuery(buildingName, maxDistance = 1000) {
  return `
WITH reference_building AS (
  SELECT "Name", geom
  FROM buildings
  WHERE "Name" ILIKE '%${sanitizeForSQL(buildingName)}%'
  LIMIT 1
)
SELECT 
  b."Name",
  ROUND(ST_Distance(b.geom::geography, rb.geom::geography)::numeric, 2) AS distance_meters,
  ST_AsGeoJSON(b.geom) AS geojson
FROM buildings b, reference_building rb
WHERE b."Name" != rb."Name"
  AND ST_DWithin(b.geom::geography, rb.geom::geography, ${maxDistance})
ORDER BY ST_Distance(b.geom::geography, rb.geom::geography)
LIMIT 10;
  `.trim();
}

/**
 * Build SQL for finding buildings within distance
 * 
 * @param {string} buildingName - Reference building name
 * @param {number} distance - Distance in meters
 * @returns {string} SQL query
 */
function buildWithinQuery(buildingName, distance) {
  return `
WITH reference_building AS (
  SELECT "Name", geom
  FROM buildings
  WHERE "Name" ILIKE '%${sanitizeForSQL(buildingName)}%'
  LIMIT 1
)
SELECT 
  b."Name",
  ROUND(ST_Distance(b.geom::geography, rb.geom::geography)::numeric, 2) AS distance_meters,
  ST_AsGeoJSON(b.geom) AS geojson
FROM buildings b, reference_building rb
WHERE b."Name" != rb."Name"
  AND ST_DWithin(b.geom::geography, rb.geom::geography, ${distance})
ORDER BY ST_Distance(b.geom::geography, rb.geom::geography)
LIMIT 50;
  `.trim();
}

/**
 * Build SQL for calculating distances
 * 
 * @param {string} buildingName - Reference building name
 * @param {number} maxDistance - Maximum distance in meters
 * @returns {string} SQL query
 */
function buildDistanceQuery(buildingName, maxDistance = 1000) {
  return buildNearestQuery(buildingName, maxDistance);
}

/**
 * Sanitize string for SQL (basic escaping)
 * 
 * @param {string} value - Value to sanitize
 * @returns {string} Sanitized value
 */
function sanitizeForSQL(value) {
  if (!value) return '';
  // Escape single quotes
  return value.replace(/'/g, "''");
}

export { handleGeo };
