/**
 * RAG Handler Service
 * 
 * Handles knowledge queries using Retrieval Augmented Generation (RAG)
 */

import { callNLP } from './nlpClient.service.js';

/**
 * Handle knowledge query using RAG
 * 
 * @param {string} query - The user's knowledge question
 * @returns {Promise<string>} The answer from the RAG system
 * @throws {Error} If RAG processing fails
 */
async function handleRAG(query) {
  try {
    if (!query || typeof query !== 'string') {
      throw new Error('Query must be a non-empty string');
    }
    
    console.log(`📚 Handling RAG query: "${query}"`);
    
    // Call NLP service with RAG mode
    const result = await callNLP('rag', { query });
    
    // Extract answer from response
    const answer = result.answer;
    
    if (!answer) {
      throw new Error('NLP service did not return an answer');
    }
    
    console.log(`✓ RAG answer generated`);
    
    return answer;
    
  } catch (error) {
    console.error('RAG handler error:', error.message);
    throw new Error(`Failed to generate RAG answer: ${error.message}`);
  }
}

export { handleRAG };
