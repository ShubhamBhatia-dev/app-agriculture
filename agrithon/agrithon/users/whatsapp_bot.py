# This is the complete script for the conversational WhatsApp bot.
# It uses the 'deep-translator' library for reliable translations.

# WARNING: This method of hardcoding credentials is NOT recommended for production.
# It is better to use environment variables to keep your credentials secure.

import datetime
from flask import Flask, request
from twilio.rest import Client
from twilio.twiml.messaging_response import MessagingResponse
# Import the new, more stable translation library
from deep_translator import GoogleTranslator

# --- Your Hardcoded Credentials ---
# Found on your Twilio Console Dashboard: https://www.twilio.com/console
# ---------------------------------

# Initialize the Twilio Client and the Flask App
client = Client(ACCOUNT_SID, AUTH_TOKEN)
app = Flask(__name__)

# --- State Management ---
# This dictionary will store the current "state" of each user.
# For a real production app, you would use a database (like Redis or a SQL database)
# to store this information so it doesn't get lost if the server restarts.
user_states = {}

@app.route("/whatsapp", methods=['POST'])
def whatsapp_reply():
    """
    This function is called by Twilio every time a user sends a message.
    It handles incoming WhatsApp messages with conversational state.
    """
    # Get information about the incoming message
    incoming_msg = request.values.get('Body', '')
    sender_number = request.values.get('From', '') # e.g., 'whatsapp:+15551234567'

    # Prepare the response object
    response = MessagingResponse()
    msg = response.message()

    # Check the user's current conversational state
    current_state = user_states.get(sender_number)

    print(f"Received message from {sender_number}. Current state: {current_state}")

    # --- Main Conversational Logic ---

    # If the user is in the middle of a conversation, handle that first.
    if current_state == 'awaiting_order_number':
        order_number = incoming_msg
        print(f"Processing the received order number: {order_number}")

        # In a real application, you would look this order number up in your database.
        reply_text = f"Thank you. I am now looking up order number {order_number}. I will message you again when I have an update."

        msg.body(reply_text)
        # The conversation about the order is finished, so clear the user's state.
        user_states.pop(sender_number, None)

    else:
        # If the user is not in a conversation, handle their new message.
        try:
            # Use deep-translator to detect the language and translate to English for processing
            lang = GoogleTranslator().detect(incoming_msg)[0]
            translated_text = GoogleTranslator(source='auto', target='en').translate(incoming_msg).lower()
        except Exception as e:
            # If translation fails, default to English
            print(f"Translation error: {e}")
            lang = 'en'
            translated_text = incoming_msg.lower()

        # This is the "brain" of the bot, deciding what to do based on the message.
        reply_text_en = ""
        if 'problem' in translated_text and 'order' in translated_text:
            # This is where a multi-step conversation starts!
            reply_text_en = "I can help with that. What is your order number?"
            # Set the state for this user so we know their next message is the order number.
            user_states[sender_number] = 'awaiting_order_number'
        elif 'hello' in translated_text or 'hi' in translated_text:
            reply_text_en = "Hello! I am a helpful bot. How can I assist you today?"
        elif 'help' in translated_text:
            reply_text_en = "You can ask me about your order, our services, or prices."
        elif 'time' in translated_text:
            # Get the current time in Indian Standard Time (IST)
            ist = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
            now = datetime.datetime.now(ist)
            reply_text_en = f"The current time is {now.strftime('%I:%M %p')}."
        elif 'bye' in translated_text:
            reply_text_en = "Goodbye! Have a great day. 👋"
        else:
            # The default reply if the bot doesn't understand
            reply_text_en = "I'm sorry, I don't understand that. Type 'help' for options."

        # Translate the English reply back to the user's original language
        try:
            if lang != 'en':
                final_reply = GoogleTranslator(source='en', target=lang).translate(reply_text_en)
            else:
                final_reply = reply_text_en # No need to translate if original was English
        except Exception as e:
            print(f"Reply translation error: {e}")
            final_reply = reply_text_en # Fallback to English reply on error

        # Set the body of the message to be sent back to the user
        msg.body(final_reply)

    # Send the response back to Twilio, who will then send it to the user.
    return str(response)

if __name__ == "__main__":
    # This makes the Flask server run.
    # debug=True means it will auto-reload when you save changes.
    app.run(debug=True, port=5000)
