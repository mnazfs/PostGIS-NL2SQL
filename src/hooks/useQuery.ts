import { useState } from 'react';
import { sendQuery } from '../services/api.ts';
import type { QueryResult, UseQueryReturn } from '../types/query';

/**
 * Custom hook for managing natural language query operations
 * @returns Query state and execution function
 */
export function useQuery(): UseQueryReturn {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QueryResult | null>(null);

  /**
   * Execute a natural language query
   * @param query - The query to execute
   * @param selectedTable - Optional table name for manual schema narrowing
   * @returns The query result or null if error
   */
  const executeQuery = async (query: string, selectedTable?: string): Promise<QueryResult | null> => {
    if (!query?.trim()) {
      setError('Query cannot be empty');
      return null;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await sendQuery(query, selectedTable);
      setResult(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
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
