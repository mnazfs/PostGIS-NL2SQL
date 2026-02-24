from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import generate
from app import config
from app.rag.knowledge_loader import load_documents
from app.rag.vector_store import VectorStore
import os

# Global vector store instance
vector_store = None

def get_vector_store():
    """
    Get the global vector store instance
    
    Returns:
        VectorStore instance or None if not initialized
    """
    return vector_store

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

@app.on_event("startup")
async def startup_event():
    """Initialize vector store at application startup"""
    global vector_store
    
    print("\n" + "="*80)
    print("🚀 Starting NLP Service - Initializing RAG Vector Store")
    print("="*80)
    
    try:
        knowledge_folder = config.KNOWLEDGE_FOLDER
        
        # Check if knowledge folder exists
        if os.path.exists(knowledge_folder):
            print(f"📂 Knowledge folder: {knowledge_folder}")
            
            # Load documents from knowledge folder
            documents = load_documents(knowledge_folder)
            
            if documents and len(documents) > 0:
                # Build vector store
                vector_store = VectorStore(documents)
                print("✅ Vector store initialized successfully")
            else:
                print("⚠️  No documents found in knowledge folder")
                print("⚠️  Vector store will be empty")
                vector_store = VectorStore([])
        else:
            print(f"⚠️  Knowledge folder does not exist: {knowledge_folder}")
            print("⚠️  Vector store will be empty")
            vector_store = VectorStore([])
    
    except Exception as e:
        print(f"❌ Error initializing vector store: {str(e)}")
        print("⚠️  Continuing with empty vector store")
        vector_store = VectorStore([])
    
    print("="*80)
    print("✨ NLP Service startup complete\n")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "success": True,
        "message": "NLP service healthy",
        "vector_store_ready": vector_store is not None
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=config.PORT,
        reload=True
    )
