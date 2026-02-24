import { getSchemaCache, getSchemaDescription } from './schemaCache.service.js';
import { callNLP } from './nlpClient.service.js';
import { executeSQL } from './sqlExecutor.service.js';
import { extractGeoJSON } from '../utils/queryHelpers.js';
import { matchEntity } from './entityMatcher.service.js';

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
 * @param {string} [selectedTable] - Optional table name for manual schema narrowing
 * @returns {Promise<object>} Formatted response with data and metadata
 */
async function handleUserQuery(userQuery, selectedTable = null) {
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
    let selectedTables = [];
    let filteredSchema = schemaDescription; // Default to full schema
    
    // Check if manual table selection is provided
    if (selectedTable) {
      console.log(`\n🔒 Manual table restriction enabled: ${selectedTable}`);
      
      // Validate that selectedTable exists in schema cache
      const schemaTables = Object.keys(schemaCache.tables);
      const tableExists = schemaTables.some(t => 
        t.toLowerCase() === selectedTable.toLowerCase()
      );
      
      if (!tableExists) {
        const error = new Error(`Invalid selected table: "${selectedTable}" not found in schema`);
        error.statusCode = 400;
        throw error;
      }
      
      console.log('⏭️  Skipping table selection phase (manual selection provided)');
      selectedTables = [selectedTable];
      filteredSchema = filterSchemaByTables(schemaDescription, [selectedTable]);
      console.log(`✓ Filtered schema to table: ${selectedTable}`);
      console.log(`✓ Filtered schema length: ${filteredSchema.length} characters`);
    } else {
      // Run normal table selection phase
      console.log('\n🎯 Step 2: Calling NLP service for table selection...');
      const schemaWithoutSamples = stripSampleValues(schemaDescription);
      
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
    }
    
    // Step 2.5: Entity Matching (if buildings table selected)
    let entityMatch = null;
    if (selectedTables.length > 0 && selectedTables[0].toLowerCase() === 'buildings') {
      try {
        entityMatch = await matchEntity(userQuery, 'buildings', 'Name');
      } catch (matchError) {
        console.error('⚠️  Entity matching failed:', matchError.message);
      }
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
    
    let { sql: plannedSQL, plan } = planningResponse;
    
    // Override condition value with matched entity if found with high confidence
    if (entityMatch && entityMatch.confidence >= 0.75 && plan && plan.conditions && plan.conditions.length > 0) {
      console.log(`\n🎯 Overriding condition with matched entity: "${entityMatch.value}" (confidence: ${(entityMatch.confidence * 100).toFixed(0)}%)`);
      
      // Find Name column condition and override it
      for (const condition of plan.conditions) {
        if (condition.column === 'Name' || condition.column === 'name') {
          condition.value = entityMatch.value;
          condition.operator = 'equals'; // Use exact match instead of contains
          console.log(`✓ Updated condition: ${condition.column} ${condition.operator} "${condition.value}"`);
          
          // Rebuild SQL with exact match
          const whereClause = `"${condition.column}" = '${condition.value}'`;
          plannedSQL = plannedSQL.replace(/WHERE .* LIMIT/i, `WHERE ${whereClause} LIMIT`);
          console.log(`✓ Updated SQL: ${plannedSQL}`);
        }
      }
    } else if (entityMatch && entityMatch.confidence < 0.75) {
      console.log(`⚠️  Entity match found but confidence too low (${(entityMatch.confidence * 100).toFixed(0)}%), keeping LLM condition`);
    }
    
    if (!plannedSQL) {
      throw new Error('NLP service did not return SQL in planning phase');
    }
    
    console.log('\n📝 GENERATED SQL:');
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
    
    // Step 4: Execute SQL
    console.log('\n⚡ Step 4: Executing SQL...');
    const executionStartTime = Date.now();
    let executionResult = await executeSQL(plannedSQL);
    const executionTime = Date.now() - executionStartTime;
    
    console.log('\n' + '═'.repeat(80));
    console.log('📊 SQL EXECUTION RESULTS');
    console.log('═'.repeat(80));
    console.log(`Rows returned: ${executionResult.length}`);
    console.log(`Execution time: ${executionTime}ms`);
    if (executionResult.length > 0) {
      console.log('\nSample data (first row):');
      console.log(JSON.stringify(executionResult[0], null, 2));
    }
    console.log('═'.repeat(80));
    
    // Step 5: Deterministic formatting
    console.log('\n📝 Step 5: Formatting response...');
    let formattedResponse;
    
    if (executionResult.length === 0) {
      formattedResponse = 'No matching records found.';
      console.log('✓ Response: No results');
    } else if (executionResult.length === 1 && Object.keys(executionResult[0]).length === 1) {
      // Single row, single column - return the value directly
      const value = Object.values(executionResult[0])[0];
      formattedResponse = `${value}`;
      console.log(`✓ Response: Single value: ${value}`);
    } else if (executionResult.length === 1) {
      // Single row, multiple columns - return as object
      formattedResponse = JSON.stringify(executionResult[0]);
      console.log('✓ Response: Single record');
    } else {
      // Multiple rows - return count and data summary
      formattedResponse = `Found ${executionResult.length} result(s).`;
      console.log(`✓ Response: ${executionResult.length} results`);
    }
    
    // Step 6: Extract GeoJSON if available
    const geojson = extractGeoJSON(executionResult);
    
    // Step 7: Return final structured response
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
