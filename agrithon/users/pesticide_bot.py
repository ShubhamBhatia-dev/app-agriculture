"""

Of course. Now that you've trained your RAG system on the PDF, getting the right response is all about how you ask the question. The key is to be specific and use keywords that are likely to be in the document.

The RAG system works by first finding the most relevant chunks of text from the PDF based on your question, and then using that text to generate an answer. If you ask a good question, it finds the right information.

## Best Practices for Asking Questions
1. Be Specific and Use Keywords
The system is best at matching specific terms. Use the names of pests, diseases, trade names, or chemical names that you see in the document.

Instead of asking this (Vague)	Ask this (Specific)
"What should I do about bugs?"	"What do you recommend for aphids and jassids?"
"Tell me about that one weed killer."	"What is the chemical composition of Round-up?"
"My plants look sick."	"What fungicide can I use for Downy Mildew (DM)?"

Export to Sheets
2. Ask About One Thing at a Time
Complex questions can sometimes confuse the retrieval process. It's better to ask simple, direct questions.

Less effective: "What's good for bollworms and also for mites and what's the dosage for both?"

More effective: First ask, "What insecticide is recommended for bollworms?" Then ask, "What is the dosage for Colonel-S to control mites?"

3. Ask the Types of Questions the Document Can Answer
Your document is a reference guide, so the RAG system will be excellent at answering factual questions based on the table columns:


Dosage/Concentration: "What is the recommended concentration of Actara?" 


Target Pest/Disease: "What is Amistar used to treat?" 


Active Ingredient: "What is the active ingredient in Gramoxone?" 


Product Recommendations: "I have bollworms. What products are recommended?" 


The system will not be able to answer questions about things that aren't in the PDF, such as:

Product prices

Safety information (e.g., "Is Round-up safe for pets?")

Where to buy products

Application methods not mentioned in the text

## Examples of Good Questions to Ask Your RAG System
Here are some well-formed questions you can use as a template:

"What is the recommended dosage for 

Confidor?" 

"What is 

Amistar used for?" 

"I have 

bollworms. What insecticides can I use?" 


"What is the active ingredient in the herbicide 

Stomp?" 

"Tell me about 

Biocatch." 

"What is the chemical composition of 

Larvin?" 

"Which products are recommended against 

mites?" 


"What is the active ingredient percentage in 

Aliette?" 

Think like you're using a search engine: clear, specific keywords will give you the best results.
"""




# File: query_rag_with_memory.py
import os
import sys
from dotenv import load_dotenv

# --- New Imports for Conversational Memory ---
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
    A conversational RAG system that remembers previous turns in the conversation.
    """
    def __init__(self, index_path: str):
        print("--- Initializing Conversational RAG Engine ---")
        self.load_api_key()
        self.vectorstore = self.load_vector_store(index_path)
        self.llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.5)
        
        # --- This will store the conversation history for each session ---
        self.chat_history_store = {} 
        
        self.conversational_chain = self.create_full_chain()
        print("✅ RAG System is ready.")

    def load_api_key(self):
        os.environ["GOOGLE_API_KEY"] = ""
    
        load_dotenv()
        if not os.getenv("GOOGLE_API_KEY"):
            print("❌ FATAL ERROR: GOOGLE_API_KEY not found in .env file.")
            sys.exit(1)

    def load_vector_store(self, index_path: str):
        if not os.path.exists(index_path):
            print(f"❌ FATAL ERROR: Vector store not found at '{index_path}'.")
            sys.exit(1)
        
        try:
            embeddings = OllamaEmbeddings(model="nomic-embed-text")
            vectorstore = FAISS.load_local(
                index_path, 
                embeddings,
                allow_dangerous_deserialization=True 
            )
            print("✅ Vector store loaded from disk.")
            return vectorstore
        except Exception as e:
            print(f"❌ FATAL ERROR: Could not connect to Ollama or load the vector store: {e}")
            sys.exit(1)

    def get_session_history(self, session_id: str) -> ChatMessageHistory:
        """Gets the chat history for a given session, creating it if it doesn't exist."""
        if session_id not in self.chat_history_store:
            self.chat_history_store[session_id] = ChatMessageHistory()
        return self.chat_history_store[session_id]

    def create_full_chain(self):
        """Creates the full conversational RAG chain."""
        retriever = self.vectorstore.as_retriever()

        # --- MODIFIED PROMPT: Now includes a placeholder for chat history ---
        # The system prompt now also considers the history of the conversation.
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a helpful agricultural assistant. Answer the user's questions based on the provided context and the conversation history. If the answer isn't in the context, say you don't know.\n\nContext:\n{context}"),
            MessagesPlaceholder(variable_name="chat_history"),
            ("user", "{question}"),
        ])
        
        # This is the core RAG chain that processes a single turn
        base_rag_chain = (
            RunnablePassthrough.assign(
                context=lambda x: retriever.invoke(x["question"])
            )
            | prompt
            | self.llm
            | StrOutputParser()
        )

        # --- NEW: Wrap the base chain with memory management ---
        # This wrapper automatically saves user questions and AI answers to the history
        # and loads them into the `chat_history` variable for the prompt.
        conversational_chain = RunnableWithMessageHistory(
            base_rag_chain,
            self.get_session_history,
            input_messages_key="question",
            history_messages_key="chat_history",
        )
        
        return conversational_chain

    def ask_question(self, query: str, session_id: str = "default_session"):
        """Invokes the conversational chain with a user's question and a session ID."""
        if not query:
            return "Please ask a question."
        
        print("\nThinking...")
        
        # The `config` dictionary is crucial for passing the session_id
        # to the memory management system.
        config = {"configurable": {"session_id": session_id}}
        
        result = self.conversational_chain.invoke({"question": query}, config=config)
        return result

def main():
    engine = RAGQueryEngineWithMemory(index_path=FAISS_INDEX_PATH)
    
    # We'll use a single session ID for this command-line example.
    # In a real app, each user would have a unique session ID.
    session_id = "user123" 
    print(f"\n--- Starting conversation (Session ID: {session_id}) ---")
    print("--- Ask a question! (Type 'exit' to quit) ---")
    
    while True:
        try:
            query = input("\nYour Question: ")
            if query.lower().strip() == 'exit':
                break
            engine.ask_question(query, session_id=session_id)
        except KeyboardInterrupt:
            print("\nExiting.")
            break

