import dotenv from 'dotenv';
import app from './app.js';
import { testConnection } from './config/db.js';
import { initializeSchemaCache } from './services/schemaCache.service.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// Initialize application
async function startServer() {
  try {
    // Test database connection
    await testConnection();
    
    // Initialize schema cache
    await initializeSchemaCache();
    
    // Start server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📊 Health check available at http://localhost:${PORT}/health`);
      console.log(`🔗 API endpoint: http://localhost:${PORT}/api/query`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      console.error('UNHANDLED REJECTION! 💥 Shutting down...');
      console.error(err.name, err.message);
      server.close(() => {
        process.exit(1);
      });
    });
    
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

// Start the server
startServer();
