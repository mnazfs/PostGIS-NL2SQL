const express = require('express');
const router = express.Router();
const agentOrchestrator = require('../services/agentOrchestrator.service');
const { sanitizeInput } = require('../utils/sanitizer');

// Process natural language query
router.post('/query', async (req, res) => {
  try {
    const { query, conversationId } = req.body;

    if (!query) {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: 'Query is required' 
      });
    }

    // Sanitize input
    const sanitizedQuery = sanitizeInput(query);

    // Process query through agent orchestrator
    const result = await agentOrchestrator.processQuery(
      sanitizedQuery,
      conversationId
    );

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Query processing error:', error);
    res.status(500).json({
      error: 'Query Processing Failed',
      message: error.message
    });
  }
});

// Get database schema information
router.get('/schema', async (req, res) => {
  try {
    const schemaCache = require('../services/schemaCache.service');
    const schema = await schemaCache.getSchema();

    res.status(200).json({
      success: true,
      data: schema
    });

  } catch (error) {
    console.error('Schema retrieval error:', error);
    res.status(500).json({
      error: 'Schema Retrieval Failed',
      message: error.message
    });
  }
});

// Refresh schema cache
router.post('/schema/refresh', async (req, res) => {
  try {
    const schemaCache = require('../services/schemaCache.service');
    await schemaCache.refreshCache();

    res.status(200).json({
      success: true,
      message: 'Schema cache refreshed successfully'
    });

  } catch (error) {
    console.error('Schema refresh error:', error);
    res.status(500).json({
      error: 'Schema Refresh Failed',
      message: error.message
    });
  }
});

module.exports = router;
