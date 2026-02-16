from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import generate
from app import config

app = FastAPI(
    title="NLP Service",
    description="Natural Language Processing service using Ollama",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(generate.router, prefix="/api", tags=["generate"])

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "success": True,
        "message": "NLP service healthy"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=config.PORT,
        reload=True
    )
