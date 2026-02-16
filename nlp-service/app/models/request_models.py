from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class GenerateRequest(BaseModel):
    """Request model for text generation"""
    prompt: str = Field(..., description="The input prompt for generation")
    mode: str = Field(default="general", description="Generation mode (sql_generation, schema_analysis, etc.)")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Additional context for generation")
    temperature: Optional[float] = Field(default=0.7, ge=0.0, le=2.0, description="Temperature for generation")
    max_tokens: Optional[int] = Field(default=1000, gt=0, description="Maximum tokens to generate")

class GenerateResponse(BaseModel):
    """Response model for text generation"""
    success: bool
    result: Optional[str] = None
    mode: str
    metadata: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
