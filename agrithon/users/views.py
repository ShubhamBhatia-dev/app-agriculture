from django.db.models import Min
import random
from rest_framework.views import APIView
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from rest_framework.response import Response
from rest_framework import status
from .models import User,WhatsApp,AppHistory
from .serializers import UserSerializer
from twilio.twiml.messaging_response import MessagingResponse
from deep_translator import GoogleTranslator
from langdetect import detect
from django.http import HttpResponse
from django.utils import timezone
import time
from langchain_google_genai import ChatGoogleGenerativeAI
from geopy.geocoders import Nominatim
from django.core.cache import cache
from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from langchain.tools import tool
from django.shortcuts import render
from django.conf import settings # Import Django's settings
from .whatsapp_bot_handler import check_greeting,INTRO_TEXT,check_pincode_intent,extract_address_details,analyze_farmer_query,get_weather_forecast_for_user,get_confident_answer_string
# Assuming you have a file for your RAG engines
from .pesticide_bot import RAGQueryEngineWithMemory
from .models import Chats
import re
import os
from django.http import HttpResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from rest_framework.views import APIView

# Import the Twilio VoiceResponse
from twilio.twiml.voice_response import VoiceResponse, Gather
from .app_bot_handler import send_sms
from django.core.cache import cache
from .models import User, FarmerCrops
from .serializers import FarmerCropsSerializer

# --- Define Paths and Initialize Engines ---
# It's good practice to define paths relative to your project if possible
FAISS_INDEX_PATH_PESTICIDE = "/home/shivam/Desktop/learning/hacarhon/agrithon/users/faiss_index_agri_pesticide"
FAISS_INDEX_PATH_PRICE = "/home/shivam/Desktop/learning/hacarhon/agrithon/users/faiss_index_agri"

pesticide_engine = RAGQueryEngineWithMemory(index_path=FAISS_INDEX_PATH_PESTICIDE)
price_engine = RAGQueryEngineWithMemory(index_path=FAISS_INDEX_PATH_PRICE)

# --- Utility Functions ---
def fast_check_pincode(text: str) -> dict:
    """Enhanced pincode validation with better regex"""
    # More flexible regex that handles spaces and different formats
    match = re.search(r'\b\d{6}\b', text.replace(' ', '').replace('-', ''))
    if match:
        return {"is_pincode": True, "pincode": match.group(0)}
    else:
        return {"is_pincode": False, "pincode": None}

def home(request):
    return render(request, 'home.html')

# --- API Views ---
class CreateUserView(APIView):
    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "User created successfully"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# --- Constants for State Machine ---
AWAITING_PIN_CODE = "awaiting_pin_code"
AWAITING_GREETING_NUMBER = "awaiting_greeting_number"
AWAITING_ADDRESS = "awaiting_address"
AWAITING_LANGUAGE_CHOICE = "awaiting_language_choice"
AWAITING_PROBLEM_TYPE = "awaiting_problem_type"
AWAITING_PROBLEMS = ["disease", "crop_selection", "yield_improvement", "loan", "weather", "other", "crop_price"]
geolocator = Nominatim(user_agent="my_farming_assistant_app_v1")

# --- Enhanced Language Support ---
SUPPORTED_LANGUAGES = {
    "1": {"code": "en", "name": "English", "voice": "alice"},
    "2": {"code": "hi", "name": "हिन्दी (Hindi)", "voice": "alice"},
    "3": {"code": "mr", "name": "मराठी (Marathi)", "voice": "alice"},
    "4": {"code": "ta", "name": "தமிழ் (Tamil)", "voice": "alice"},
    "5": {"code": "te", "name": "తెలుగు (Telugu)", "voice": "alice"},
    "6": {"code": "kn", "name": "ಕನ್ನಡ (Kannada)", "voice": "alice"},
}

# Voice language mappings for Twilio
VOICE_LANGUAGES = {
    "en": "en-US",
    "hi": "hi-IN", 
    "mr": "mr-IN",
    "ta": "ta-IN",
    "te": "te-IN",
    "kn": "kn-IN"
}

# --- Add these imports at the top of your views.py ---
from langchain.memory import ConversationBufferMemory
from langchain_core.messages import HumanMessage, AIMessage
# CORRECT
from langchain_core.messages import messages_from_dict, messages_to_dict

# --- New LangChain Helper Functions ---

# Place this function with your other helper functions in views.py

def _get_contextual_ai_reply(user_input: str, history: list, user_profile: User) -> str:
    """
    Uses a LangChain agent with tools to generate a contextual response.
    This is the CORE AI LOGIC for both App and WhatsApp.
    """
    # --- 1. Define Tools the AI can use ---
    @tool
    def get_weather_forecast(query: str) -> str:
        """
        Useful for getting the weather forecast for the user's location.
        The user's location is already known from their profile.
        """
        lat = getattr(user_profile, 'latitude', None)
        lon = getattr(user_profile, 'longitude', None)
        
        if not lat or not lon:
            return "I can't provide a weather forecast because your location is not set. Please provide a PIN code and address first. 📍"
        try:
            weather_info = get_weather_forecast_for_user(query, lat, lon)
            return f"🌤️ Weather Information:\n\n{weather_info}"
        except Exception as e:
            logger.error(f"Weather tool error for user {user_profile.phone}: {e}")
            return "I'm having trouble getting weather information right now. Please try again later. ☁️"

    @tool
    def get_crop_disease_information(query: str) -> str:
        """
        Useful for diagnosing crop diseases or getting information on pesticides and treatments.
        """
        try:
            # FIX: Removed the 'chat_history' argument. The engine uses session_id for memory.
            result = pesticide_engine.ask_question(
                query, 
                session_id=str(user_profile.phone)
            )
            return f"🌿 Crop Disease Information:\n\n{result}"
        except Exception as e:
            logger.error(f"Disease tool error for user {user_profile.phone}: {e}")
            return "I'm having trouble accessing disease information. Please try again later. 🌿"

    @tool
    def get_general_agriculture_information(query: str) -> str:
        """
        Useful for general agriculture questions like crop prices, crop selection, and yield improvement.
        """
        try:
            # FIX: Removed the 'chat_history' argument. The engine uses session_id for memory.
            result = price_engine.ask_question(
                query, 
                session_id=str(user_profile.phone)
            )
            return f"🌾 Agricultural Information:\n\n{result}"
        except Exception as e:
            logger.error(f"Agriculture tool error for user {user_profile.phone}: {e}")
            return "I'm having trouble accessing that information. Please try again later. 🌾"

    # --- 2. Set up the Agent (No changes needed here) ---
    tools = [get_weather_forecast, get_crop_disease_information, get_general_agriculture_information]
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a helpful and friendly farming assistant. Use the user's profile and chat history to provide accurate, concise, and relevant answers. If you don't know the answer, say so clearly."),
        MessagesPlaceholder(variable_name="chat_history"),
        ("user", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])
    llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash-exp", temperature=0.1, convert_system_message_to_human=True)
    agent = create_openai_tools_agent(llm, tools, prompt)
    agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True, handle_parsing_errors=True)
    
    try:
        response = agent_executor.invoke({
            "input": user_input, 
            "chat_history": history
        })
        return response.get("output", "I'm sorry, I couldn't process that. Could you please rephrase?")
    except Exception as e:
        logger.error(f"LangChain Agent Error for user {user_profile.phone}: {e}", exc_info=True)
        return "I'm having a little trouble understanding. Could you please rephrase your question? 🌱"



