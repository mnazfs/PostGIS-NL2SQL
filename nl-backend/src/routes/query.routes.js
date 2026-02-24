import express from 'express';
import { handleUserQuery } from '../services/agentOrchestrator.service.js';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Backend healthy'
  });
});

// Process natural language query
router.post('/', async (req, res) => {
  try {
    const { query, selectedTable } = req.body;

    // Validate query parameter
    if (!query) {
      return res.status(400).json({ 
        success: false,
        error: 'Bad Request',
        message: 'Query parameter is required' 
      });
    }

    // Validate query is not empty after trimming
    if (typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Bad Request',
        message: 'Query cannot be empty' 
      });
    }

    // Process the query through the agent orchestrator
    const result = await handleUserQuery(query.trim(), selectedTable);

    // Handle new return structure: { intent, source, answer: { success, ... } }
    const success = result.answer?.success !== false;
    const statusCode = success ? 200 : 500;
    res.status(statusCode).json(result);

  } catch (error) {
    console.error('Query route error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: statusCode === 400 ? 'Bad Request' : 'Internal Server Error',
      message: error.message,
      phase: 'route_handler'
    });
  }
});

export default router;
