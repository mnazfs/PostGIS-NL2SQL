from typing import Dict, Any
from app.services.ollama_client import call_ollama
from app.services.prompt_builder import (
    build_planning_prompt,
    build_refinement_prompt,
    build_formatting_prompt,
    PromptBuilder
)
from app.services.response_parser import ResponseParser

def handle_mode(mode: str, payload: dict) -> dict:
    """
    Handle generation request based on mode
    
    Args:
        mode: Generation mode (planning, refinement, formatting)
        payload: Request payload containing input and context
        
    Returns:
        Dictionary with mode-specific response
        
    Raises:
        Exception: If mode is unknown or processing fails
    """
    if mode == "planning":
        query = payload.get("query", "")
        schema = payload.get("schema", "")
        
        prompt = build_planning_prompt(query, schema)
        response = call_ollama(prompt)
        
        raw_text = response.get("response", "")
        print(f"📝 Raw LLM response for planning:\n{raw_text}\n")
        
        try:
            parsed = ResponseParser.extract_json_from_response(raw_text)
            return parsed
        except Exception as e:
            print(f"❌ Failed to parse JSON from LLM response: {str(e)}")
            raise Exception(f"Failed to parse LLM response as JSON: {str(e)}")
    
    elif mode == "refinement":
        original_query = payload.get("original_query", "")
        execution_results = payload.get("execution_results", {})
        
        prompt = build_refinement_prompt(original_query, execution_results)
        response = call_ollama(prompt)
        
        raw_text = response.get("response", "")
        print(f"📝 Raw LLM response for refinement:\n{raw_text}\n")
        
        try:
            parsed = ResponseParser.extract_json_from_response(raw_text)
            return parsed
        except Exception as e:
            print(f"❌ Failed to parse JSON from LLM response: {str(e)}")
            raise Exception(f"Failed to parse LLM response as JSON: {str(e)}")
    
    elif mode == "formatting":
        original_query = payload.get("query", "")
        final_data = payload.get("final_data", {})
        
        prompt = build_formatting_prompt(original_query, final_data)
        response = call_ollama(prompt)
        
        raw_text = response.get("response", "")
        print(f"📝 Raw LLM response for formatting:\n{raw_text}\n")
        
        try:
            parsed = ResponseParser.extract_json_from_response(raw_text)
            return {
                "summary": parsed.get("summary", "")
            }
        except Exception as e:
            print(f"❌ Failed to parse JSON from LLM response: {str(e)}")
            raise Exception(f"Failed to parse LLM response as JSON: {str(e)}")
    
    elif mode == "table_selection":
        query = payload.get("query", "")
        schema = payload.get("schema", "")
        
        prompt = PromptBuilder.build_prompt(
            user_input=query,
            mode="table_selection",
            context={"schema": schema}
        )
        response = call_ollama(prompt)
        
        raw_text = response.get("response", "")
        print(f"📝 Raw LLM response for table_selection:\n{raw_text}\n")
        
        try:
            parsed = ResponseParser.extract_json_from_response(raw_text)
            return parsed
        except Exception as e:
            print(f"❌ Failed to parse JSON from LLM response: {str(e)}")
            raise Exception(f"Failed to parse LLM response as JSON: {str(e)}")
    
    else:
        raise Exception(f"Unknown mode: {mode}")