def get_conversation_memory(request, session_key: str) -> ConversationBufferMemory:
    """
    Retrieves and deserializes chat history from the Django session 
    to a LangChain ConversationBufferMemory object.
    """
    # Get the serialized list of messages from the session, defaulting to an empty list
    history_dicts = request.session.get(f"{session_key}_lc_history", [])
    
    # Deserialize the list of dictionaries back into a list of LangChain Message objects
    messages = messages_from_dict(history_dicts)
    
    # Create a memory object and load the past messages into it
    memory = ConversationBufferMemory(return_messages=True)
    memory.chat_memory.messages = messages
    
    return memory

def save_conversation_memory(request, session_key: str, memory: ConversationBufferMemory):
    """
    Serializes the chat history from a ConversationBufferMemory object 
    and saves it to the Django session.
    """
    # Get the list of LangChain Message objects from memory
    messages = memory.chat_memory.messages
    
    # Serialize the list of objects into a list of dictionaries
    history_dicts = messages_to_dict(messages)
    
    # Save the serialized history into the session
    request.session[f"{session_key}_lc_history"] = history_dicts

def get_language_prompt():
    """Generate language selection prompt"""
    prompt = "Please choose your preferred language / कृपया अपनी पसंदीदा भाषा चुनें:\n\n"
    for key, lang_data in SUPPORTED_LANGUAGES.items():
        prompt += f"{key}. {lang_data['name']}\n"
    prompt += "\nReply with the number of your choice."
    return prompt.strip()

def get_voice_language_prompt():
    """Generate voice language selection prompt"""
    prompt = "Welcome to farming assistant. Please choose your language. "
    for key, lang_data in SUPPORTED_LANGUAGES.items():
        prompt += f"For {lang_data['name']}, say {key}. "
    return prompt.strip()

LANGUAGE_PROMPT_TEXT = get_language_prompt()
VOICE_LANGUAGE_PROMPT_TEXT = get_voice_language_prompt()
def translate_text(text, target_language, source_language='auto', max_retries=3):
    """
    Robust translation with a flexible source language and retry mechanism.
    """
    # 1. No translation needed if text is empty or languages are the same.
    if not text or not text.strip() or source_language == target_language:
        return text

    # 2. Don't translate simple numbers (like menu choices) into English.
    if text.strip().isdigit() and target_language == 'en':
        return text

    for attempt in range(max_retries):
        try:
            # 3. Use the flexible source_language parameter.
            translator = GoogleTranslator(source=source_language, target=target_language)
            translated = translator.translate(text)
            if translated and translated.strip():
                return translated
        except Exception as e:
            print(f"Translation attempt {attempt + 1} from '{source_language}' to '{target_language}' failed: {e}")
            if attempt < max_retries - 1:
                time.sleep(0.5)

    print(f"Translation failed after {max_retries} attempts, returning original text.")
    return text



# --- Enhanced Session Management ---
def get_session_data(request, session_key, defaults=None):
    """Get session data with proper defaults"""
    if defaults is None:
        defaults = {
            "state": None, 
            # "messages": [], # REMOVED - We now use LangChain memory
            "lang": "en", 
            "pincode": "", 
            "address": {},
            "latitude": None,
            "longitude": None,
            "user_name": "",
            "retry_count": 0
        }
    return request.session.get(session_key, defaults)
                               
def save_session_data(request, session_key, session_data):
    """Save session data and ensure persistence"""
    request.session[session_key] = session_data
    request.session.save()


