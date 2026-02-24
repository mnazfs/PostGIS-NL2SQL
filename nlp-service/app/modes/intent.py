"""Intent classification for natural language queries"""
import json
import requests
from typing import Dict
from app import config


def classify_intent(query: str) -> dict:
    """
    Classify the intent of a natural language query
    
    Args:
        query: The user's natural language query
        
    Returns:
        Dict with intent classification in format:
        {
            "intent": "sql_query" | "knowledge_query" | "geo_query"
        }
        
    Intent Rules:
        - sql_query: Numeric, count, field-based queries
        - knowledge_query: Definition/explanation questions
        - geo_query: Nearest, within, distance, location queries
    """
    prompt = f"""Classify the following query into one of these intents:

1. sql_query - Numeric queries, count queries, field-based queries (e.g., "How many students?", "Show all records", "What is the total?")
2. knowledge_query - Definition or explanation questions (e.g., "What is a transformer?", "Explain how this works", "Define GDP")
3. geo_query - Spatial/location queries using nearest, within, distance, location terms (e.g., "Find nearest hospital", "Schools within 5km", "Distance from A to B")

Query: "{query}"

IMPORTANT OUTPUT RULES:
- Return ONLY valid JSON
- NO markdown formatting
- NO code blocks
- NO explanations
- NO additional text
- STRICT JSON format only

Return format:
{{"intent": "sql_query"}}
OR
{{"intent": "knowledge_query"}}
OR
{{"intent": "geo_query"}}"""

    try:
        # Call Ollama with temperature 0 for deterministic output
        url = f"{config.OLLAMA_URL}/api/generate"
        
        body = {
            "model": config.OLLAMA_MODEL,
            "prompt": prompt,
            "temperature": 0,  # Temperature = 0 for strict classification
            "stream": False
        }
        
        response = requests.post(url, json=body, timeout=60)
        response.raise_for_status()
        
        result = response.json()
        response_text = result.get("response", "").strip()
        
        # Clean response: remove markdown code blocks if present
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            # Remove first and last line if they are code block markers
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            response_text = "\n".join(lines).strip()
        
        # Parse JSON response
        intent_data = json.loads(response_text)
        
        # Validate intent value
        valid_intents = ["sql_query", "knowledge_query", "geo_query"]
        if "intent" not in intent_data or intent_data["intent"] not in valid_intents:
            # Default to sql_query if invalid
            return {"intent": "sql_query"}
        
        return intent_data
        
    except (requests.exceptions.RequestException, json.JSONDecodeError, Exception) as e:
        # Default to sql_query on error
        print(f"Error classifying intent: {str(e)}")
        return {"intent": "sql_query"}
