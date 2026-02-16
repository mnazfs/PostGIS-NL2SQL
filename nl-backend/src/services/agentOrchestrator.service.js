const schemaCache = require('./schemaCache.service');
const nlpClient = require('./nlpClient.service');
const sqlValidator = require('./sqlValidator.service');
const sqlExecutor = require('./sqlExecutor.service');

class AgentOrchestrator {
  constructor() {
    this.conversations = new Map(); // Store conversation history
    this.maxRetries = 2; // Maximum retries for SQL generation/execution
  }

  // Main method to process natural language query
  async processQuery(naturalLanguageQuery, conversationId = null) {
    const startTime = Date.now();
    let attemptCount = 0;
    let lastError = null;

    try {
      // Step 1: Get database schema
      console.log('Step 1: Fetching database schema...');
      const schema = await schemaCache.getSchema();
      const schemaDescription = schemaCache.getSchemaDescription();

      // Step 2: Generate SQL from natural language
      console.log('Step 2: Generating SQL from natural language...');
      let generatedSQL = await nlpClient.generateSQL(
        naturalLanguageQuery,
        schemaDescription
      );

      // Step 3: Validate and execute SQL (with retry logic)
      console.log('Step 3: Validating and executing SQL...');
      let executionResult = null;

      while (attemptCount < this.maxRetries) {
        attemptCount++;
        
        // Validate SQL
        const validation = sqlValidator.validate(generatedSQL);
        
        if (!validation.valid) {
          console.log(`Validation failed (attempt ${attemptCount}):`, validation.errors);
          
          if (attemptCount < this.maxRetries) {
            // Try to improve SQL based on validation errors
            generatedSQL = await nlpClient.improveSQL(
              generatedSQL,
              validation.errors.join('; '),
              schemaDescription
            );
            continue;
          } else {
            throw new Error(`SQL validation failed: ${validation.errors.join(', ')}`);
          }
        }

        // Execute SQL
        executionResult = await sqlExecutor.execute(generatedSQL);

        if (executionResult.success) {
          console.log('Query executed successfully');
          break;
        } else {
          console.log(`Execution failed (attempt ${attemptCount}):`, executionResult.error);
          lastError = executionResult.error;
          
          if (attemptCount < this.maxRetries) {
            // Try to fix SQL based on execution error
            generatedSQL = await nlpClient.improveSQL(
              generatedSQL,
              executionResult.error,
              schemaDescription
            );
          } else {
            throw new Error(`SQL execution failed: ${executionResult.error}`);
          }
        }
      }

      // Step 4: Generate natural language explanation
      console.log('Step 4: Generating explanation...');
      const explanation = await nlpClient.explainResults(
        naturalLanguageQuery,
        generatedSQL,
        executionResult.data,
        executionResult.rowCount
      );

      // Step 5: Store conversation history (if conversationId provided)
      if (conversationId) {
        this.storeConversation(conversationId, {
          query: naturalLanguageQuery,
          sql: generatedSQL,
          timestamp: new Date()
        });
      }

      const totalTime = Date.now() - startTime;

      // Return comprehensive result
      return {
        query: naturalLanguageQuery,
        sql: generatedSQL,
        data: executionResult.data,
        rowCount: executionResult.rowCount,
        explanation: explanation,
        executionTime: executionResult.executionTime,
        totalTime: totalTime,
        attempts: attemptCount,
        warnings: executionResult.warnings || [],
        conversationId: conversationId
      };

    } catch (error) {
      console.error('Agent orchestration error:', error);
      
      const totalTime = Date.now() - startTime;
      
      return {
        query: naturalLanguageQuery,
        error: error.message,
        totalTime: totalTime,
        attempts: attemptCount,
        conversationId: conversationId
      };
    }
  }

  // Store conversation history
  storeConversation(conversationId, entry) {
    if (!this.conversations.has(conversationId)) {
      this.conversations.set(conversationId, []);
    }
    
    const history = this.conversations.get(conversationId);
    history.push(entry);
    
    // Keep only last 10 entries per conversation
    if (history.length > 10) {
      history.shift();
    }
  }

  // Get conversation history
  getConversationHistory(conversationId) {
    return this.conversations.get(conversationId) || [];
  }

  // Clear conversation history
  clearConversation(conversationId) {
    this.conversations.delete(conversationId);
  }

  // Clear all conversations
  clearAllConversations() {
    this.conversations.clear();
  }
}

// Export singleton instance
module.exports = new AgentOrchestrator();