class WhatsappChatManager(APIView):
    """Enhanced WhatsApp Chat Manager with integrated translation workflow"""
    
    def post(self, request):
        incoming_msg = request.data.get('Body', '').strip()
        sender_number = request.data.get('From', '').strip()

        user, created = WhatsApp.objects.get_or_create(
            phone=sender_number,
            defaults={
                "name": "", 
                "conversation_history": [],
                "last_active": timezone.now()
            }
        )
        
        print(f"📱 WhatsApp - Incoming: '{incoming_msg}' From: {sender_number}")

        session_key = f"whatsapp_session_{sender_number}"
        session_data = get_session_data(request, session_key)
        
        # <<< FIX: Logic streamlined and redundancy removed >>>
        # 1. Load the conversation memory first
        memory = get_conversation_memory(request, session_key)

        # 2. Add the user's ORIGINAL message to memory
        if incoming_msg:
            memory.chat_memory.add_user_message(incoming_msg)

        # 3. Translate the message for internal processing just once
        user_lang = session_data.get("lang", "en")
        processed_msg = translate_text(incoming_msg, target_language='en', source_language=user_lang)
        print(f"🌍 Translated '{incoming_msg}' ({user_lang}) to '{processed_msg}' (en) for processing.")

        response = MessagingResponse()
        msg = response.message()
        final_reply_translated = "" # Initialize reply variable

        try:
            # Process the ENGLISH version of the message, passing the memory object
            reply_text_in_english = self._process_message(processed_msg, session_data, user, memory)
            
            if reply_text_in_english:
                # Translate the final reply from English BACK to the user's language
                final_reply_translated = translate_text(reply_text_in_english, target_language=user_lang, source_language='en')
                
                print(f"🤖 Bot Reply (in {user_lang}): {final_reply_translated}")
                msg.body(final_reply_translated)
                
        except Exception as e:
            import traceback
            traceback.print_exc()
            error_msg_english = "I'm sorry, an unexpected error occurred. Please try again."
            final_reply_translated = translate_text(error_msg_english, user_lang)
            msg.body(final_reply_translated)
            print(f"❌ WhatsApp Error: {e}")

        # Add the bot's final, translated reply to memory
        if final_reply_translated:
            memory.chat_memory.add_ai_message(final_reply_translated)

        # Save both session data and the LangChain memory
        save_session_data(request, session_key, session_data)
        save_conversation_memory(request, session_key, memory) # Save updated context
        # request.session.save() is called inside save_session_data, so this extra call is optional but safe

        user.last_active = timezone.now()
        user.save()

        return HttpResponse(str(response), content_type='application/xml')

    # <<< FIX 1: Added `memory` to the method signature >>>
    def _process_message(self, incoming_msg, session_data, user, memory):
        """Process incoming message based on current state"""
        
        # <<< FIX 2: Correctly save conversation from memory on exit >>>
        if incoming_msg.lower() in ["exit", "quit", "bye", "goodbye", "stop"]:
            history_dicts = messages_to_dict(memory.chat_memory.messages)
            user.conversation_history.extend(history_dicts)
            user.save()
            return "Thank you for using our farming assistant! Your conversation has been saved. Feel free to message us anytime. 🌱"

        if incoming_msg.lower() in ["help", "menu", "options"]:
            return self._get_help_message()

        current_state = session_data.get("state")
        
        if current_state is None:
            return self._handle_initial_state(incoming_msg, session_data)
        elif current_state == AWAITING_GREETING_NUMBER:
            return self._handle_greeting_response(session_data)
        elif current_state == AWAITING_LANGUAGE_CHOICE:
            return self._handle_language_choice(incoming_msg, session_data)
        elif current_state == AWAITING_PIN_CODE:
            return self._handle_pincode_input(incoming_msg, session_data)
        elif current_state == AWAITING_ADDRESS:
            return self._handle_address_input(incoming_msg, session_data)
        elif current_state == AWAITING_PROBLEM_TYPE:
            return self._handle_problem_query(incoming_msg, session_data, user, memory)
        else:
            session_data["state"] = None
            return "I'm not sure how to help with that. Type 'help' for options or describe your farming question."
       
    def _handle_initial_state(self, incoming_msg, session_data):
        """Handle the initial user interaction"""
        if check_greeting(incoming_msg):
            session_data["state"] = AWAITING_GREETING_NUMBER
            return INTRO_TEXT
        else:
            # Direct question - try to process it
            session_data["state"] = AWAITING_LANGUAGE_CHOICE
            return f"Hello! Welcome to your farming assistant. 🌾\n\n{LANGUAGE_PROMPT_TEXT}"

    def _handle_greeting_response(self, session_data):
        """Handle response after greeting"""
        session_data["state"] = AWAITING_LANGUAGE_CHOICE
        return LANGUAGE_PROMPT_TEXT

    def _handle_language_choice(self, incoming_msg, session_data):
        """Handle language selection"""
        choice = incoming_msg.strip()
        
        if choice in SUPPORTED_LANGUAGES:
            session_data["lang"] = SUPPORTED_LANGUAGES[choice]["code"]
            session_data["state"] = AWAITING_PIN_CODE
            session_data["retry_count"] = 0
            return f"Great! Language set to {SUPPORTED_LANGUAGES[choice]['name']}. 🌍\n\nNow, please provide your 6-digit PIN code so I can give you location-specific information."
        else:
            session_data["retry_count"] = session_data.get("retry_count", 0) + 1
            
            if session_data["retry_count"] >= 3:
                # Default to English after 3 failed attempts
                session_data["lang"] = "en"
                session_data["state"] = AWAITING_PIN_CODE
                session_data["retry_count"] = 0
                return "I'll continue in English. Please provide your 6-digit PIN code."
            
            return f"Please select a valid option (1-{len(SUPPORTED_LANGUAGES)}):\n\n{LANGUAGE_PROMPT_TEXT}"

    def _handle_pincode_input(self, incoming_msg, session_data):
        """Handle PIN code input with validation"""
        result = fast_check_pincode(incoming_msg)
        
        if result["is_pincode"]:
            session_data["pincode"] = result["pincode"]
            session_data["state"] = AWAITING_ADDRESS
            session_data["retry_count"] = 0
            return "Perfect! PIN code saved. 📍\n\nNow, please provide your detailed address (Village, City, District, State) so I can give you accurate local information."
        else:
            session_data["retry_count"] = session_data.get("retry_count", 0) + 1
            
            if session_data["retry_count"] >= 3:
                session_data["state"] = AWAITING_PROBLEM_TYPE
                session_data["retry_count"] = 0
                return "I'll continue without your PIN code for now. What farming question can I help you with? 🌱"
            
            return f"Please provide a valid 6-digit PIN code (e.g., 123456). Attempt {session_data['retry_count']}/3"

    def _handle_address_input(self, incoming_msg, session_data):
        """Handle address input with geocoding"""
        try:
            result = extract_address_details(incoming_msg).model_dump()
            
            if result.get("is_address"):
                # Try to geocode the address
                location = geolocator.geocode(incoming_msg, timeout=10)
                
                if location:
                    session_data["latitude"] = location.latitude
                    session_data["longitude"] = location.longitude
                    session_data["address"] = {
                        "state": result.get("state", ""),
                        "district": result.get("district", ""),
                        "city": result.get("city", ""),
                        "village": result.get("village", "")
                    }
                    session_data["state"] = AWAITING_PROBLEM_TYPE
                    session_data["retry_count"] = 0
                    
                    address_summary = f"State: {result.get('state', 'N/A')}, District: {result.get('district', 'N/A')}, City: {result.get('city', 'N/A')}"
                    return f"Excellent! Your location has been saved: {address_summary} 📍✅\n\nNow, what farming question can I help you with? You can ask about:\n• Crop diseases 🦠\n• Weather forecasts ☀️🌧️\n• Crop prices 💰\n• Farming advice 🌾"
                else:
                    session_data["retry_count"] = session_data.get("retry_count", 0) + 1
                    
                    if session_data["retry_count"] >= 2:
                        session_data["state"] = AWAITING_PROBLEM_TYPE
                        session_data["retry_count"] = 0
                        return "I couldn't locate your exact address, but that's okay. What farming question can I help you with? 🌱"
                    
                    return "I couldn't find that location. Please provide a more detailed address with village/city, district, and state."
            else:
                session_data["retry_count"] = session_data.get("retry_count", 0) + 1
                
                if session_data["retry_count"] >= 2:
                    session_data["state"] = AWAITING_PROBLEM_TYPE
                    session_data["retry_count"] = 0
                    return "Let's continue. What farming question can I help you with? 🌱"
                
                return "Please provide a complete address with your village/city, district, and state."
                
        except Exception as e:
            print(f"Address processing error: {e}")
            session_data["state"] = AWAITING_PROBLEM_TYPE
            return "Let's continue. What farming question can I help you with? 🌱"

    # In class WhatsappChatManager:

    def _handle_problem_query(self, incoming_msg, session_data, user, memory):
        """
        Handle farming queries by calling the centralized, context-aware LangChain agent.
        """
        try:
            # 1. Get the chat history from LangChain memory
            chat_history = memory.chat_memory.messages
            print(f"📜 Passing context to WhatsApp agent: {chat_history}")

            # 2. Add user's location from session to the user object so the tool can find it
            user.latitude = session_data.get("latitude")
            user.longitude = session_data.get("longitude")

            # 3. Call the unified agent to get a contextual reply
            ai_reply = _get_contextual_ai_reply(
                user_input=incoming_msg,
                history=chat_history,
                user_profile=user 
            )
            return ai_reply
            
        except Exception as e:
            print(f"WhatsApp Agent query error: {e}")
            logger.error(f"WhatsApp Agent query error for user {user.phone}: {e}", exc_info=True)
            return "I'm having a little trouble understanding. Could you please rephrase your question? 🌱"
        
    def _handle_weather_query(self, query, session_data):
        """Handle weather-related queries"""
        if session_data.get("latitude") and session_data.get("longitude"):
            try:
                weather_info = get_weather_forecast_for_user(query, session_data["latitude"], session_data["longitude"])
                return f"🌤️ Weather Information:\n\n{weather_info}\n\n🌱 Anything else I can help you with?"
            except Exception as e:
                print(f"Weather query error: {e}")
                return "I'm having trouble getting weather information right now. Please try again later. ☁️"
        else:
            return "For accurate weather information, I need your location. Could you please share your city or village name? 📍"

    def _handle_disease_query(self, query, phone_number,chat_history):
        """Handle crop disease queries"""
        try:
            # Your engine's `ask_question` method now needs to accept `chat_history`
            result = pesticide_engine.ask_question(
                query, 
                session_id=str(phone_number),
                chat_history=chat_history # Pass the context
            )
            return f"🌿 Crop Disease Information:\n\n{result}\n\n🌱 Do you have any other farming questions?"
        except Exception as e:
            print(f"Disease query error: {e}")
            return "I'm having trouble accessing disease information right now. Please try again later or contact your local agricultural extension office. 🌿"

    def _handle_agriculture_query(self, query, phone_number,chat_history):
        """Handle general agriculture queries"""
        try:
            # Your engine's `ask_question` method now needs to accept `chat_history`
            result = price_engine.ask_question(
                query, 
                session_id=str(phone_number),
                chat_history=chat_history # Pass the context
            )
            return f"🌾 Agricultural Information:\n\n{result}\n\n💰 Any other questions about farming?"
        except Exception as e:
            print(f"Agriculture query error: {e}")
            return "I'm having trouble accessing that information right now. Please try again later or contact your local agricultural office. 🌾"

    def _get_help_message(self):
        """Generate help message"""
        return """🌾 Farming Assistant Help Menu:
        
        You can ask me about:
        - Weather forecasts 🌦️
        - Crop prices 💰
        - Crop diseases 🐛
        - General farming advice 🚜
        
        Type 'exit' to end our conversation."""



