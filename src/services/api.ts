import { BACKEND_URL } from '../config';
import type { QueryResult } from '../types/query';

interface BackendResponse {
  success: boolean;
  message?: string;
  summary?: string;
  sql?: string;
  rows?: Array<Record<string, any>>;
  geojson?: any;
}

/**
 * Send a natural language query to the backend
 * @param query - The natural language query
 * @returns The response data from the backend
 * @throws Error if the request fails
 */
export async function sendQuery(query: string): Promise<QueryResult> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data: BackendResponse = await response.json();

    if (data.success === false) {
      throw new Error(data.message || 'Query execution failed');
    }

    return {
      summary: data.summary,
      sql: data.sql,
      rows: data.rows,
      geojson: data.geojson,
    };
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Unable to connect to the backend. Please check if the server is running.');
    }
    throw error;
  }
}
