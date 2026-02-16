const axios = require('axios');

class NLPClient {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.apiEndpoint = process.env.OPENAI_API_ENDPOINT || 'https://api.openai.com/v1/chat/completions';
    this.model = process.env.OPENAI_MODEL || 'gpt-4';
    this.maxTokens = parseInt(process.env.MAX_TOKENS) || 2000;
    this.temperature = parseFloat(process.env.TEMPERATURE) || 0.2;
  }

  // Generate SQL from natural language query
  async generateSQL(naturalLanguageQuery, schemaContext) {
    try {
      const systemPrompt = this.buildSystemPrompt(schemaContext);
      const userPrompt = this.buildUserPrompt(naturalLanguageQuery);

      const response = await this.callLLM([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]);

      return this.extractSQL(response);

    } catch (error) {
      console.error('NLP SQL generation error:', error);
      throw new Error(`Failed to generate SQL: ${error.message}`);
    }
  }

  // Build system prompt with schema context
  buildSystemPrompt(schemaContext) {
    return `You are an expert PostgreSQL/PostGIS SQL query generator. Your task is to convert natural language questions into valid SQL queries.

Database Schema:
${schemaContext}

Important Guidelines:
1. Generate ONLY SELECT queries - no INSERT, UPDATE, DELETE, or DDL statements
2. Always include appropriate LIMIT clauses (default 100 rows unless specified)
3. Use proper JOINs when querying multiple tables
4. For spatial queries, use PostGIS functions (ST_Within, ST_Distance, ST_Intersects, etc.)
5. Include WHERE clauses to filter data appropriately
6. Use meaningful column aliases for calculated fields
7. Comment complex queries to explain logic
8. Return ONLY the SQL query without any explanation or markdown formatting
9. Ensure all table and column names exist in the schema provided
10. For geometry columns, use ST_AsGeoJSON() to return results in GeoJSON format when appropriate

Response Format:
Return ONLY the SQL query as plain text. Do not wrap it in markdown code blocks or add any explanatory text.`;
  }

  // Build user prompt
  buildUserPrompt(query) {
    return `Convert this natural language query to SQL:

${query}

Remember: Return ONLY the SQL query, nothing else.`;
  }

  // Call the LLM API
  async callLLM(messages) {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const response = await axios.post(
      this.apiEndpoint,
      {
        model: this.model,
        messages: messages,
        temperature: this.temperature,
        max_tokens: this.maxTokens
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        timeout: 30000 // 30 second timeout
      }
    );

    if (!response.data.choices || response.data.choices.length === 0) {
      throw new Error('No response from LLM');
    }

    return response.data.choices[0].message.content.trim();
  }

  // Extract SQL from LLM response
  extractSQL(response) {
    // Remove markdown code blocks if present
    let sql = response.replace(/```sql\n?/gi, '').replace(/```\n?/g, '').trim();
    
    // Remove any leading/trailing whitespace
    sql = sql.trim();
    
    // Basic validation
    if (!sql.toLowerCase().startsWith('select') && !sql.toLowerCase().startsWith('with')) {
      throw new Error('Generated query is not a SELECT statement');
    }

    return sql;
  }

  // Improve or fix SQL query
  async improveSQL(originalSQL, error, schemaContext) {
    try {
      const systemPrompt = `You are an expert PostgreSQL/PostGIS SQL query debugger. Fix the broken SQL query based on the error message and schema provided.

Database Schema:
${schemaContext}

Guidelines:
1. Analyze the error and fix the query
2. Ensure all table and column names are correct
3. Fix syntax errors
4. Return ONLY the corrected SQL query
5. Do not add explanations`;

      const userPrompt = `Fix this SQL query:

Original Query:
${originalSQL}

Error:
${error}

Return ONLY the fixed SQL query.`;

      const response = await this.callLLM([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]);

      return this.extractSQL(response);

    } catch (error) {
      console.error('SQL improvement error:', error);
      throw new Error(`Failed to improve SQL: ${error.message}`);
    }
  }

  // Generate natural language explanation of query results
  async explainResults(query, sql, results, rowCount) {
    try {
      const systemPrompt = `You are a helpful assistant that explains database query results in natural language. Be concise and clear.`;

      const userPrompt = `The user asked: "${query}"

The SQL query executed was:
${sql}

The query returned ${rowCount} row(s).

Provide a brief, natural language summary of what was found. Keep it under 3 sentences.`;

      const response = await this.callLLM([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]);

      return response;

    } catch (error) {
      console.error('Results explanation error:', error);
      // Return a default message if explanation fails
      return `Found ${rowCount} result(s) for your query.`;
    }
  }
}

// Export singleton instance
module.exports = new NLPClient();