"""
I can help you with:
• 🦠 Crop diseases and pest control
• ☀️ Weather forecasts
• 💰 Crop prices and market information  
• 🌱 Crop selection and farming advice
• 🏦 Information about agricultural loans

Commands:
• Type 'help' - Show this menu
• Type 'exit' - End conversation
• Just ask your question naturally!

Example: "What's the weather like?" or "My tomato plants have yellow leaves"

How can I help you today? 🤝"""


# All your existing imports remain here...
# ...

# --- New LangChain Helper Functions ---
# This section remains unchanged. The _get_contextual_ai_reply function is the key.
# ...

@method_decorator(csrf_exempt, name='dispatch')
class CallBotManager(APIView):
    """
    Enhanced Voice Call Manager with integrated LangChain Memory for better context handling.
    """

    def get(self, request):
        return self.handle_request(request)

    def post(self, request):
        return self.handle_request(request)

    def handle_request(self, request):
        # --- Existing parameter extraction remains the same ---
        if request.method == 'GET':
            params = request.GET
        else:
            params = request.POST

        user_speech = params.get('SpeechResult', '').strip()
        sender_number = params.get('From', '').strip()
        digits = params.get('Digits', '').strip()
        call_sid = params.get('CallSid', '').strip()

        print(f"🎙️ Voice Call - Speech: '{user_speech}' | Digits: '{digits}' | From: {sender_number}")

        # --- Get or create user ---
        user, created = User.objects.get_or_create(
            phone=sender_number,
            defaults={"name": "Voice Caller", "conversation_history": []}
        )

        # --- Session and Memory Management (REFACTORED) ---
        session_key = f"voice_session_{sender_number}"
        session_data = get_session_data(request, session_key)
        
        # <<< FIX 1: Use LangChain Memory, just like the WhatsApp bot >>>
        memory = get_conversation_memory(request, session_key)

        response = VoiceResponse()

        try:
            # Determine current input
            current_input = digits if digits else user_speech
            
            # Add user's ORIGINAL message to memory
            if current_input:
                memory.chat_memory.add_user_message(current_input)
            
            # Translate input for internal processing
            user_lang = session_data.get("lang", "en")
            processed_input = translate_text(current_input, target_language='en', source_language=user_lang)
            print(f"🌍 Translated Voice Input '{current_input}' ({user_lang}) to '{processed_input}' (en) for processing.")

            # <<< FIX 2: Refactored logic to be cleaner >>>
            reply_text_in_english, next_action = self._process_voice_interaction(
                processed_input, digits, user_speech, session_data, user, memory
            )

            final_reply_translated = ""
            if reply_text_in_english:
                final_reply_translated = translate_text(reply_text_in_english, target_language=user_lang, source_language='en')
                
                # Add the bot's final, translated reply to memory
                memory.chat_memory.add_ai_message(final_reply_translated)

                voice_lang = VOICE_LANGUAGES.get(user_lang, "en-US")
                print(f"🤖 Bot Reply (in {user_lang}): {final_reply_translated[:100]}...")
                self._create_voice_response(response, final_reply_translated, voice_lang, next_action, request)

        except Exception as e:
            # ... (error handling remains the same) ...
            pass

        # <<< FIX 3: Save both session data and the LangChain memory >>>
        save_session_data(request, session_key, session_data)
        save_conversation_memory(request, session_key, memory)

        user.last_active = timezone.now()
        user.save()

        return HttpResponse(str(response), content_type='application/xml')

    # <<< FIX 4: Method signature updated to accept `memory` >>>
    def _process_voice_interaction(self, processed_input, digits, user_speech, session_data, user, memory):
        current_state = session_data.get("state")
        
        if current_state is None:
            session_data["state"] = "language_selection"
            return VOICE_LANGUAGE_PROMPT_TEXT, "language_choice"
            
        elif current_state == "language_selection":
            # We use the original non-translated input for language choice
            original_input = digits if digits else user_speech
            return self._handle_voice_language_choice(original_input, session_data)
            
        elif current_state == "waiting_for_question":
            # This state now handles all general conversation
            return self._handle_voice_question(processed_input, session_data, user, memory)
            
        elif current_state == "waiting_for_location":
            return self._handle_voice_location(processed_input, session_data, user, memory)
            
        else:
            session_data["state"] = "waiting_for_question"
            welcome_msg = "I'm your farming assistant. What can I help you with today?"
            return welcome_msg, "question"

    def _handle_voice_language_choice(self, user_input, session_data):
        choice = user_input.strip()
        if choice in SUPPORTED_LANGUAGES:
            session_data["lang"] = SUPPORTED_LANGUAGES[choice]["code"]
            session_data["state"] = "waiting_for_question"
            session_data["retry_count"] = 0
            
            lang_name = SUPPORTED_LANGUAGES[choice]["name"]
            response_msg = f"Great! I will continue in {lang_name}. What farming question can I help you with today?"
            return response_msg, "question"
        else:
            # ... (retry logic remains the same) ...
            return VOICE_LANGUAGE_PROMPT_TEXT, "language_choice"

    # <<< FIX 5: This is the MAJOR CHANGE. This method now uses the unified AI agent. >>>
    def _handle_voice_question(self, processed_input, session_data, user, memory):
        """
        Handles all farming queries by calling the centralized, context-aware LangChain agent.
        """
        if not processed_input:
            return "I'm listening. Please tell me your farming question.", "question"
        
        try:
            # Get the chat history from LangChain memory
            chat_history = memory.chat_memory.messages
            print(f"📜 Passing context to Voice agent: {chat_history}")

            # Add user's location from session to the user object so the tool can find it
            user.latitude = session_data.get("latitude")
            user.longitude = session_data.get("longitude")

            # Call the unified agent to get a contextual reply
            ai_reply = _get_contextual_ai_reply(
                user_input=processed_input,
                history=chat_history,
                user_profile=user 
            )
            # After getting a reply, we want to listen for the next question
            return ai_reply, "question"
            
        except Exception as e:
            print(f"Voice Agent query error: {e}")
            logger.error(f"Voice Agent query error for user {user.phone}: {e}", exc_info=True)
            return "I'm having a little trouble understanding. Could you please rephrase your question?", "question"

    # <<< FIX 6: Minor update to handle pending queries with the new agent logic >>>
    def _handle_voice_location(self, user_input, session_data, user, memory):
        if not user_input:
            return "Please tell me your city or village name for weather information.", "location"
        
        try:
            location = geolocator.geocode(user_input, timeout=10)
            if location:
                session_data["latitude"] = location.latitude
                session_data["longitude"] = location.longitude
                
                # We have the location, now let the main agent handle the pending query
                session_data["state"] = "waiting_for_question"
                
                # The user's original question is already in memory, so we prompt them to continue
                return f"Location found. Now, please ask your weather question again.", "question"
            else:
                # ... (retry logic remains the same) ...
                return "I couldn't find that location. Please tell me your city or village name more clearly.", "location"
                
        except Exception as e:
            print(f"Location processing error: {e}")
            session_data["state"] = "waiting_for_question"
            return "I had trouble with that location. What other farming question can I help you with?", "question"
            
    # --- The `_create_voice_response` method remains unchanged ---
    def _create_voice_response(self, response, message, voice_lang, next_action, request):
        # ... (no changes needed here) ...    def _create_voice_response(self, response, message, voice_lang, next_action, request):
        """Create appropriate voice response based on next action"""
        print(f"🎵 Creating voice response - Action: {next_action}, Lang: {voice_lang}")
        
        if next_action == "language_choice":
            gather = Gather(
                input='dtmf',
                num_digits=1,
                timeout=10,
                action=request.build_absolute_uri(),
                method='POST'
            )
            gather.say(message, language="en-US", voice="alice")
            response.append(gather)
            
            # Fallback if no input - don't redirect to avoid loops
            response.say("I didn't receive your selection. Please call back and try again.", 
                        language="en-US", voice="alice")
            response.hangup()
            
        elif next_action in ["question", "location"]:
            gather = Gather(
                input='speech',
                speech_timeout=3,  # Reduced from 15 to 3 seconds
                timeout=10,        # Reduced from 25 to 10 seconds
                action=request.build_absolute_uri(),
                method='POST',
                language=voice_lang,
                finish_on_key='#'  # Allow users to press # to finish speaking
            )
            gather.say(message, language=voice_lang, voice="alice")
            response.append(gather)
            
            # Fallback if no speech detected - provide helpful message and hang up
            if next_action == "question":
                response.say("I didn't hear anything. Please call back and speak clearly after the beep to ask your farming question.", 
                           language=voice_lang, voice="alice")
            else:
                response.say("I didn't hear the location. Please call back and speak your city or village name clearly.", 
                           language=voice_lang, voice="alice")
            response.hangup()
            
        else:
            # Default response
            response.say(message, language=voice_lang, voice="alice")
            response.hangup()

