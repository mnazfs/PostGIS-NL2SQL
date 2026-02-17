import { getSchemaCache, getSchemaDescription } from './schemaCache.service.js';
import { callNLP } from './nlpClient.service.js';
import { validateSQL } from './sqlValidator.service.js';
import { executeSQL } from './sqlExecutor.service.js';
import { extractGeoJSON } from '../utils/queryHelpers.js';

/**
 * Agent Orchestrator Service
 * 
 * Orchestrates the complete flow from user query to formatted response
 */

/**
 * Strip sample values from schema description
 * 
 * @param {string} schemaText - The full schema description
 * @returns {string} Schema without sample values
 */
function stripSampleValues(schemaText) {
  const lines = schemaText.split('\n');
  const filteredLines = lines.filter(line => !line.trim().startsWith('Sample values:'));
  return filteredLines.join('\n');
}

/**
 * Filter schema to include only specified tables
 * 
 * @param {string} schemaText - The full schema description
 * @param {string[]} tables - Array of table names to include
 * @returns {string} Filtered schema with only selected tables
 */
function filterSchemaByTables(schemaText, tables) {
  if (!tables || tables.length === 0) {
    return schemaText; // Return full schema if no tables specified
  }
  
  const lines = schemaText.split('\n');
  const filteredLines = [];
  let currentTable = null;
  let includeCurrentTable = false;
  
  // Keep the header lines (first 3 lines typically)
  const headerLines = lines.slice(0, 3);
  filteredLines.push(...headerLines);
  
  for (let i = 3; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this is a table line
    if (line.startsWith('Table: ')) {
      // Extract table name (remove quotes if present)
      const tableName = line.substring(7).trim().replace(/"/g, '');
      currentTable = tableName;
      includeCurrentTable = tables.some(t => 
        t.toLowerCase() === tableName.toLowerCase() || 
        t.replace(/"/g, '').toLowerCase() === tableName.toLowerCase()
      );
      
      if (includeCurrentTable) {
        filteredLines.push(line);
      }
    } else if (includeCurrentTable) {
      // Include all lines belonging to the current table
      filteredLines.push(line);
    }
  }
  
  return filteredLines.join('\n');
}

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
    
    // Step 2: Table Selection Phase
    console.log('\n🎯 Step 2: Calling NLP service for table selection...');
    const schemaWithoutSamples = stripSampleValues(schemaDescription);
    
    let selectedTables = [];
    let filteredSchema = schemaDescription; // Default to full schema
    
    try {
      const selectionResponse = await callNLP('table_selection', {
        query: userQuery,
        schema: schemaWithoutSamples
      });
      
      console.log('\n' + '═'.repeat(80));
      console.log('🎯 TABLE SELECTION RESPONSE');
      console.log('═'.repeat(80));
      console.log(JSON.stringify(selectionResponse, null, 2));
      console.log('═'.repeat(80));
      
      selectedTables = selectionResponse.relevant_tables || [];
      
      if (selectedTables.length > 0) {
        console.log(`✓ Selected tables: [${selectedTables.join(', ')}]`);
        filteredSchema = filterSchemaByTables(schemaDescription, selectedTables);
        console.log(`✓ Filtered schema length: ${filteredSchema.length} characters`);
      } else {
        console.log('⚠️  No tables selected, using full schema as fallback');
      }
    } catch (selectionError) {
      console.error('⚠️  Table selection failed:', selectionError.message);
      console.log('⚠️  Using full schema as fallback');
    }
    
    // Step 3: Call NLP service with mode "planning"
    console.log('\n🤖 Step 3: Calling NLP service for query planning...');
    const planningResponse = await callNLP('planning', {
      query: userQuery,
      schema: filteredSchema
    });
    
    console.log('\n' + '═'.repeat(80));
    console.log('📋 PLANNING RESPONSE');
    console.log('═'.repeat(80));
    console.log(JSON.stringify(planningResponse, null, 2));
    console.log('═'.repeat(80));
    
    const { sql: plannedSQL, requires_second_phase } = planningResponse;
    
    if (!plannedSQL) {
      throw new Error('NLP service did not return SQL in planning phase');
    }
    
    console.log('\n📝 PHASE 1 SQL:');
    console.log('─'.repeat(80));
    if (Array.isArray(plannedSQL)) {
      plannedSQL.forEach((query, index) => {
        console.log(`Query ${index + 1}:`);
        console.log(query);
        if (index < plannedSQL.length - 1) console.log('');
      });
    } else {
      console.log(plannedSQL);
    }
    console.log('─'.repeat(80));
    console.log(`Requires second phase: ${requires_second_phase}`);
    
    // Step 4: Validate SQL
    console.log('\n✅ Step 4: Validating Phase 1 SQL...');
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
        message: validation.reason,
        summary: `Unable to validate the SQL query: ${validation.reason}`,
        rows: [],
        geojson: null
      };
    }
    
    console.log('✓ SQL validation passed');
    
    // Step 5: Execute SQL
    console.log('\n⚡ Step 5: Executing Phase 1 SQL...');
    const phase1StartTime = Date.now();
    let executionResult = await executeSQL(plannedSQL);
    const phase1ExecutionTime = Date.now() - phase1StartTime;
    let finalSQL = plannedSQL;
    let refinementApplied = false;
    
    console.log('\n' + '═'.repeat(80));
    console.log('📊 SQL EXECUTION RESULTS (PHASE 1)');
    console.log('═'.repeat(80));
    console.log(`Rows returned: ${executionResult.length}`);
    console.log(`Execution time: ${phase1ExecutionTime}ms`);
    if (executionResult.length > 0) {
      console.log('\nSample data (first row):');
      console.log(JSON.stringify(executionResult[0], null, 2));
    }
    console.log('═'.repeat(80));
    
    // Step 6: Check if refinement is needed
    const needsRefinement = requires_second_phase || executionResult.length === 0;
    
    if (needsRefinement) {
      console.log('\n🔄 Step 6: Refinement needed - calling NLP service again...');
      console.log(`Reason: ${requires_second_phase ? 'Second phase required' : 'Empty result set'}`);
      
      try {
        const refinementResponse = await callNLP('refinement', {
          original_query: userQuery,
          execution_results: executionResult
        });
        
        console.log('\n' + '═'.repeat(80));
        console.log('🔄 REFINEMENT RESPONSE');
        console.log('═'.repeat(80));
        console.log(JSON.stringify(refinementResponse, null, 2));
        console.log('═'.repeat(80));
        
        const refinedSQL = refinementResponse.sql;
        
        if (refinedSQL) {
          console.log('\n📝 PHASE 2 SQL:');
          console.log('─'.repeat(80));
          if (Array.isArray(refinedSQL)) {
            refinedSQL.forEach((query, index) => {
              console.log(`Query ${index + 1}:`);
              console.log(query);
              if (index < refinedSQL.length - 1) console.log('');
            });
          } else {
            console.log(refinedSQL);
          }
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
            
            console.log('\n' + '═'.repeat(80));
            console.log('📊 SQL EXECUTION RESULTS (PHASE 2)');
            console.log('═'.repeat(80));
            console.log(`Rows returned: ${executionResult.length}`);
            console.log(`Execution time: ${phase2ExecutionTime}ms`);
            if (executionResult.length > 0) {
              console.log('\nSample data (first row):');
              console.log(JSON.stringify(executionResult[0], null, 2));
            }
            console.log('═'.repeat(80));
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
    
    // Step 7: Call NLP service for formatting
    console.log('\n📝 Step 7: Formatting response...');
    let formattedResponse;
    
    try {
      const formattingResponse = await callNLP('formatting', {
        original_query: userQuery,
        final_data: executionResult
      });
      
      console.log('\n' + '═'.repeat(80));
      console.log('✨ FORMATTING RESPONSE');
      console.log('═'.repeat(80));
      console.log(JSON.stringify(formattingResponse, null, 2));
      console.log('═'.repeat(80));
      
      formattedResponse = formattingResponse.formatted_text || formattingResponse.response || formattingResponse.summary;
      console.log('\n✓ Response formatted successfully');
      
    } catch (formattingError) {
      console.log('⚠️  Formatting failed, using default message');
      formattedResponse = `Found ${executionResult.length} result(s) for your query.`;
    }
    
    // Step 8: Extract GeoJSON if available
    const geojson = extractGeoJSON(executionResult);
    
    // Step 9: Return final structured response
    const totalExecutionTime = Date.now() - startTime;
    console.log('\n✨ Query processing complete!');
    console.log(`⏱️  Total execution time: ${totalExecutionTime}ms\n`);
    
    return {
      success: true,
      summary: formattedResponse,
      rows: executionResult,
      geojson: geojson
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
      summary: `An error occurred while processing your query: ${error.message}`,
      rows: [],
      geojson: null
    };
  }
}

export { handleUserQuery };
