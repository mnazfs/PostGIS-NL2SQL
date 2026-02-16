from typing import Dict, Any
from app.services.ollama_client import OllamaClient
from app.services.prompt_builder import PromptBuilder
from app.services.response_parser import ResponseParser

class ModeHandler:
    """Handle different generation modes"""
    
    def __init__(self):
        self.ollama_client = OllamaClient()
        self.prompt_builder = PromptBuilder()
        self.response_parser = ResponseParser()
    
    def handle(
        self,
        user_input: str,
        mode: str,
        context: Dict[str, Any],
        temperature: float = 0.7,
        max_tokens: int = 1000
    ) -> Dict[str, Any]:
        """
        Handle generation request based on mode
        
        Args:
            user_input: User's input text
            mode: Generation mode
            context: Additional context
            temperature: Generation temperature
            max_tokens: Maximum tokens
            
        Returns:
            Dictionary containing result and metadata
        """
        # Build prompt
        prompt = self.prompt_builder.build_prompt(user_input, mode, context)
        
        # Generate response
        ollama_response = self.ollama_client.generate(
            prompt=prompt,
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        if not ollama_response.get("success"):
            return {
                "success": False,
                "error": ollama_response.get("error", "Generation failed")
            }
        
        raw_response = ollama_response.get("response", "")
        
        # Parse response based on mode
        if mode == "sql_generation":
            parsed = self.response_parser.parse_sql_response(raw_response)
        else:
            parsed = self.response_parser.parse_general_response(raw_response)
        
        # Extract metadata
        metadata = self.response_parser.extract_metadata(raw_response, mode)
        metadata["model"] = ollama_response.get("model")
        
        return {
            "success": True,
            "result": parsed,
            "mode": mode,
            "metadata": metadata
        }
