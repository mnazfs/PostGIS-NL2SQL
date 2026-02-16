import { useState, useEffect } from 'react';
import { useQuery } from '../hooks/useQuery';
import type { GeoJSON } from '../types/query';

export function QueryPanel() {
  const [query, setQuery] = useState<string>('');
  const [geoJsonData, setGeoJsonData] = useState<GeoJSON | null>(null);
  const { executeQuery, loading, error, result } = useQuery();

  // Handle GeoJSON data when result changes
  useEffect(() => {
    if (result && result.geojson) {
      console.log('GeoJSON data received:', result.geojson);
      console.log('GeoJSON features count:', result.geojson.features?.length || 0);
      setGeoJsonData(result.geojson);
    } else {
      setGeoJsonData(null);
    }
  }, [result]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (query.trim()) {
      executeQuery(query);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Natural Language Query</h2>
        
        <form onSubmit={handleSubmit} className="mb-6">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your natural language query here..."
            disabled={loading}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 resize-none"
          />
          
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="mt-3 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Processing...' : 'Submit Query'}
          </button>
        </form>

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-600">Processing your query...</span>
          </div>
        )}

        {/* Error Message */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-600 mt-1">{error}</p>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="space-y-4">
            {/* Summary */}
            {result.summary && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-900 font-medium">Summary</p>
                <p className="text-blue-800 mt-1">{result.summary}</p>
              </div>
            )}

            {/* SQL Query (if present) */}
            {result.sql && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-gray-700 font-medium mb-2">Generated SQL</p>
                <pre className="text-sm bg-gray-900 text-green-400 p-3 rounded overflow-x-auto">
                  {result.sql}
                </pre>
              </div>
            )}

            {/* GeoJSON Data Indicator */}
            {geoJsonData && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-900 font-medium">Geographic Data Available</p>
                <p className="text-green-800 mt-1">
                  {geoJsonData.features?.length || 0} geographic feature{geoJsonData.features?.length !== 1 ? 's' : ''} detected.
                  Map visualization coming soon.
                </p>
                <p className="text-green-700 text-sm mt-2">
                  (Check console for GeoJSON data)
                </p>
              </div>
            )}

            {/* Data Table */}
            {result.rows && result.rows.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {Object.keys(result.rows[0]).map((key) => (
                          <th
                            key={key}
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {result.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          {Object.values(row).map((value, cellIdx) => (
                            <td
                              key={cellIdx}
                              className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                            >
                              {value !== null && value !== undefined
                                ? String(value)
                                : '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    {result.rows.length} row{result.rows.length !== 1 ? 's' : ''} returned
                  </p>
                </div>
              </div>
            )}

            {/* Empty Results */}
            {result.rows && result.rows.length === 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-gray-600">No results found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
