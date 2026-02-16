import { BACKEND_URL } from '../config';

/**
 * Send a natural language query to the backend
 * @param {string} query - The natural language query
 * @returns {Promise<Object>} The response data from the backend
 * @throws {Error} If the request fails
 */
export async function sendQuery(query) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `Request failed with status ${response.status}`
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Unable to connect to the backend. Please check if the server is running.');
    }
    throw error;
  }
}
