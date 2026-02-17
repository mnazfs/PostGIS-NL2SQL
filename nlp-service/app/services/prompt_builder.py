from typing import Dict, Any, Optional

def build_planning_prompt(query: str, schema: str) -> str:
    """
    Build prompt for SQL planning phase
    
    Args:
        query: User's natural language query
        schema: Database schema definition
        
    Returns:
        Formatted prompt string for planning
    """
    prompt = f"""You are a PostgreSQL/PostGIS expert specializing in schema-grounded SQL generation.
Your job is to generate SQL that strictly aligns with the provided database schema and sample values.

DATABASE SCHEMA:
{schema}

USER QUERY:
{query}

CRITICAL REQUIREMENTS:
- Use ONLY SELECT statements (no INSERT, UPDATE, DELETE, DROP)
- Always include LIMIT clause
- **IMPORTANT**: Column/table names shown with double quotes in the schema MUST be quoted in your SQL
- Example: If schema shows "No_of_floors", use "No_of_floors" in SQL (NOT No_of_floors)
- Use proper PostGIS functions for spatial queries
- Return VALID JSON ONLY, no markdown, no explanations
- Use sample values provided in the schema to match user-mentioned entities.
- When the user mentions a name (e.g., building name), compare it against sample values in the relevant column.
- If the user uses abbreviations (e.g., "CSE"), attempt to match it to the closest available sample value.
- Prefer ILIKE '%value%' for flexible matching instead of assuming prefixes like 'CSE%'.
- DO NOT invent entity names that are not present in the schema sample values.
- If no reasonable match is found from sample values, set "requires_second_phase" to true.
- If a user term is similar to a sample value (e.g., CSE vs CS/IT Block), select the closest semantic match.

MATCHING STRATEGY:
1. Identify entities mentioned in the user query.
2. Locate the corresponding table and column in the schema.
3. Compare the entity against provided sample values.
4. Choose the closest match.
5. Only then generate SQL.
6. Verify that all selected columns exist in the chosen table before finalizing SQL.

COLUMN-TABLE CONSISTENCY RULES:
- Every column used in the SQL query MUST exist in the selected table.
- You MUST verify column existence using the schema provided.
- Do NOT reference a column from one table while selecting FROM another table.
- If a column exists in only one table, you MUST use that table in the FROM clause.
- If multiple tables are provided, choose the table that contains all required columns.
- Never assume a column exists in a table unless explicitly shown in the schema.

OUTPUT FORMAT (JSON ONLY):
{{
  "sql": "your SQL query here",
  "confidence": 0.0-1.0,
  "requires_second_phase": boolean
}}

Return only the JSON object, nothing else."""
    return prompt

def build_refinement_prompt(original_query: str, execution_results: dict) -> str:
    """
    Build prompt for SQL refinement phase
    
    Args:
        original_query: Original SQL query that was executed
        execution_results: Results from executing the query
        
    Returns:
        Formatted prompt string for refinement
    """
    prompt = f"""You are a PostgreSQL/PostGIS expert. Refine the SQL query based on execution results.

ORIGINAL SQL:
{original_query}

EXECUTION RESULTS:
{execution_results}

TASK:
Improve the SQL query to better answer the user's intent.

STRICT REQUIREMENTS:
- Use ONLY SELECT statements
- Always include LIMIT clause
- Fix any errors or inefficiencies
- Return VALID JSON ONLY, no markdown, no explanations

OUTPUT FORMAT (JSON ONLY):
{{
  "sql": "improved query",
  "changes_made": "brief description"
}}

Return only the JSON object, nothing else."""
    return prompt

def build_formatting_prompt(original_query: str, final_data: dict) -> str:
    """
    Build prompt for formatting results into user-friendly summary
    
    Args:
        original_query: Original user query
        final_data: Final data to be formatted
        
    Returns:
        Formatted prompt string for summary generation
    """
    prompt = f"""You are a data presentation expert. Create a user-friendly summary.

USER QUERY:
{original_query}

DATA:
{final_data}

TASK:
Generate a clear, concise summary that answers the user's question.

STRICT REQUIREMENTS:
- Be conversational and helpful
- Include key insights from the data
- Keep it brief (2-3 sentences)
- Return VALID JSON ONLY, no markdown, no explanations

OUTPUT FORMAT (JSON ONLY):
{{
  "summary": "user-friendly text summary here"
}}

Return only the JSON object, nothing else."""
    return prompt