# --- Utility Functions for Enhanced Features ---
def cleanup_old_sessions():
    """Clean up old session data - can be called periodically"""
    try:
        # This would typically be called by a management command or celery task
        from django.core.management.base import BaseCommand
        
        # Clear sessions older than 24 hours
        cutoff_time = timezone.now() - timezone.timedelta(hours=24)
        
        # You might want to implement this based on your session storage
        print(f"Session cleanup would remove data older than {cutoff_time}")
        
    except Exception as e:
        print(f"Session cleanup error: {e}")

def get_user_analytics(phone_number):
    """Get user interaction analytics"""
    try:
        user = User.objects.get(phone=phone_number)
        return {
            "total_messages": len(user.conversation_history),
            "last_active": user.last_active,
            "created": user.created_at if hasattr(user, 'created_at') else None
        }
    except User.DoesNotExist:
        return None



class AppSmsHandler(APIView):
    def get(self,request):
        return Response({
            "hello":"good"
        })
    def post(self, request):
        sender_no = request.data.get("sender")
        otp = cache.get(f'otp_{sender_no}')
        if not otp:      # if OTP is not found in cache
            otp = ""
            for i in range(6):
                otp += str(random.randint(0,9))
            cache.set(f'otp_{sender_no}', otp, 300)
        print(sender_no)
        print(otp)
        res = send_sms(sender_no, otp)


        return Response(res)

