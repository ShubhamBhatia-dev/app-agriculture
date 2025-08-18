# File: enhanced_hybrid_rag.py
import os
import sys
from dotenv import load_dotenv
import requests
import json

# --- RAG Imports ---
from langchain.memory import ChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.schema.runnable import RunnablePassthrough
from langchain.schema.output_parser import StrOutputParser

# --- Configuration ---
FAISS_INDEX_PATH = "faiss_index_agri_pesticide"

class RAGQueryEngineWithMemory:
    """
    Enhanced hybrid RAG that automatically redirects to Gemini when local data is insufficient.
    """
    def __init__(self, index_path: str):
        print("--- Initializing Enhanced Hybrid RAG ---")
        self.load_api_key()
        self.vectorstore = self.load_vector_store(index_path)
        self.llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash-exp", temperature=0.5)
        
        # Store conversation history
        self.chat_history_store = {} 
        
        self.rag_chain = self.create_rag_chain()
        self.web_search_llm = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash-exp", 
            temperature=0.3
        )
        
        print("✅ Enhanced Hybrid RAG System ready.")

    def load_api_key(self):
        os.environ["GOOGLE_API_KEY"] = ""
        load_dotenv()

    def load_vector_store(self, index_path: str):
        if not os.path.exists(index_path):
            print(f"❌ Vector store not found at '{index_path}'.")
            sys.exit(1)
        
        try:
            embeddings = OllamaEmbeddings(model="nomic-embed-text")
            vectorstore = FAISS.load_local(
                index_path, 
                embeddings,
                allow_dangerous_deserialization=True 
            )
            print("✅ Vector store loaded.")
            return vectorstore
        except Exception as e:
            print(f"❌ Error loading vector store: {e}")
            sys.exit(1)

    def get_session_history(self, session_id: str) -> ChatMessageHistory:
        if session_id not in self.chat_history_store:
            self.chat_history_store[session_id] = ChatMessageHistory()
        return self.chat_history_store[session_id]

    def create_rag_chain(self):
        """Creates RAG chain that detects when information is insufficient."""
        retriever = self.vectorstore.as_retriever(search_kwargs={"k": 4})

        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an agricultural assistant with access to a database containing information from 2022-2023. 

CRITICAL INSTRUCTIONS:
1. ONLY answer if the retrieved context contains RELEVANT and SPECIFIC information to answer the user's question
2. If the context is empty, irrelevant, or doesn't contain the specific information needed (like specific prices, locations, or data not in your database), you MUST respond with: "SEARCH_NEEDED: [brief description of what information is missing]"
3. Do NOT make up information or provide generic answers when specific data is requested
4. Do NOT apologize or give vague responses - simply indicate search is needed
5. The data you have is from 2022-2023, treat it as current for those years
6. Be strict about what constitutes "relevant" information - if the user asks about wheat prices in Himachal and you don't have that specific data, say SEARCH_NEEDED

Examples of when to say SEARCH_NEEDED:
- User asks about specific crop prices in a specific location that's not in the context
- User asks about information for regions/crops not covered in the retrieved documents
- Context is empty or contains unrelated information
- Context has general information but not the specific details requested

Retrieved context from database: {context}"""),
            MessagesPlaceholder(variable_name="chat_history"),
            ("user", "{question}"),
        ])
        
        base_chain = (
            RunnablePassthrough.assign(
                context=lambda x: self.format_context(retriever.invoke(x["question"]))
            )
            | prompt
            | self.llm
            | StrOutputParser()
        )

        return RunnableWithMessageHistory(
            base_chain,
            self.get_session_history,
            input_messages_key="question",
            history_messages_key="chat_history",
        )

    def format_context(self, docs):
        """Format retrieved documents for better context evaluation."""
        if not docs:
            return "No relevant documents found in the database."
        
        formatted_context = []
        for i, doc in enumerate(docs):
            formatted_context.append(f"Document {i+1}: {doc.page_content}")
        
        return "\n\n".join(formatted_context)

    def search_with_gemini(self, query: str) -> str:
        """Use Gemini to search for current agricultural information."""
        search_prompt = ChatPromptTemplate.from_template("""
        The user is asking about agricultural information: "{query}"
        
        Please provide comprehensive, current information about this agricultural question.
        Focus on:
        - Specific market prices and trends (include current data if available)
        - Regional/location-specific information
        - Seasonal patterns and timing
        - Practical advice for farmers
        - Market analysis and profit maximization strategies
        
        For questions about crop prices in specific regions like Himachal Pradesh, provide:
        - Historical price trends by month
        - Best times to sell for maximum profit
        - Market factors that influence prices
        - Seasonal demand patterns
        
        Be specific and actionable in your response.
        """)
        
        chain = search_prompt | self.web_search_llm | StrOutputParser()
        return chain.invoke({"query": query})

    def ask_question(self, query: str, session_id: str = "default_session"):
        """Main method that tries RAG first, then web search if needed."""
        if not query:
            return "Please ask a question."
        
        print("🔍 Checking local database...")
        
        # Step 1: Try RAG
        config = {"configurable": {"session_id": session_id}}
        rag_response = self.rag_chain.invoke({"question": query}, config=config)
        
        # Step 2: Check if search is needed
        if "SEARCH_NEEDED:" in rag_response:
            print("🌐 Local data insufficient, searching for current information...")
            
            # Search with Gemini
            web_response = self.search_with_gemini(query)
            
            # Return web search response directly since local data was insufficient
            final_response = f"""**Current Agricultural Information:**
{web_response}

*Note: This information was obtained through web search as the specific data wasn't available in the local database.*"""
            
            print("✅ Retrieved current information from web search")
            return final_response
        
        else:
            print("✅ Found complete information in local database")
            return rag_response

    def is_context_relevant(self, context: str, query: str) -> bool:
        """Additional method to check if context is truly relevant (optional enhancement)."""
        # This could be enhanced with semantic similarity checking
        if not context or context.strip() == "No relevant documents found in the database.":
            return False
        
        # Simple keyword matching as fallback
        query_words = query.lower().split()
        context_lower = context.lower()
        
        # Check if at least some query terms appear in context
        matches = sum(1 for word in query_words if word in context_lower)
        return matches > len(query_words) * 0.3  # At least 30% of query words should match


def main():
    engine = RAGQueryEngineWithMemory(index_path=FAISS_INDEX_PATH)
    
    session_id = "user123"
    print(f"\n--- Enhanced Hybrid RAG System ---")
    print("--- Auto-redirects to web search when local data is insufficient ---")
    print("--- Type 'exit' to quit ---")
    
    while True:
        try:
            query = input("\n❓ Your Question: ")
            if query.lower().strip() == 'exit':
                break
            
            response = engine.ask_question(query, session_id=session_id)
            print(f"\n📋 **Answer:**\n{response}")
            print("-" * 50)
            
        except KeyboardInterrupt:
            print("\nExiting...")
            break
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()