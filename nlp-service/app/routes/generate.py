from fastapi import APIRouter, HTTPException
from app.models.request_models import GenerateRequest, GenerateResponse
from app.services.mode_handler import ModeHandler

router = APIRouter()
mode_handler = ModeHandler()

@router.post("/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest):
    """
    Generate NLP response based on input and mode
    
    Args:
        request: GenerateRequest containing prompt, mode, and context
        
    Returns:
        GenerateResponse with result or error
    """
    try:
        result = mode_handler.handle(
            user_input=request.prompt,
            mode=request.mode,
            context=request.context or {},
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )
        
        if not result.get("success"):
            return GenerateResponse(
                success=False,
                mode=request.mode,
                error=result.get("error", "Generation failed")
            )
        
        return GenerateResponse(
            success=True,
            result=result.get("result"),
            mode=result.get("mode"),
            metadata=result.get("metadata")
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
