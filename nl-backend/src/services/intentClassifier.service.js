/**
 * Intent Classifier Service
 * 
 * Classifies user queries into intent categories (sql_query, knowledge_query, geo_query)
 */

import { callNLP } from './nlpClient.service.js';

/**
 * Detect the intent of a user query
 * 
 * @param {string} query - The user's natural language query
 * @returns {Promise<string>} The intent type: 'sql_query', 'knowledge_query', or 'geo_query'
 * @throws {Error} If intent classification fails
 */
async function detectIntent(query) {
  try {
    if (!query || typeof query !== 'string') {
      throw new Error('Query must be a non-empty string');
    }
    
    console.log(`🎯 Detecting intent for query: "${query}"`);
    
    // Call NLP service with intent mode
    const result = await callNLP('intent', { query });
    
    // Extract intent from response
    const intent = result.intent;
    
    if (!intent) {
      throw new Error('NLP service did not return an intent');
    }
    
    console.log(`✓ Intent detected: ${intent}`);
    
    return intent;
    
  } catch (error) {
    console.error('Intent detection error:', error.message);
    throw new Error(`Failed to detect intent: ${error.message}`);
  }
}

export { detectIntent };
