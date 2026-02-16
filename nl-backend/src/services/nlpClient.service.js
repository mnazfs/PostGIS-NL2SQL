import axios from 'axios';

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
async function callNLPService(mode, payload) {
  try {
    const nlpServiceUrl = process.env.NLP_SERVICE_URL;
    
    if (!nlpServiceUrl) {
      throw new Error('NLP_SERVICE_URL is not configured in environment variables');
    }
    
    const endpoint = `${nlpServiceUrl}/generate`;
    
    console.log(`Calling NLP service: ${endpoint} with mode: ${mode}`);
    
    const response = await axios.post(endpoint, {
      mode: mode,
      payload: payload
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });
    
    console.log(`✓ NLP service responded successfully`);
    
    return response.data;
    
  } catch (error) {
    // Handle different types of errors cleanly
    if (error.code === 'ECONNREFUSED') {
      throw new Error(
        `Unable to connect to NLP service at ${process.env.NLP_SERVICE_URL}. ` +
        `Please ensure the service is running.`
      );
    }
    
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      throw new Error(
        `NLP service request timed out. The service may be overloaded or unresponsive.`
      );
    }
    
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const message = error.response.data?.message || error.response.statusText;
      throw new Error(
        `NLP service returned error ${status}: ${message}`
      );
    }
    
    // Generic error
    console.error('NLP service error:', error.message);
    throw new Error(`Failed to call NLP service: ${error.message}`);
  }
}

export { callNLPService };
