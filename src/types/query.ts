export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: number[] | number[][] | number[][][];
  };
  properties: Record<string, any>;
}

export interface GeoJSON {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

export interface QueryResult {
  summary?: string;
  sql?: string;
  rows?: Array<Record<string, any>>;
  geojson?: GeoJSON;
}

export interface UseQueryReturn {
  executeQuery: (query: string, selectedTable?: string) => Promise<QueryResult | null>;
  loading: boolean;
  error: string | null;
  result: QueryResult | null;
}

export interface ColumnSchema {
  name: string;
  type: string;
  sample_values?: string[];
}

export interface TableSchema {
  name: string;
  columns: ColumnSchema[];
}

export interface SchemaResponse {
  tables: TableSchema[];
}

export interface SystemStatusResponse {
  ready: boolean;
  database_connected: boolean;
  schema_loaded: boolean;
  tables_count: number;
}
