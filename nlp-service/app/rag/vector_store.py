"""Vector store for RAG similarity search using FAISS"""
import numpy as np
from typing import List
from sentence_transformers import SentenceTransformer
import faiss


class VectorStore:
    """
    In-memory vector store using FAISS for similarity search
    
    Uses sentence-transformers (all-MiniLM-L6-v2) for embeddings
    and FAISS for efficient nearest neighbor search
    """
    
    def __init__(self, documents: List[str]):
        """
        Initialize vector store with knowledge documents
        
        Args:
            documents: List of text chunks to index
            
        Raises:
            Exception: If model loading or indexing fails
        """
        print("🤖 Initializing VectorStore...")
        
        # Store documents
        self.documents = documents
        
        if not documents or len(documents) == 0:
            print("⚠️  No documents provided, creating empty vector store")
            self.index = None
            self.model = None
            return
        
        print(f"📚 Loading sentence-transformer model: all-MiniLM-L6-v2")
        
        # Load sentence-transformer model
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        
        print(f"✓ Model loaded")
        print(f"📊 Encoding {len(documents)} document chunks...")
        
        # Generate embeddings for all documents
        self.embeddings = self.model.encode(
            documents,
            convert_to_numpy=True,
            show_progress_bar=True
        )
        
        print(f"✓ Generated {self.embeddings.shape[0]} embeddings")
        print(f"  Embedding dimension: {self.embeddings.shape[1]}")
        
        # Build FAISS index
        print("🔨 Building FAISS index...")
        dimension = self.embeddings.shape[1]
        
        # Use IndexFlatL2 for exact L2 distance search (no compression)
        self.index = faiss.IndexFlatL2(dimension)
        
        # Add embeddings to index
        self.index.add(self.embeddings.astype('float32'))
        
        print(f"✓ FAISS index built with {self.index.ntotal} vectors")
        print("✨ VectorStore ready!\n")
    
    def retrieve(self, query: str, k: int = 3) -> List[str]:
        """
        Retrieve top k most similar documents for a query
        
        Args:
            query: Query text to search for
            k: Number of results to return (default: 3)
            
        Returns:
            List of top k most similar document chunks
            
        Raises:
            Exception: If retrieval fails
        """
        # Handle empty vector store
        if self.index is None or self.model is None:
            print("⚠️  Vector store is empty, returning no results")
            return []
        
        # Ensure k doesn't exceed number of documents
        k = min(k, len(self.documents))
        
        if k <= 0:
            return []
        
        try:
            print(f"🔍 Retrieving top {k} chunks for query: \"{query}\"")
            
            # Embed the query
            query_embedding = self.model.encode(
                [query],
                convert_to_numpy=True
            )
            
            # Perform similarity search
            distances, indices = self.index.search(
                query_embedding.astype('float32'),
                k
            )
            
            # Extract top k documents
            results = []
            for i, idx in enumerate(indices[0]):
                if idx < len(self.documents):
                    distance = distances[0][i]
                    results.append(self.documents[idx])
                    print(f"  {i+1}. Document {idx} (distance: {distance:.4f})")
            
            print(f"✓ Retrieved {len(results)} chunks\n")
            return results
            
        except Exception as e:
            print(f"❌ Error during retrieval: {str(e)}")
            raise Exception(f"Vector store retrieval failed: {str(e)}")
    
    def get_stats(self) -> dict:
        """
        Get statistics about the vector store
        
        Returns:
            Dictionary with store statistics
        """
        if self.index is None:
            return {
                "total_documents": 0,
                "index_size": 0,
                "embedding_dimension": 0,
                "model": None
            }
        
        return {
            "total_documents": len(self.documents),
            "index_size": self.index.ntotal,
            "embedding_dimension": self.embeddings.shape[1],
            "model": "all-MiniLM-L6-v2"
        }
