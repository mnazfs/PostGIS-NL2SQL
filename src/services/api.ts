import { BACKEND_URL } from '../config';
import type { QueryResult, SystemStatusResponse, SchemaResponse } from '../types/query';

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
 * @param selectedTable - Optional table name for manual schema narrowing
 * @returns The response data from the backend
 * @throws Error if the request fails
 */
export async function sendQuery(query: string, selectedTable?: string): Promise<QueryResult> {
  try {
    const body: any = { query };
    if (selectedTable) {
      body.selectedTable = selectedTable;
    }

    const response = await fetch(`${BACKEND_URL}/api/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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

/**
 * Fetch system status from backend
 * @returns System status including database and schema readiness
 */
export async function fetchSystemStatus(): Promise<SystemStatusResponse> {
  const response = await fetch(`${BACKEND_URL}/api/system-status`);
  if (!response.ok) {
    throw new Error(`Failed to fetch system status: ${response.status}`);
  }
  return response.json();
}

/**
 * Fetch database schema from backend
 * @returns Schema information for all tables
 */
export async function fetchSchema(): Promise<SchemaResponse> {
  const response = await fetch(`${BACKEND_URL}/api/schema`);
  if (!response.ok) {
    throw new Error(`Failed to fetch schema: ${response.status}`);
  }
  return response.json();
}
