import type { TableSchema } from '../types/query';

interface SchemaAccordionProps {
  schemaCache: TableSchema[];
  expandedTable: string | null;
  expandedColumn: string | null;
  selectedTable: string | null;
  onTableExpand: (tableName: string) => void;
  onColumnExpand: (columnKey: string) => void;
  onTableSelect: (tableName: string) => void;
}

export function SchemaAccordion({
  schemaCache,
  expandedTable,
  expandedColumn,
  selectedTable,
  onTableExpand,
  onColumnExpand,
  onTableSelect,
}: SchemaAccordionProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold mb-4 text-gray-900">Available Tables</h3>
      
      <div className="space-y-2">
        {schemaCache.map((table) => {
          const isExpanded = expandedTable === table.name;
          const isSelected = selectedTable === table.name;
          
          return (
            <div
              key={table.name}
              className={`border rounded-lg overflow-hidden transition-all ${
                isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              {/* Table Header */}
              <div className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100">
                <div className="flex items-center flex-1">
                  {isSelected && (
                    <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span className="font-semibold text-gray-900">{table.name}</span>
                  <span className="ml-2 text-sm text-gray-500">
                    ({table.columns.length} columns)
                  </span>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => onTableExpand(table.name)}
                    className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition-colors"
                  >
                    {isExpanded ? '▼ Collapse' : '▶ Expand'}
                  </button>
                  
                  <button
                    onClick={() => onTableSelect(table.name)}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      isSelected
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                    }`}
                  >
                    {isSelected ? '✓ Selected' : 'Select'}
                  </button>
                </div>
              </div>

              {/* Expanded Columns */}
              {isExpanded && (
                <div className="p-4 bg-white border-t border-gray-200">
                  <div className="space-y-3">
                    {table.columns.map((column) => {
                      const columnKey = `${table.name}-${column.name}`;
                      const isColumnExpanded = expandedColumn === columnKey;
                      const hasSampleValues = column.sample_values && column.sample_values.length > 0;

                      return (
                        <div key={columnKey} className="border-l-2 border-gray-300 pl-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{column.name}</span>
                              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                                {column.type}
                              </span>
                            </div>
                            
                            {hasSampleValues && (
                              <button
                                onClick={() => onColumnExpand(columnKey)}
                                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                              >
                                {isColumnExpanded ? '▼ Hide Values' : '▶ Show Values'}
                              </button>
                            )}
                          </div>

                          {isColumnExpanded && hasSampleValues && (
                            <ul className="mt-2 space-y-1 text-sm text-gray-600">
                              {column.sample_values!.slice(0, 10).map((value, index) => (
                                <li key={index} className="flex items-center">
                                  <span className="w-1 h-1 bg-gray-400 rounded-full mr-2"></span>
                                  {value}
                                </li>
                              ))}
                              {column.sample_values!.length > 10 && (
                                <li className="text-gray-500 italic">
                                  ... and {column.sample_values!.length - 10} more
                                </li>
                              )}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
