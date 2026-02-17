import express from 'express';
import cors from 'cors';
import queryRoutes from './routes/query.routes.js';
import { pool } from './config/db.js';
import { getSchemaCache } from './services/schemaCache.service.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/query', queryRoutes);

// System status endpoint
app.get('/api/system-status', async (req, res) => {
  try {
    // Check database connection
    let database_connected = false;
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      database_connected = true;
    } catch (error) {
      console.error('Database connection check failed:', error.message);
    }

    // Check schema cache
    const schemaCache = getSchemaCache();
    const schema_loaded = schemaCache !== null;
    const tables_count = schemaCache ? schemaCache.tableCount : 0;

    // System is ready if DB is connected, schema is loaded, and has tables
    const ready = database_connected && schema_loaded && tables_count > 0;

    res.status(200).json({
      database_connected,
      schema_loaded,
      tables_count,
      ready
    });
  } catch (error) {
    console.error('System status check error:', error);
    res.status(500).json({
      database_connected: false,
      schema_loaded: false,
      tables_count: 0,
      ready: false,
      error: error.message
    });
  }
});

// Schema endpoint - expose cached schema to frontend
app.get('/api/schema', (req, res) => {
  try {
    const schemaCache = getSchemaCache();
    
    if (!schemaCache) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'Schema cache not initialized'
      });
    }

    // Transform schema cache into frontend format
    const tables = Object.values(schemaCache.tables).map(table => ({
      name: table.name,
      columns: Object.values(table.columns).map(column => ({
        name: column.name,
        type: column.dataType,
        ...(column.sampleValues && { sample_values: column.sampleValues })
      }))
    }));

    res.status(200).json({ tables });
  } catch (error) {
    console.error('Schema endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: err.message 
  });
});

export default app;
