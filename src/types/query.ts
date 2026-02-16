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
  executeQuery: (query: string) => Promise<QueryResult | null>;
  loading: boolean;
  error: string | null;
  result: QueryResult | null;
}
