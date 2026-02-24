import { useEffect, useState } from 'react';
import { QueryPanel } from './components/QueryPanel.tsx';
import { SchemaAccordion } from './components/SchemaAccordion';
import { Sidebar } from './components/Sidebar';
import { fetchSystemStatus, fetchSchema } from './services/api.ts';
import type { AgentConfig } from './types/chat';
import type { TableSchema } from './types/query';

const agentConfig: AgentConfig = {
  name: 'PostGIS NL Agent',
  description: 'A natural language interface for querying PostGIS spatial databases.',
  capabilities: [
    'Natural language to SQL translation',
    'PostGIS spatial queries',
    'Geographic data visualization',
    'GeoJSON export support',
    'Interactive map display',
  ],
};

function App() {
  const [systemReady, setSystemReady] = useState<boolean>(false);
  const [schemaCache, setSchemaCache] = useState<TableSchema[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Schema accordion state
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [expandedColumn, setExpandedColumn] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  useEffect(() => {
    const initializeSystem = async (): Promise<void> => {
      try {
        // Check system status
        const statusData = await fetchSystemStatus();

        if (!statusData.ready) {
          setError('Backend not ready. Database or schema not initialized.');
          setLoading(false);
          return;
        }

        // Fetch schema cache
        const schemaData = await fetchSchema();

        setSchemaCache(schemaData.tables);
        setSystemReady(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to connect to backend.');
      } finally {
        setLoading(false);
      }
    };

    initializeSystem();
  }, []);

  // Table expand logic (only one table open at a time)
  const handleTableExpand = (tableName: string) => {
    if (expandedTable === tableName) {
      setExpandedTable(null);
      setExpandedColumn(null);
    } else {
      setExpandedTable(tableName);
      setExpandedColumn(null);
    }
  };

  // Column expand logic
  const handleColumnExpand = (columnKey: string) => {
    if (expandedColumn === columnKey) {
      setExpandedColumn(null);
    } else {
      setExpandedColumn(columnKey);
    }
  };

  const handleClearChat = () => {
    // Placeholder for future functionality
    window.location.reload();
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Initializing system...</p>
          <p className="text-gray-500 text-sm mt-2">Checking database and schema status</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="flex items-center mb-3">
            <svg className="w-6 h-6 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-lg font-semibold text-red-800">System Error</h2>
          </div>
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        config={agentConfig}
        messageCount={0}
        onClearChat={handleClearChat}
      />

      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-lg font-semibold text-gray-900">PostGIS Query Interface</h2>
            <p className="text-sm text-gray-500">Query your spatial database using natural language</p>
          </div>
        </header>

        {systemReady && (
          <>
            <div className="bg-green-50 border-b border-green-200 px-6 py-2">
              <div className="max-w-6xl mx-auto flex items-center text-sm">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                <span className="text-green-700 font-medium">
                  Connected to database • Schema loaded ({schemaCache?.length || 0} tables)
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-6xl mx-auto p-6 space-y-6">
                {/* Schema Accordion */}
                <SchemaAccordion
                  schemaCache={schemaCache!}
                  expandedTable={expandedTable}
                  expandedColumn={expandedColumn}
                  selectedTable={selectedTable}
                  onTableExpand={handleTableExpand}
                  onColumnExpand={handleColumnExpand}
                  onTableSelect={setSelectedTable}
                />
                
                {/* Query Panel */}
                <QueryPanel
                  selectedTable={selectedTable}
                  onClearSelection={() => setSelectedTable(null)}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