# class PhoneChecker(APIView):
#     def post(self, request):
#         phone = request.data.get("sender")
#         print(phone)
#         user = User.objects.filter(phone=phone)
#         if not user:
#             return Response({"error": "User not found", "success": False})
#         return Response({
#             "success": True,
#             "data": user[0]
#         })



class PhoneChecker(APIView):
    def post(self, request):
        phone = request.data.get("sender")
        print(phone)

        # Use .first() for cleaner single-object retrieval
        user = User.objects.filter(phone=phone).first()

        if not user:
            return Response({"error": "User not found", "success": False})

        # Serialize the user instance
        serializer = UserSerializer(user)

        return Response({
            "success": True,
            "data": serializer.data
        })




class SaveDataToDatabase(APIView):
    def post(self, request):
        print(request.data)
        try:
            user = User.objects.create(
                name=request.data.get("name"),
                phone=request.data.get("phone"),
                userType=request.data.get("userType", "farmer"),
                address=request.data.get("address", ""),
                city=request.data.get("city", ""),
                state=request.data.get("state", ""),
                pincode=request.data.get("pincode", ""),
                district=request.data.get("district", ""),
                country=request.data.get("country", ""),
                isProfileComplete=True,
                app_history=request.data.get("app_history", []),
                last_active=request.data.get("last_active", timezone.now()),
            )

            return Response(
                {"message": "User created successfully", "user_id": user.id,"success":True},
                status=status.HTTP_201_CREATED
            )

        except Exception as e:
            print(e)
            return Response(
                {"error": str(e),
                 "success":False
                 },
                status=status.HTTP_400_BAD_REQUEST
            )

class GetUserByPhoneNumber(APIView):
    def post(self, request):
        phone = request.data.get("phone")
        user = User.objects.get(phone=phone)

        if(user):
            return Response({
                "success": True,
                "data": user
            })
        return Response({
                "success": False,
                "data": None
            })
    






