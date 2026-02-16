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
    const { query } = req.body;

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
    const result = await handleUserQuery(query.trim());

    // Return the result (success or error handled by handleUserQuery)
    const statusCode = result.success ? 200 : 500;
    res.status(statusCode).json(result);

  } catch (error) {
    console.error('Query route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message,
      phase: 'route_handler'
    });
  }
});

export default router;