class PromptBuilder:
    """Build prompts based on mode and context"""
    
    @staticmethod
    def build_prompt(user_input: str, mode: str, context: Optional[Dict[str, Any]] = None) -> str:
        """
        Build a prompt based on the mode and context
        
        Args:
            user_input: The user's input text
            mode: The generation mode
            context: Additional context information
            
        Returns:
            Formatted prompt string
        """
        context = context or {}
        
        if mode == "planning":
            schema = context.get("schema", "")
            return build_planning_prompt(user_input, schema)
        elif mode == "refinement":
            execution_results = context.get("execution_results", {})
            return build_refinement_prompt(user_input, execution_results)
        elif mode == "formatting":
            final_data = context.get("final_data", {})
            return build_formatting_prompt(user_input, final_data)
        elif mode == "sql_generation":
            return PromptBuilder._build_sql_prompt(user_input, context)
        elif mode == "schema_analysis":
            return PromptBuilder._build_schema_prompt(user_input, context)
        elif mode == "query_explanation":
            return PromptBuilder._build_explanation_prompt(user_input, context)
        elif mode == "table_selection":
            return PromptBuilder._build_table_selection_prompt(user_input, context)
        else:
            return user_input
    
    @staticmethod
    def _build_sql_prompt(user_input: str, context: Dict[str, Any]) -> str:
        """Build prompt for SQL generation"""
        schema_info = context.get("schema", "")
        
        prompt = f"""You are a SQL expert. Convert the following natural language query to SQL.

Database Schema:
{schema_info}

User Query: {user_input}

Generate only the SQL query without explanation."""
        return prompt
    
    @staticmethod
    def _build_schema_prompt(user_input: str, context: Dict[str, Any]) -> str:
        """Build prompt for schema analysis"""
        schema = context.get("schema", "")
        
        prompt = f"""Analyze the following database schema and answer the question.

Schema:
{schema}

Question: {user_input}

Provide a clear and concise answer."""
        return prompt
    
    @staticmethod
    def _build_explanation_prompt(user_input: str, context: Dict[str, Any]) -> str:
        """Build prompt for query explanation"""
        query = context.get("query", user_input)
        
        prompt = f"""Explain the following SQL query in simple terms.

SQL Query:
{query}

Provide a clear explanation of what this query does."""
        return prompt
    
    @staticmethod
    def _build_table_selection_prompt(user_input: str, context: Dict[str, Any]) -> str:
        """Build prompt for table selection phase
        
        This prompt helps identify which tables are relevant to answer the user's query.
        It includes only table and column names without data types, constraints, or sample values.
        
        Args:
            user_input: The user's natural language query
            context: Dictionary containing schema information
            
        Returns:
            Formatted prompt string for table selection
        """
        schema = context.get("schema", "")
        
        # Extract only table and column names from schema (no data types, constraints, or sample values)
        # The schema is expected to be provided in a simplified format by the caller
        
        prompt = f"""You are a database expert specializing in table selection for query planning.
Your task is to identify which tables are needed to answer the user's query.

DATABASE SCHEMA (Table and Column Names Only):
{schema}

USER QUERY:
{user_input}

CRITICAL REQUIREMENTS:
- Identify which tables are needed to answer the query
- Choose only tables that are directly required
- If unsure, include the most likely table
- Return VALID JSON ONLY, no markdown, no explanations
- DO NOT generate SQL
- DO NOT include explanations

OUTPUT FORMAT (JSON ONLY):
{{
  "relevant_tables": ["table1", "table2"],
  "confidence": 0.0-1.0
}}

Return only the JSON object, nothing else."""
        return prompt
