"""RAG (Retrieval Augmented Generation) mode for knowledge queries"""
import json
import requests
from typing import Dict
from app import config
from app.main import get_vector_store


def generate_rag_answer(query: str) -> dict:
    """
    Generate answer using RAG (Retrieval Augmented Generation)
    
    Args:
        query: User's knowledge question
        
    Returns:
        Dict with answer in format:
        {
            "answer": "..."
        }
        
    Process:
        1. Retrieve top 3 relevant documents from vector store
        2. Build prompt with strict context-only instructions
        3. Call LLM to generate answer
        4. Return strict JSON response
    """
    try:
        # Step 1: Retrieve top 3 relevant documents from vector store
        vector_store = get_vector_store()
        
        if vector_store is None:
            return {
                "answer": "Knowledge base is not available. Please try again later."
            }
        
        print(f"🔍 Retrieving relevant documents for: \"{query}\"")
        retrieved_chunks = vector_store.retrieve(query, k=3)
        
        if not retrieved_chunks or len(retrieved_chunks) == 0:
            return {
                "answer": "I don't have information about this topic in my knowledge base."
            }
        
        # Step 2: Build context from retrieved chunks
        context = "\n\n".join([f"Document {i+1}:\n{chunk}" for i, chunk in enumerate(retrieved_chunks)])
        
        print(f"📚 Retrieved {len(retrieved_chunks)} relevant document chunks")
        
        # Step 3: Build prompt with strict instructions
        prompt = f"""You are a helpful assistant that answers questions based ONLY on the provided context.

CONTEXT:
{context}

QUESTION: {query}

INSTRUCTIONS:
- Answer the question using ONLY the information from the provided context above
- If the answer cannot be found in the context, respond with "I don't know based on the provided information"
- Do NOT use external knowledge
- Be concise and direct
- Return ONLY valid JSON in the exact format specified below

IMPORTANT OUTPUT RULES:
- Return ONLY valid JSON
- NO markdown formatting
- NO code blocks
- NO explanations
- NO additional text
- STRICT JSON format only

Return format:
{{"answer": "your answer here"}}"""

        # Step 4: Call LLM
        print("🤖 Calling LLM to generate answer...")
        url = f"{config.OLLAMA_URL}/api/generate"
        
        body = {
            "model": config.OLLAMA_MODEL,
            "prompt": prompt,
            "temperature": 0,  # Temperature = 0 for consistent answers
            "stream": False
        }
        
        response = requests.post(url, json=body, timeout=60)
        response.raise_for_status()
        
        result = response.json()
        response_text = result.get("response", "").strip()
        
        print(f"📝 LLM response received")
        
        # Step 5: Parse JSON response
        # Clean response: remove markdown code blocks if present
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            # Remove first and last line if they are code block markers
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            response_text = "\n".join(lines).strip()
        
        # Parse JSON
        try:
            answer_data = json.loads(response_text)
            
            # Validate structure
            if "answer" not in answer_data:
                answer_data = {"answer": response_text}
            
            print(f"✓ Answer generated successfully")
            return answer_data
            
        except json.JSONDecodeError:
            # If JSON parsing fails, wrap the response
            print(f"⚠️  Response was not valid JSON, wrapping as answer")
            return {"answer": response_text}
        
    except Exception as e:
        print(f"❌ Error generating RAG answer: {str(e)}")
        return {
            "answer": f"An error occurred while processing your question: {str(e)}"
        }
