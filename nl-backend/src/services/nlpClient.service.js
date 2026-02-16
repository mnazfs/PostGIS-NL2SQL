/**
 * NLP Client Service
 * 
 * Communicates with the external NLP service for natural language processing
 */

/**
 * Call the NLP service with a specific mode and payload
 * 
 * @param {string} mode - The operation mode (e.g., 'sql_generation', 'query_refinement')
 * @param {object} payload - The data to send to the NLP service
 * @returns {Promise<any>} The response data from the NLP service
 * @throws {Error} If the request fails
 */
async function callNLP(mode, payload) {
  try {
    const nlpServiceUrl = process.env.NLP_SERVICE_URL;
    
    if (!nlpServiceUrl) {
      throw new Error('NLP_SERVICE_URL is not configured in environment variables');
    }
    
    const endpoint = `${nlpServiceUrl}/api/generate`;
    
    console.log(`Calling NLP service: ${endpoint} with mode: ${mode}`);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        mode,
        payload
      })
    });
    
    // Check if the HTTP response was successful
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `NLP service returned error ${response.status}: ${errorText}`
      );
    }
    
    const data = await response.json();
    
    // Check if the response indicates success
    if (data.success === false) {
      throw new Error(data.message || 'NLP service returned success=false');
    }
    
    console.log(`✓ NLP service responded successfully`);
    
    return data.data;
    
  } catch (error) {
    // Handle fetch-specific errors
    if (error.cause?.code === 'ECONNREFUSED' || error.message.includes('fetch failed')) {
      throw new Error(
        `Unable to connect to NLP service at ${process.env.NLP_SERVICE_URL}. ` +
        `Please ensure the service is running.`
      );
    }
    
    // Re-throw if it's already a formatted error
    if (error.message.includes('NLP service')) {
      throw error;
    }
    
    // Generic error
    console.error('NLP service error:', error.message);
    throw new Error(`Failed to call NLP service: ${error.message}`);
  }
}

export { callNLP };
