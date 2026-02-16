import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Settings:
    """Application settings"""
    
    # Ollama Configuration
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama2")
    
    # Service Configuration
    SERVICE_PORT: int = int(os.getenv("SERVICE_PORT", "8001"))
    SERVICE_HOST: str = os.getenv("SERVICE_HOST", "0.0.0.0")
    
    # API Configuration
    API_PREFIX: str = "/api"
    
settings = Settings()