class SaveAppHistory(APIView):
    def get(self, request):
        try:
            phone = request.query_params.get("phone")  # GET param instead of request.data
            if not phone:
                return Response({"success": False, "error": "Phone number is required"}, status=400)

            user = User.objects.filter(phone=phone).first()
            if not user:
                return Response({"success": False, "error": "User not found"}, status=404)

            serializer = UserSerializer(user)
            return Response({
                "success": True,
                "data": serializer.data.get("app_history")[::-1]  # Access dict value
            })

        except Exception as e:
            return Response({
                "success": False,
                "error": str(e)
            }, status=500)
        

            
    def post(self, request):
        try:
            phone = request.data.get("phone")
            title = request.data.get("title", "")
            content = request.data.get("content", [])

            if not phone:
                return Response(
                    {"error": "Phone number is required", "success": False},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Find user
            try:
                user = User.objects.get(phone=phone)
            except User.DoesNotExist:
                return Response(
                    {"error": f"User with phone {phone} not found", "success": False},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Check if AppHistory with same title exists
            history = AppHistory.objects.filter(user=user, title=title).first()

            if history:
                # Append new content to existing record
                if not isinstance(history.content, list):
                    history.content = []
                history.content.extend(content)
                history.save()

                message = "App history updated successfully"
            else:
                # Create new history record
                history = AppHistory.objects.create(
                    user=user,
                    title=title,
                    content=content
                )

                # Update user's app_history field with new title
                current_titles = set(user.app_history or [])
                current_titles.add(title)
                user.app_history = list(current_titles)
                user.save(update_fields=["app_history"])

                message = "App history created successfully"

            return Response(
                {
                    "success": True,
                    "message": message,
                    "data": {
                        "id": history.id,
                        "user": user.name,
                        "title": history.title,
                        "content": history.content
                    }
                },
                status=status.HTTP_201_CREATED
            )

        except Exception as e:
            return Response(
                {"error": str(e), "success": False},
                status=status.HTTP_400_BAD_REQUEST
            )



class FarmerCropAPIView(APIView):

    def get(self, request):
        """Get all farmer crops or filter by phone."""
        phone = request.query_params.get('phone', None)

        if phone:
            try:
                user = User.objects.get(phone=phone)
            except User.DoesNotExist:
                return Response({"error": "Farmer with this phone does not exist"}, status=status.HTTP_404_NOT_FOUND)

            crops = FarmerCrops.objects.filter(farmer=user)
        else:
            crops = FarmerCrops.objects.select_related('farmer').all()

        serializer = FarmerCropsSerializer(crops, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        """
        Add crop for an existing farmer.
        Expected JSON:
        {
            "phone": "1234567890",
            "crop_name": "Wheat",
            "crop_price": 200.5,
            "quantity": 50,
            "unit": "kg",
            "description": "Fresh wheat"
        }
        """
        phone = request.data.get('phone')

        if not phone:
            return Response({"error": "Phone is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(phone=phone)
        except User.DoesNotExist:
            return Response({"error": "Farmer with this phone does not exist"}, status=status.HTTP_404_NOT_FOUND)

        crop = FarmerCrops.objects.create(
            farmer=user,
            phone=user.phone,
            name=user.name,
            crop_name=request.data.get('crop_name'),
            crop_price=request.data.get('crop_price', 0.0),
            quantity=request.data.get('quantity', 0.0),
            unit=request.data.get('unit', 'kg'),
            description=request.data.get('description', ''),
            is_available=True
        )

        serializer = FarmerCropsSerializer(crop)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ChatHistoryView(APIView):
    """
    Chat history API:
    - POST: Get all chats between a farmer and a vendor (both directions)
    - GET:  Get all chats by farmer_phoneNumber or vender_phoneNumber
    """

    def post(self, request):
        farmer_phone = request.data.get("farmer_phoneNumber")
        vendor_phone = request.data.get("vender_phoneNumber") or request.data.get("vendor_phoneNumber")

        if not farmer_phone and not vendor_phone:
            return Response(
                {"error": "At least farmer_phoneNumber or vender_phoneNumber is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Both farmer & vendor given → get chats between them
        if farmer_phone and vendor_phone:
            chats = Chats.objects.filter(
                farmer_phoneNumber=farmer_phone,
                vender_phoneNumber=vendor_phone
            ) | Chats.objects.filter(
                farmer_phoneNumber=vendor_phone,
                vender_phoneNumber=farmer_phone
            )

        # Only farmer given → all chats for this farmer
        elif farmer_phone:
            chats = Chats.objects.filter(farmer_phoneNumber=farmer_phone) | Chats.objects.filter(vender_phoneNumber=farmer_phone)

        # Only vendor given → all chats for this vendor
        else:
            chats = Chats.objects.filter(vender_phoneNumber=vendor_phone) | Chats.objects.filter(farmer_phoneNumber=vendor_phone)

        chats = chats.order_by("id")

        data = [
            {
                "farmer_phoneNumber": chat.farmer_phoneNumber,
                "vender_phoneNumber": chat.vender_phoneNumber,
                "farmer_name": chat.farmer_name,
                "vender_name": chat.vender_name,
                "from_message": chat.from_message,
                "to_message": chat.to_message,
                "message":chat.message
            }
            for chat in chats
        ]

        return Response({"chats": data}, status=status.HTTP_200_OK)

    def get(self, request):
        farmer_phone = request.query_params.get("farmer_phoneNumber")
        vendor_phone = request.query_params.get("vendor_phoneNumber")
        if(vendor_phone==None):
            vendor_phone = request.query_params.get("vender_phoneNumber")

        farmer_name = request.query_params.get("farmer_name", "")
        vendor_name = request.query_params.get("vendor_name", "")
        print(farmer_name,farmer_phone,vendor_name,vendor_phone)

        if not farmer_phone and not vendor_phone:
            return Response(
                {"error": "Provide either farmer_phoneNumber or vender_phoneNumber."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Case 1: Both farmer and vendor numbers provided → search both directions
        if farmer_phone and vendor_phone:
            chats = Chats.objects.filter(
                farmer_phoneNumber=farmer_phone,
                vender_phoneNumber=vendor_phone
            ) | Chats.objects.filter(
                farmer_phoneNumber=vendor_phone,
                vender_phoneNumber=farmer_phone
            )

            print("chats ",chats)

            if not chats.exists():
                # Create empty chatrequest.query_params.get("vendor_phoneNumber") entry
                chat = Chats.objects.create(
                    farmer_phoneNumber=farmer_phone,
                    vender_phoneNumber=vendor_phone,
                    farmer_name=farmer_name,
                    vender_name=vendor_name,
                    from_message="farmer",
                    to_message="vendor",
                    message=""
                )
                chats = Chats.objects.filter(id=chat.id) 

        # Case 2: Only farmer number
        elif farmer_phone:
            chats = (
        Chats.objects.filter(farmer_phoneNumber=farmer_phone)
        .values("vender_phoneNumber")  # group by vendor
        .annotate(id=Min("id"))        # pick one chat per vendor
        )
            chats = Chats.objects.filter(id__in=[c["id"] for c in chats])
            print(chats)
        # Case 3: Only vendor number
        else:
            chats = (
        Chats.objects.filter(vender_phoneNumber=vendor_phone)
        .values("farmer_phoneNumber")
        .annotate(id=Min("id"))
    )
            chats = Chats.objects.filter(id__in=[c["id"] for c in chats])

        chats = chats.order_by("id")

        data = [
            {
                "farmer_phoneNumber": chat.farmer_phoneNumber,
                "vender_phoneNumber": chat.vender_phoneNumber,
                "farmer_name": chat.farmer_name,
                "vender_name": chat.vender_name,
                "from_message": chat.from_message,
                "to_message": chat.to_message,
            }
            for chat in chats
        ]

        return Response({"chats": data}, status=status.HTTP_200_OK)


import logging
logger = logging.getLogger(__name__)


def _convert_db_history_to_langchain_messages(db_history: list) -> list:
    """Converts the chat history from the database into a list of LangChain message objects."""
    messages = []
    if not db_history:
        return messages
    for message in db_history:
        sender = message.get("sender", "user")
        text = message.get("text", "")
        if sender == "bot":
            messages.append(AIMessage(content=text))
        else:
            messages.append(HumanMessage(content=text))
    return messages

def strip_markdown(text: str) -> str:
    """Removes Markdown formatting (like **, *, ```) from a string."""
    # Remove bold and italics
    text = re.sub(r'(\*\*|__)(.*?)(\1)', r'\2', text)
    text = re.sub(r'(\*|_)(.*?)(\1)', r'\2', text)
    # Remove code blocks
    text = re.sub(r'```[\s\S]*?```', '', text)
    # Remove inline code
    text = re.sub(r'`(.*?)`', r'\1', text)
    return text.strip()

# --- Helper to convert your DB history to LangChain format (No Changes) ---
def _convert_db_history_to_langchain_messages(db_history: list) -> list:
    # ... (This function is unchanged)
    messages = []
    if not db_history:
        return messages
    for message in db_history:
        sender = message.get("sender", "user")
        text = message.get("text", "")
        if sender == "bot":
            messages.append(AIMessage(content=text))
        else:
            messages.append(HumanMessage(content=text))
    return messages



class AppChatManager(APIView):
    def get(self, request):
        phone = request.query_params.get("phone")
        title = request.query_params.get("title")

        if not phone or not title:
            return Response(
                {"error": "Both 'phone' and 'title' parameters are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Find the user
            user = User.objects.get(phone=phone)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Search all history records for this user with the given title
        histories = AppHistory.objects.filter(user=user, title=title)

        if not histories.exists():
            return Response(
                {"error": "No history found for this title.","success":False},
                status=status.HTTP_404_NOT_FOUND
            )

        # Prepare serialized data (manual serialization since no serializer provided)
        data = [
            {
                "title": history.title,
                "content": history.content,
                "english_content": history.english_content,
                "user": history.user.name if history.user else None
            }
            for history in histories
        ]

        data = data[0]

        return Response({
            "success": True,
            "data": data
        }, status=status.HTTP_200_OK) 



    def post(self, request, *args, **kwargs):
        # ... (Initial part is mostly unchanged)
        phone_number = request.data.get('phone')
        title = request.data.get('title')
        full_conversation_from_app = request.data.get('content')
        user_lang = request.query_params.get('language', 'en')

        if not all([phone_number, title, full_conversation_from_app]):
            return Response({"error": "Missing required fields: phone, title, or content."}, status=status.HTTP_400_BAD_REQUEST)
        if not isinstance(full_conversation_from_app, list) or not full_conversation_from_app:
            return Response({"error": "Content must be a non-empty list."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user, _ = User.objects.get_or_create(phone=phone_number)
            app_history, _ = AppHistory.objects.get_or_create(user=user, title=title)

            # --- 2. Translate-Process-Translate Workflow ---
            latest_user_message = full_conversation_from_app[-1].get("text", "")
            latest_user_message_english = translate_text(latest_user_message, 'en', source_language=user_lang)

            english_db_history = app_history.english_content or []
            langchain_message_history = _convert_db_history_to_langchain_messages(english_db_history)

            # --- STEP A: Get initial answer from the main agent ---
            initial_ai_reply_english = self._get_contextual_ai_reply(
                user_input=latest_user_message_english,
                history=langchain_message_history,
                user_profile=user
            )

            # --- STEP B (NEW): Pass the answer through the confidence guardrail ---
            # This ensures we don't give a low-quality or "I don't know" response.
            final_ai_reply_english = self._get_confident_answer_string(
                incoming_msg=initial_ai_reply_english,
                original_query=latest_user_message_english
            )

            # --- STEP C: Translate the final, validated reply ---
            ai_reply_text_translated = translate_text(final_ai_reply_english, user_lang, source_language='en')

            # --- 3. Dual History Management & Saving (uses the final answer) ---
            bot_message_translated = {
                "id": str(int(timezone.now().timestamp() * 1000)),
                "text": ai_reply_text_translated,
                "sender": "bot",
                "timestamp": timezone.now().isoformat()
            }
            full_conversation_from_app.append(bot_message_translated)
            app_history.content = full_conversation_from_app

            # Save the final English answer to the English history
            bot_message_english_obj = bot_message_translated.copy()
            bot_message_english_obj['text'] = final_ai_reply_english
            
            user_message_english_obj = full_conversation_from_app[-2].copy()
            user_message_english_obj['text'] = latest_user_message_english
            
            english_db_history.append(user_message_english_obj)
            english_db_history.append(bot_message_english_obj)
            app_history.english_content = english_db_history
            app_history.save()

            # ... (Rest of the method is unchanged)
            user.last_active = timezone.now()
            if title not in set(user.app_history):
                user.app_history.append(title)
            user.save()

            response_data = {
                "reply": ai_reply_text_translated,
                "user": UserSerializer(user).data
            }
            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"AppChatManager Error for user {phone_number}: {e}", exc_info=True)
            return Response({"error": "An internal server error occurred."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # --- NEW: QA Guardrail method to prevent "I don't know" answers ---
    def _get_confident_answer_string(self, incoming_msg: str, original_query: str) -> str:
        """
        Evaluates a bot's answer. If it's a low-confidence refusal, it
        generates a new, better answer. Otherwise, it returns the original.
        """
        llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash-exp", temperature=0.2)
        system_prompt = """
        You are an expert AI quality assurance system for a farming assistant bot.

        **CONTEXT:**
        - Farmer's Original Question: "{user_query}"
        - Primary AI's Answer: "{bot_answer}"

        **YOUR TASK:**
        Analyze the primary AI's answer. If it's a "low-confidence refusal" (e.g., it says "I cannot help," "I don't have information," is evasive, or is clearly unhelpful), you MUST generate a new, helpful, and direct answer to the farmer's original question. Otherwise, you MUST output the primary AI's original answer.

        **YOUR RESPONSE RULES:**
        - Keep your answer under 1000 characters.
        - Your final output should be ONLY the text of the answer itself, with no introductions, explanations, or extra formatting.
        """
        formatted_prompt = system_prompt.format(user_query=original_query, bot_answer=incoming_msg)
        messages = [
            SystemMessage(content=formatted_prompt),
            HumanMessage(content="Provide the direct answer string based on the rules.")
        ]
        try:
            response = llm.invoke(messages)
            final_answer = strip_markdown(response.content.strip())
            return final_answer[:997] + "..." if len(final_answer) > 1000 else final_answer
        except Exception as e:
            logger.error(f"QA Guardrail LLM call failed: {e}. Falling back to the original message.")
            clean_msg = strip_markdown(incoming_msg)
            return clean_msg[:997] + "..." if len(clean_msg) > 1000 else clean_msg


    # ---------------------------------------------------------------------
    # --- NEW: LANGCHAIN AI LOGIC METHOD ---
    # ---------------------------------------------------------------------

    def _get_contextual_ai_reply(self, user_input: str, history: list, user_profile: User) -> str:
        """
        Uses a LangChain agent with tools to generate a contextual response.
        """
        # --- 1. Define Tools the AI can use ---
        # The agent will have access to the 'user_profile' object from this scope.

        @tool
        def get_weather_forecast(query: str) -> str:
            """
            Useful for getting the weather forecast for the user's location.
            Use this for any questions about weather, rain, temperature, or climate.
            The user's location is already known.
            """
            full_address = f"{user_profile.address}".strip()
            if not full_address:
                return "I can't provide a weather forecast because your address is not set in your profile. Please update it. 📍"
            try:
                # Assuming geolocator and get_weather_forecast_for_user are available
                location = geolocator.geocode(full_address, timeout=10)
                if not location:
                    return "I couldn't find your location from your profile address. Please check that it is correct. 📍"
                weather_info = get_weather_forecast_for_user(query, location.latitude, location.longitude)
                return f"🌤️ Weather Information:\n\n{weather_info}"
            except Exception as e:
                logger.error(f"Weather tool error for user {user_profile.phone}: {e}")
                return "I'm having trouble getting weather information right now. Please try again later. ☁️"

        @tool
        def get_crop_disease_information(query: str) -> str:
            """
            Useful for diagnosing crop diseases or getting information on pesticides and treatments.
            Use this for questions about sick plants, pests, insects, fungus, or crop health issues.
            """
            try:
                # Assuming pesticide_engine is available
                result = pesticide_engine.ask_question(query, session_id=str(user_profile.phone))
                return f"🌿 Crop Disease Information:\n\n{result}"
            except Exception as e:
                logger.error(f"Disease tool error for user {user_profile.phone}: {e}")
                return "I'm having trouble accessing disease information. Please try again later. 🌿"

        @tool
        def get_general_agriculture_information(query: str) -> str:
            """
            Useful for general agriculture questions like crop prices, crop selection, and yield improvement.
            Use this for questions about markets, what to plant, or how to increase farm output.
            """
            try:
                # Assuming price_engine is available
                result = price_engine.ask_question(query, session_id=str(user_profile.phone))
                return f"🌾 Agricultural Information:\n\n{result}"
            except Exception as e:
                logger.error(f"Agriculture tool error for user {user_profile.phone}: {e}")
                return "I'm having trouble accessing that information. Please try again later. 🌾"


        # --- 2. Set up the Agent ---
        tools = [get_weather_forecast, get_crop_disease_information, get_general_agriculture_information]
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a helpful and friendly farming assistant..."),
            MessagesPlaceholder(variable_name="chat_history"),
            ("user", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])
        llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash-exp", temperature=0.1, convert_system_message_to_human=True)
        agent = create_openai_tools_agent(llm, tools, prompt)
        agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
        try:
            response = agent_executor.invoke({"input": user_input, "chat_history": history})
            return response.get("output", "I'm sorry, I couldn't process that. Could you please rephrase?")
        except Exception as e:
            logger.error(f"LangChain Agent Error for user {user_profile.phone}: {e}", exc_info=True)
            return "I'm having a little trouble understanding. Could you please rephrase your question? 🌱"
