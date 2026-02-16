import { useState } from 'react';
import { sendQuery } from '../services/api';

/**
 * Custom hook for managing natural language query operations
 * @returns {Object} Query state and execution function
 */
export function useQuery() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  /**
   * Execute a natural language query
   * @param {string} query - The query to execute
   * @returns {Promise<Object|null>} The query result or null if error
   */
  const executeQuery = async (query) => {
    if (!query?.trim()) {
      setError('Query cannot be empty');
      return null;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await sendQuery(query);
      setResult(data);
      return data;
    } catch (err) {
      const errorMessage = err.message || 'An unexpected error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    executeQuery,
    loading,
    error,
    result,
  };
}
