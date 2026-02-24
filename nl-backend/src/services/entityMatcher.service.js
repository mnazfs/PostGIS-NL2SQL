import { executeSQL } from './sqlExecutor.service.js';

/**
 * Entity Matcher Service
 * 
 * Performs deterministic entity matching against database values
 */

// Comprehensive stopwords list including domain-specific terms
const STOPWORDS = new Set([
  // Question words
  'how', 'what', 'where', 'when', 'why', 'which', 'who',
  // Common words
  'is', 'are', 'the', 'a', 'an', 'in', 'of', 'for', 'to', 'at', 'on',
  'and', 'or', 'but', 'with', 'from', 'by', 'about',
  // Domain-specific generic terms
  'building', 'buildings', 'floor', 'floors', 'number', 'many',
  'count', 'total', 'list', 'show', 'get', 'find', 'tell', 'me'
]);

/**
 * Calculate similarity between two strings using simple algorithm
 * 
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score between 0 and 1
 */
function calculateSimilarity(str1, str2) {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  // Exact match
  if (s1 === s2) return 1.0;
  
  // Contains match
  if (s2.includes(s1) || s1.includes(s2)) return 0.8;
  
  // Calculate Levenshtein-like similarity
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }
  
  return matches / longer.length;
}

/**
 * Find best matching value from a list of possible values
 * 
 * @param {string} userTerm - The term extracted from user query
 * @param {string[]} possibleValues - List of possible values from database
 * @param {number} cutoff - Minimum similarity threshold (default 0.75)
 * @returns {object|null} Match object with {value, confidence} or null if no match above cutoff
 */
function findBestMatch(userTerm, possibleValues, cutoff = 0.75) {
  if (!userTerm || !possibleValues || possibleValues.length === 0) {
    return null;
  }
  
  const userTermLower = userTerm.toLowerCase();
  
  // PRIORITY 1: Try exact substring match first
  for (const value of possibleValues) {
    const valueLower = value.toLowerCase();
    
    // Check if user term is contained in database value
    if (valueLower.includes(userTermLower)) {
      console.log(`  🎯 Exact substring match: "${userTerm}" found in "${value}"`);
      return {
        value: value,
        confidence: 1.0
      };
    }
    
    // Check if database value is contained in user term
    if (userTermLower.includes(valueLower)) {
      console.log(`  🎯 Exact substring match: "${value}" found in "${userTerm}"`);
      return {
        value: value,
        confidence: 1.0
      };
    }
  }
  
  // PRIORITY 2: Try fuzzy matching with high threshold
  console.log(`  🔍 No exact match, trying fuzzy matching (threshold: ${cutoff})...`);
  
  let bestMatch = null;
  let bestScore = cutoff;
  
  for (const value of possibleValues) {
    const score = calculateSimilarity(userTerm, value);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = value;
    }
  }
  
  if (bestMatch) {
    return {
      value: bestMatch,
      confidence: bestScore
    };
  }
  
  return null;
}

/**
 * Extract possible search terms from user query
 * 
 * @param {string} query - User's natural language query
 * @returns {string[]} Array of potential entity names to match
 */
function extractSearchTerms(query) {
  // Step 1: Lowercase
  const lowerQuery = query.toLowerCase();
  
  // Step 2: Remove punctuation but preserve spaces
  const noPunctuation = lowerQuery.replace(/[^\w\s]/g, ' ');
  
  // Step 3: Split into words
  const words = noPunctuation.split(/\s+/).filter(w => w.length > 0);
  
  // Step 4: Filter out stopwords and numbers
  const filtered = words.filter(word => 
    word.length > 1 &&  // At least 2 characters
    !STOPWORDS.has(word) &&  // Not a stopword
    !/^\d+$/.test(word)  // Not a pure number
  );
  
  // Step 5: Also try to extract capitalized sequences from original query (likely proper nouns)
  const capitalizedPattern = /\b[A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*)*\b/g;
  const capitalizedMatches = query.match(capitalizedPattern) || [];
  
  // Clean and add capitalized matches
  const capitalizedTerms = capitalizedMatches
    .map(m => m.toLowerCase())
    .filter(term => !STOPWORDS.has(term));
  
  // Combine and deduplicate
  const allTerms = [...new Set([...filtered, ...capitalizedTerms])];
  
  return allTerms;
}

/**
 * Get distinct values from a table column
 * 
 * @param {string} tableName - Name of the table
 * @param {string} columnName - Name of the column
 * @returns {Promise<string[]>} Array of distinct values
 */
async function getDistinctValues(tableName, columnName) {
  try {
    const sql = `SELECT DISTINCT "${columnName}" FROM "${tableName}" WHERE "${columnName}" IS NOT NULL LIMIT 100`;
    const results = await executeSQL(sql);
    return results.map(row => row[columnName]).filter(val => val && val.trim());
  } catch (error) {
    console.error(`Failed to get distinct values from ${tableName}.${columnName}:`, error.message);
    return [];
  }
}

/**
 * Perform entity matching for a user query against a specific table
 * 
 * @param {string} userQuery - The user's natural language query
 * @param {string} tableName - The table to search in
 * @param {string} columnName - The column containing entity names (default: "Name")
 * @returns {Promise<object|null>} Match result with {value, confidence, matched_term} or null
 */
async function matchEntity(userQuery, tableName, columnName = 'Name') {
  console.log(`\n🔍 Entity Matching: Searching for entities in ${tableName}.${columnName}...`);
  
  // Extract search terms from query
  const searchTerms = extractSearchTerms(userQuery);
  console.log(`📌 Extracted search terms: [${searchTerms.join(', ')}]`);
  
  if (searchTerms.length === 0) {
    console.log('⚠️  No valid search terms found after filtering stopwords');
    return null;
  }
  
  // Get distinct values from database
  const possibleValues = await getDistinctValues(tableName, columnName);
  console.log(`📊 Found ${possibleValues.length} distinct values in database`);
  
  if (possibleValues.length === 0) {
    console.log('⚠️  No values found in database');
    return null;
  }
  
  // Try each search term and find the best overall match
  let bestMatch = null;
  let bestConfidence = 0;
  let bestTerm = null;
  
  for (const term of searchTerms) {
    const matchResult = findBestMatch(term, possibleValues, 0.75);
    
    if (matchResult && matchResult.confidence > bestConfidence) {
      bestConfidence = matchResult.confidence;
      bestMatch = matchResult.value;
      bestTerm = term;
      
      console.log(`  ✓ "${term}" → "${matchResult.value}" (confidence: ${(matchResult.confidence * 100).toFixed(0)}%)`);
      
      // If we found a perfect match, stop searching
      if (matchResult.confidence === 1.0) {
        break;
      }
    }
  }
  
  // Only return if confidence is above 75%
  if (bestMatch && bestConfidence >= 0.75) {
    console.log(`\n✅ Best match: "${bestMatch}" for term "${bestTerm}" (confidence: ${(bestConfidence * 100).toFixed(0)}%)`);
    return {
      value: bestMatch,
      confidence: bestConfidence,
      matched_term: bestTerm
    };
  }
  
  console.log('❌ No suitable match found above 75% confidence threshold');
  return null;
}

export { matchEntity, findBestMatch, extractSearchTerms, getDistinctValues };
