import { useEffect } from 'react';
import { QueryPanel } from './components/QueryPanel.tsx';
import { Sidebar } from './components/Sidebar';
import { BACKEND_URL } from './config';
import type { AgentConfig } from './types/chat';

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
  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/query/health`);
        if (response.ok) {
          console.log('Backend Connected');
        } else {
          console.error(`Backend health check failed: ${response.status}`);
        }
      } catch (error) {
        console.error('Backend health check failed:', error);
      }
    };

    checkBackendHealth();
  }, []);

  const handleClearChat = () => {
    // Placeholder for future functionality
    window.location.reload();
  };

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

        <div className="flex-1 overflow-y-auto">
          <QueryPanel />
        </div>
      </div>
    </div>
  );
}

export default App;
