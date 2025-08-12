import random
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import User,WhatsApp
from .serializers import UserSerializer
from twilio.twiml.messaging_response import MessagingResponse
from deep_translator import GoogleTranslator
from langdetect import detect
from django.http import HttpResponse
from django.utils import timezone
import time
from geopy.geocoders import Nominatim
from django.core.cache import cache

from django.shortcuts import render
from django.conf import settings # Import Django's settings
from .whatsapp_bot_handler import check_greeting,INTRO_TEXT,check_pincode_intent,extract_address_details,analyze_farmer_query,get_weather_forecast_for_user,get_confident_answer_string
# Assuming you have a file for your RAG engines
from .pesticide_bot import RAGQueryEngineWithMemory

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

# --- Enhanced Translation Function ---
def translate_text(text, target_language, max_retries=3):
    """Robust translation with retry mechanism"""
    if target_language == 'en' or not text.strip():
        return text
    
    for attempt in range(max_retries):
        try:
            translator = GoogleTranslator(source='en', target=target_language)
            translated = translator.translate(text)
            if translated and translated.strip():
                return translated
        except Exception as e:
            print(f"Translation attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                time.sleep(0.5)  # Brief delay before retry
    
    print(f"Translation failed after {max_retries} attempts, returning original text")
    return text

# --- Enhanced Session Management ---
def get_session_data(request, session_key, defaults=None):
    """Get session data with proper defaults"""
    if defaults is None:
        defaults = {
            "state": None, 
            "messages": [], 
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
    """Enhanced WhatsApp Chat Manager with better error handling and user experience"""
    
    def post(self, request):
        incoming_msg = request.data.get('Body', '').strip()
        sender_number = request.data.get('From', '').strip()

        # Enhanced user creation with better defaults
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
        
        # Add user message to conversation history
        if incoming_msg:
            session_data["messages"].append({
                "role": "user", 
                "content": incoming_msg,
                "timestamp": timezone.now().isoformat()
            })

        response = MessagingResponse()
        msg = response.message()

        try:
            reply_text = self._process_message(incoming_msg, session_data, user)
            
            if reply_text:
                # Add bot response to history
                session_data["messages"].append({
                    "role": "bot", 
                    "content": reply_text,
                    "timestamp": timezone.now().isoformat()
                })

                # Translate if needed
                final_reply = translate_text(reply_text, session_data.get("lang", "en"))
                final_reply = get_confident_answer_string(final_reply,incoming_msg)
                print(final_reply)
                msg.body(final_reply)
                
                print(f"🤖 Bot Reply: {reply_text[:100]}..." if len(reply_text) > 100 else f"🤖 Bot Reply: {reply_text}")

        except Exception as e:
            import traceback
            traceback.print_exc()
            error_msg = ""
            msg.body(translate_text(error_msg, session_data.get("lang", "en")))
            print(f"❌ WhatsApp Error: {e}")

        # Save session and user data
        save_session_data(request, session_key, session_data)
        
        # Update user's last activity
        user.last_active = timezone.now()
        user.save()

        return HttpResponse(str(response), content_type='application/xml')

    def _process_message(self, incoming_msg, session_data, user):
        """Process incoming message based on current state"""
        
        # Handle exit command
        if incoming_msg.lower() in ["exit", "quit", "bye", "goodbye", "stop"]:
            user.conversation_history.extend(session_data["messages"])
            user.save()
            return "Thank you for using our farming assistant! Your conversation has been saved. Feel free to message us anytime. 🌱"

        # Handle help command
        if incoming_msg.lower() in ["help", "menu", "options"]:
            return self._get_help_message()

        current_state = session_data.get("state")
        
        # State machine logic
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
            return self._handle_problem_query(incoming_msg, session_data, user.phone)
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

    def _handle_problem_query(self, incoming_msg, session_data, phone_number):
        """Handle farming queries with improved routing"""
        try:
            result = analyze_farmer_query(incoming_msg).model_dump()
            
            if result.get("is_query") and result.get("query_type") in AWAITING_PROBLEMS:
                query_type = result["query_type"]
                query_summary = result["query_summary"]
                
                session_data["problem_type"] = query_type
                session_data["problem"] = query_summary
                
                # Route to appropriate handler
                if query_type == "weather":
                    return self._handle_weather_query(query_summary, session_data)
                elif query_type == "disease":
                    return self._handle_disease_query(query_summary, phone_number)
                elif query_type in ["crop_price", "crop_selection", "yield_improvement"]:
                    return self._handle_agriculture_query(query_summary, phone_number)
                elif query_type == "loan":
                    return "For agricultural loans, I recommend contacting your nearest bank or agricultural credit society. You can also check government schemes like PM-KISAN or state agricultural loan programs. 🏦"
                else:
                    return "I understand your concern. Let me connect you with relevant agricultural information. Could you be more specific about what you need help with? 🤔"
            else:
                return "I'd like to help! Could you please ask more specifically about:\n• Crop diseases or pests 🐛\n• Weather information ⛅\n• Crop prices 💰\n• Farming techniques 🚜\n\nWhat would you like to know?"
                
        except Exception as e:
            print(f"Query analysis error: {e}")
            return "I'm here to help with your farming questions. Could you please rephrase your question? 🌱"

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

    def _handle_disease_query(self, query, phone_number):
        """Handle crop disease queries"""
        try:
            result = pesticide_engine.ask_question(query, session_id=str(phone_number))
            return f"🌿 Crop Disease Information:\n\n{result}\n\n🌱 Do you have any other farming questions?"
        except Exception as e:
            print(f"Disease query error: {e}")
            return "I'm having trouble accessing disease information right now. Please try again later or contact your local agricultural extension office. 🌿"

    def _handle_agriculture_query(self, query, phone_number):
        """Handle general agriculture queries"""
        try:
            result = price_engine.ask_question(query, session_id=str(phone_number))
            return f"🌾 Agricultural Information:\n\n{result}\n\n💰 Any other questions about farming?"
        except Exception as e:
            print(f"Agriculture query error: {e}")
            return "I'm having trouble accessing that information right now. Please try again later or contact your local agricultural office. 🌾"

    def _get_help_message(self):
        """Generate help message"""
        return """🌾 Farming Assistant Help Menu:

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


@method_decorator(csrf_exempt, name='dispatch') 
class CallBotManager(APIView):
    """Enhanced Voice Call Manager with Language Selection"""
    
    def get(self, request):
        return self.handle_request(request)
    
    def post(self, request):
        return self.handle_request(request)
    
    def handle_request(self, request):
        # Extract parameters cleanly - handle both GET and POST
        if request.method == 'GET':
            params = request.GET
        else:
            params = request.POST
            
        # Get unique values (remove duplicates caused by URL parameter repetition)
        user_speech = params.get('SpeechResult', '').strip()
        sender_number = params.get('From', '').strip()
        digits = params.get('Digits', '').strip()
        call_status = params.get('CallStatus', '').strip()
        call_sid = params.get('CallSid', '').strip()
        
        print(f"🎙️ Voice Call - Method: {request.method}")
        print(f"🎙️ Speech: '{user_speech}' | Digits: '{digits}' | From: {sender_number} | Status: {call_status}")
        print(f"🆔 CallSid: {call_sid}")
        
        # Prevent processing duplicate requests for the same call state
        request_key = f"{call_sid}_{sender_number}_{digits}_{user_speech}"
        if hasattr(request, 'session') and request.session.get('last_request_key') == request_key:
            print("🚫 Duplicate request detected, skipping...")
            return HttpResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', content_type='application/xml')
        
        if hasattr(request, 'session'):
            request.session['last_request_key'] = request_key
        
        # Get or create user
        user, created = User.objects.get_or_create(
            phone=sender_number,
            defaults={"name": "Caller", "conversation_history": []}
        )
        
        # Enhanced session management
        session_key = f"voice_session_{sender_number}"
        session_data = get_session_data(request, session_key, {
            "state": None,
            "messages": [],
            "lang": "en",
            "pincode": "",
            "address": {},
            "latitude": None,
            "longitude": None,
            "retry_count": 0,
            "last_action": None
        })

        response = VoiceResponse()
        
        try:
            # Handle exit commands in speech
            if user_speech and any(word in user_speech.lower() for word in ["exit", "goodbye", "bye", "end", "hang up", "stop"]):
                user.conversation_history.extend(session_data["messages"])
                user.last_active = timezone.now()
                user.save()
                if session_key in request.session:
                    del request.session[session_key]
                
                goodbye_msg = translate_text(
                    "Thank you for calling our farming assistant. Have a great day!", 
                    session_data.get("lang", "en")
                )
                voice_lang = VOICE_LANGUAGES.get(session_data.get("lang", "en"), "en-US")
                response.say(goodbye_msg, language=voice_lang, voice="alice")
                response.hangup()
                return HttpResponse(str(response), content_type='application/xml')

            # Determine current input and priority
            current_input = None
            input_type = None
            
            # Prioritize based on current state
            current_state = session_data.get("state")
            
            if current_state == "language_selection" or current_state is None:
                # In language selection, prioritize digits
                if digits:
                    current_input = digits
                    input_type = "dtmf"
                elif user_speech:
                    current_input = user_speech
                    input_type = "speech"
            else:
                # In other states, prioritize speech
                if user_speech:
                    current_input = user_speech
                    input_type = "speech"
                elif digits:
                    current_input = digits
                    input_type = "dtmf"

            # Add user input to history
            if current_input:
                session_data["messages"].append({
                    "role": "user", 
                    "content": current_input,
                    "timestamp": timezone.now().isoformat(),
                    "input_type": input_type
                })

            print(f"🔍 Processing input: '{current_input}' (type: {input_type}) in state: {current_state}")

            reply_text, next_action = self._process_voice_interaction(current_input, input_type, session_data, user)
            reply_text = get_confident_answer_string(reply_text,current_input)
            if reply_text:
                # Add bot response to history
                session_data["messages"].append({
                    "role": "bot", 
                    "content": reply_text,
                    "timestamp": timezone.now().isoformat()
                })

                # Translate and speak response
                translated_reply = translate_text(reply_text, session_data.get("lang", "en"))
                voice_lang = VOICE_LANGUAGES.get(session_data.get("lang", "en"), "en-US")
                
                print(f"🤖 Bot Reply: {translated_reply[:100]}...")
                print(f"🔄 Next Action: {next_action}")
                
                self._create_voice_response(response, translated_reply, voice_lang, next_action, request)

        except Exception as e:
            import traceback
            traceback.print_exc()
            error_msg = "I apologize, there was a technical problem. Please call back later."
            voice_lang = VOICE_LANGUAGES.get(session_data.get("lang", "en"), "en-US")
            response.say(error_msg, language=voice_lang, voice="alice")
            response.hangup()
            print(f"❌ Voice Call Error: {e}")

        # Save session
        save_session_data(request, session_key, session_data)
        user.last_active = timezone.now()
        user.save()
        
        return HttpResponse(str(response), content_type='application/xml')

    def _process_voice_interaction(self, user_input, input_type, session_data, user):
        """Process voice interaction based on current state"""
        current_state = session_data.get("state")
        print(f"🎯 Current state: {current_state}, Input: '{user_input}', Type: {input_type}")
        
        if current_state is None:
            # Initial call - language selection
            session_data["state"] = "language_selection"
            session_data["last_action"] = "language_prompt"
            return "Welcome to farming assistant. Press 1 for English, 2 for Hindi, 3 for Marathi, 4 for Tamil, 5 for Telugu, or 6 for Kannada.", "language_choice"
            
        elif current_state == "language_selection":
            return self._handle_voice_language_choice(user_input, input_type, session_data)
            
        elif current_state == "waiting_for_question":
            return self._handle_voice_question(user_input, input_type, session_data, user.phone)
            
        elif current_state == "waiting_for_location":
            return self._handle_voice_location(user_input, input_type, session_data)
            
        else:
            # Default fallback
            session_data["state"] = "waiting_for_question"
            welcome_msg = "I'm your farming assistant. What can I help you with today?"
            return welcome_msg, "question"

    def _handle_voice_language_choice(self, user_input, input_type, session_data):
        """Handle language selection for voice calls"""
        print(f"🌐 Language choice - Input: '{user_input}', Type: {input_type}")
        
        # Map digits to language codes
        digit_to_lang = {
            "1": {"code": "en", "name": "English"},
            "2": {"code": "hi", "name": "Hindi"},
            "3": {"code": "mr", "name": "Marathi"},
            "4": {"code": "ta", "name": "Tamil"},
            "5": {"code": "te", "name": "Telugu"},
            "6": {"code": "kn", "name": "Kannada"}
        }
        
        # Handle DTMF input (preferred for language selection)
        if input_type == "dtmf" and user_input in digit_to_lang:
            session_data["lang"] = digit_to_lang[user_input]["code"]
            session_data["state"] = "waiting_for_question"
            session_data["retry_count"] = 0
            session_data["last_action"] = "language_selected"
            
            lang_name = digit_to_lang[user_input]["name"]
            response_msg = f"Great! I will continue in {lang_name}. I am your farming assistant. I can help you with crop diseases, weather information, and crop prices. What would you like to know?"
            return response_msg, "question"
        
        # Handle speech input (try to detect numbers spoken)
        elif input_type == "speech" and user_input:
            # Try to extract number from speech
            speech_lower = user_input.lower()
            number_words = {
                "one": "1", "1": "1", "एक": "1", "ek": "1",
                "two": "2", "2": "2", "दो": "2", "do": "2",
                "three": "3", "3": "3", "तीन": "3", "teen": "3",
                "four": "4", "4": "4", "चार": "4", "char": "4",
                "five": "5", "5": "5", "पांच": "5", "panch": "5",
                "six": "6", "6": "6", "छह": "6", "chah": "6"
            }
            
            detected_number = None
            for word, digit in number_words.items():
                if word in speech_lower:
                    detected_number = digit
                    break
            
            if detected_number and detected_number in digit_to_lang:
                session_data["lang"] = digit_to_lang[detected_number]["code"]
                session_data["state"] = "waiting_for_question"
                session_data["retry_count"] = 0
                session_data["last_action"] = "language_selected"
                
                lang_name = digit_to_lang[detected_number]["name"]
                response_msg = f"Great! I will continue in {lang_name}. I am your farming assistant. I can help you with crop diseases, weather information, and crop prices. What would you like to know?"
                return response_msg, "question"
        
        # Handle invalid input
        session_data["retry_count"] = session_data.get("retry_count", 0) + 1
        
        if session_data["retry_count"] >= 3:
            # Default to English after 3 attempts
            session_data["lang"] = "en"
            session_data["state"] = "waiting_for_question"
            session_data["retry_count"] = 0
            session_data["last_action"] = "language_defaulted"
            return "I will continue in English. I am your farming assistant. What can I help you with?", "question"
        
        return "Please press a number from 1 to 6 on your keypad to select your language. Press 1 for English, 2 for Hindi, 3 for Marathi, 4 for Tamil, 5 for Telugu, or 6 for Kannada.", "language_choice"

    def _handle_voice_question(self, user_input, input_type, session_data, phone_number):
        """Handle farming questions via voice"""
        if not user_input:
            return "I'm listening. Please tell me your farming question.", "question"
        
        # Only process speech input for questions
        if input_type != "speech":
            return "Please speak your farming question clearly.", "question"
        
        try:
            print(f"🌾 Processing farming query: '{user_input}'")
            result = analyze_farmer_query(user_input).model_dump()
            
            if result.get("is_query") and result.get("query_type") in AWAITING_PROBLEMS:
                query_type = result["query_type"]
                query_summary = result["query_summary"]
                
                print(f"🎯 Query type: {query_type}, Summary: {query_summary}")
                
                if query_type == "weather":
                    if not session_data.get("latitude"):
                        session_data["state"] = "waiting_for_location"
                        session_data["pending_query"] = query_summary
                        return "I can help you with weather information. Please tell me your city or village name.", "location"
                    else:
                        try:
                            weather_info = get_weather_forecast_for_user(query_summary, session_data["latitude"], session_data["longitude"])
                            return f"Here's the weather information: {weather_info}. Do you have any other questions?", "question"
                        except Exception as e:
                            print(f"Weather error: {e}")
                            return "I'm having trouble getting weather information. Please try asking again later.", "question"
                
                elif query_type == "disease":
                    try:
                        result_text = pesticide_engine.ask_question(query_summary, session_id=str(phone_number))
                        return f"Here's information about your crop disease question: {result_text}. Is there anything else I can help you with?", "question"
                    except Exception as e:
                        print(f"Disease query error: {e}")
                        return "I'm having trouble accessing disease information. Please contact your local agricultural office.", "question"
                
                elif query_type in ["crop_price", "crop_selection", "yield_improvement"]:
                    try:
                        result_text = price_engine.ask_question(query_summary, session_id=str(phone_number))
                        return f"Here's the agricultural information you requested: {result_text}. Do you have other questions?", "question"
                    except Exception as e:
                        print(f"Agriculture query error: {e}")
                        return "I'm having trouble accessing that information. Please try again later.", "question"
                
                else:
                    return "I understand your question. For detailed assistance with that topic, please contact your local agricultural extension office. Is there anything else I can help you with?", "question"
            else:
                return "I can help you with crop diseases, weather information, and crop prices. Could you please ask about one of these topics?", "question"
                
        except Exception as e:
            print(f"Voice query analysis error: {e}")
            return "I didn't understand your question clearly. Could you please ask about crop diseases, weather, or crop prices?", "question"

    def _handle_voice_location(self, user_input, input_type, session_data):
        """Handle location input for weather queries"""
        if not user_input:
            return "Please tell me your city or village name for weather information.", "location"
        
        # Only process speech input for location
        if input_type != "speech":
            return "Please speak your city or village name clearly.", "location"
        
        try:
            print(f"📍 Processing location: '{user_input}'")
            location = geolocator.geocode(user_input, timeout=10)
            if location:
                session_data["latitude"] = location.latitude
                session_data["longitude"] = location.longitude
                
                # Handle pending weather query
                pending_query = session_data.get("pending_query", "weather forecast")
                try:
                    weather_info = get_weather_forecast_for_user(pending_query, session_data["latitude"], session_data["longitude"])
                    session_data["state"] = "waiting_for_question"
                    session_data.pop("pending_query", None)
                    return f"Location found. Here's the weather information: {weather_info}. Do you have any other questions?", "question"
                except Exception as e:
                    print(f"Weather after location error: {e}")
                    session_data["state"] = "waiting_for_question"
                    return f"I found your location, but I'm having trouble getting weather information right now. Please try again later.", "question"
            else:
                session_data["retry_count"] = session_data.get("retry_count", 0) + 1
                
                if session_data["retry_count"] >= 2:
                    session_data["state"] = "waiting_for_question"
                    session_data["retry_count"] = 0
                    return "I couldn't find that location. Let's continue. What other farming question can I help you with?", "question"
                
                return "I couldn't find that location. Please tell me your city or village name more clearly.", "location"
                
        except Exception as e:
            print(f"Location processing error: {e}")
            session_data["state"] = "waiting_for_question"
            return "I had trouble processing that location. What other farming question can I help you with?", "question"

    def _create_voice_response(self, response, message, voice_lang, next_action, request):
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
    def post(self, request):
        try:
            pass
        except Exception as e:

            return Response(
                {"error": str(e),
                 "success":False
                 },
                status=status.HTTP_400_BAD_REQUEST
            )
