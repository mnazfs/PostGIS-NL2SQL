import { getSchemaCache, getSchemaDescription } from './schemaCache.service.js';
import { callNLPService } from './nlpClient.service.js';
import { validateSQL } from './sqlValidator.service.js';
import { executeSQL } from './sqlExecutor.service.js';

/**
 * Agent Orchestrator Service
 * 
 * Orchestrates the complete flow from user query to formatted response
 */

/**
 * Handle user query through the complete NLP pipeline
 * 
 * @param {string} userQuery - The natural language query from the user
 * @returns {Promise<object>} Formatted response with data and metadata
 */
async function handleUserQuery(userQuery) {
  const startTime = Date.now();
  
  try {
    console.log(`\n🔍 Processing user query: "${userQuery}"`);
    console.log(`⏱️  Start time: ${new Date().toISOString()}`);
    
    // Step 1: Get schema cache
    console.log('\n📊 Step 1: Retrieving schema cache...');
    const schemaCache = getSchemaCache();
    
    if (!schemaCache) {
      throw new Error('Schema cache not initialized. Server may still be starting up.');
    }
    
    const schemaDescription = getSchemaDescription();
    console.log(`✓ Schema loaded: ${schemaCache.tableCount} tables`);
    
    // Step 2: Call NLP service with mode "planning"
    console.log('\n🤖 Step 2: Calling NLP service for query planning...');
    const planningResponse = await callNLPService('planning', {
      query: userQuery,
      schema: schemaDescription
    });
    
    console.log('✓ Planning response received');
    const { sql: plannedSQL, requires_second_phase } = planningResponse;
    
    if (!plannedSQL) {
      throw new Error('NLP service did not return SQL in planning phase');
    }
    
    console.log('\n📝 PHASE 1 SQL:');
    console.log('─'.repeat(80));
    console.log(plannedSQL);
    console.log('─'.repeat(80));
    console.log(`Requires second phase: ${requires_second_phase}`);
    
    // Step 3: Validate SQL
    console.log('\n✅ Step 3: Validating Phase 1 SQL...');
    const validation = validateSQL(plannedSQL, schemaCache);
    
    if (!validation.valid) {
      console.error('\n❌ VALIDATION FAILED (Phase 1):');
      console.error(`Reason: ${validation.reason}`);
      console.error(`SQL: ${plannedSQL}`);
      
      const executionTime = Date.now() - startTime;
      console.log(`⏱️  Total execution time: ${executionTime}ms\n`);
      
      return {
        success: false,
        error: 'SQL Validation Failed',
        reason: validation.reason,
        sql: plannedSQL,
        phase: 'validation',
        execution_time_ms: executionTime
      };
    }
    
    console.log('✓ SQL validation passed');
    
    // Step 4: Execute SQL
    console.log('\n⚡ Step 4: Executing Phase 1 SQL...');
    const phase1StartTime = Date.now();
    let executionResult = await executeSQL(plannedSQL);
    const phase1ExecutionTime = Date.now() - phase1StartTime;
    let finalSQL = plannedSQL;
    let refinementApplied = false;
    
    console.log(`✓ Phase 1 execution completed: ${executionResult.length} rows returned`);
    console.log(`⏱️  Phase 1 execution time: ${phase1ExecutionTime}ms`);
    
    // Step 5: Check if refinement is needed
    const needsRefinement = requires_second_phase || executionResult.length === 0;
    
    if (needsRefinement) {
      console.log('\n🔄 Step 5: Refinement needed - calling NLP service again...');
      console.log(`Reason: ${requires_second_phase ? 'Second phase required' : 'Empty result set'}`);
      
      try {
        const refinementResponse = await callNLPService('refinement', {
          query: userQuery,
          schema: schemaDescription,
          previous_sql: plannedSQL,
          previous_result: executionResult,
          reason: requires_second_phase ? 'second_phase' : 'empty_result'
        });
        
        const refinedSQL = refinementResponse.sql;
        
        if (refinedSQL) {
          console.log('\n📝 PHASE 2 SQL:');
          console.log('─'.repeat(80));
          console.log(refinedSQL);
          console.log('─'.repeat(80));
          
          // Validate refined SQL
          console.log('\n✅ Validating Phase 2 SQL...');
          const refinedValidation = validateSQL(refinedSQL, schemaCache);
          
          if (refinedValidation.valid) {
            console.log('✓ Refined SQL validation passed');
            
            // Execute refined SQL
            console.log('⚡ Executing Phase 2 SQL...');
            const phase2StartTime = Date.now();
            executionResult = await executeSQL(refinedSQL);
            const phase2ExecutionTime = Date.now() - phase2StartTime;
            finalSQL = refinedSQL;
            refinementApplied = true;
            
            console.log(`✓ Phase 2 execution completed: ${executionResult.length} rows returned`);
            console.log(`⏱️  Phase 2 execution time: ${phase2ExecutionTime}ms`);
          } else {
            console.error('\n❌ VALIDATION FAILED (Phase 2):');
            console.error(`Reason: ${refinedValidation.reason}`);
            console.error(`SQL: ${refinedSQL}`);
            console.log('⚠️  Using Phase 1 results instead');
          }
        }
      } catch (refinementError) {
        console.error('\n❌ Refinement error:', refinementError.message);
        console.log('⚠️  Using Phase 1 results instead');
      }
    }
    
    // Step 6: Call NLP service for formatting
    console.log('\n📝 Step 6: Formatting response...');
    let formattedResponse;
    
    try {
      const formattingResponse = await callNLPService('formatting', {
        query: userQuery,
        sql: finalSQL,
        result_count: executionResult.length,
        sample_data: executionResult.slice(0, 3) // Send first 3 rows as sample
      });
      
      formattedResponse = formattingResponse.formatted_text || formattingResponse.response;
      console.log('✓ Response formatted');
      
    } catch (formattingError) {
      console.log('⚠️  Formatting failed, using default message');
      formattedResponse = `Found ${executionResult.length} result(s) for your query.`;
    }
    
    // Step 7: Return final structured response
    const totalExecutionTime = Date.now() - startTime;
    console.log('\n✨ Query processing complete!');
    console.log(`⏱️  Total execution time: ${totalExecutionTime}ms\n`);
    
    return {
      success: true,
      query: userQuery,
      sql: finalSQL,
      response: formattedResponse,
      data: executionResult,
      metadata: {
        row_count: executionResult.length,
        refinement_applied: refinementApplied,
        requires_second_phase: requires_second_phase,
        execution_time_ms: totalExecutionTime
      }
    };
    
  } catch (error) {
    const totalExecutionTime = Date.now() - startTime;
    console.error('\n❌ Error processing query:', error.message);
    console.error(`Stack trace:`, error.stack);
    console.log(`⏱️  Total execution time: ${totalExecutionTime}ms\n`);
    
    // Return structured error response
    return {
      success: false,
      error: error.name || 'QueryProcessingError',
      message: error.message,
      query: userQuery,
      phase: determineErrorPhase(error),
      execution_time_ms: totalExecutionTime
    };
  }
}

/**
 * Determine which phase the error occurred in based on the error message
 * 
 * @param {Error} error - The error object
 * @returns {string} The phase name
 */
function determineErrorPhase(error) {
  const message = error.message.toLowerCase();
  
  if (message.includes('schema')) return 'schema_loading';
  if (message.includes('nlp') || message.includes('service')) return 'nlp_service';
  if (message.includes('validation')) return 'validation';
  if (message.includes('execution') || message.includes('timeout')) return 'execution';
  if (message.includes('formatting')) return 'formatting';
  
  return 'unknown';
}

export { handleUserQuery };
