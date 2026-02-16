from typing import Dict, Any, Optional

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
        
        if mode == "sql_generation":
            return PromptBuilder._build_sql_prompt(user_input, context)
        elif mode == "schema_analysis":
            return PromptBuilder._build_schema_prompt(user_input, context)
        elif mode == "query_explanation":
            return PromptBuilder._build_explanation_prompt(user_input, context)
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
