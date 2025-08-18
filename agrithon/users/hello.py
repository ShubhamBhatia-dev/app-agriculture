# # Download the helper library from https://www.twilio.com/docs/python/install
# import os
# from twilio.rest import Client

# # Find your Account SID and Auth Token at twilio.com/console
# # and set the environment variables. See http://twil.io/secure


# print(call.sid)


# File: test_call.py
# Description: A script to make Twilio call a specified phone number
# and connect it to a voice bot webhook.

import os
from twilio.rest import Client

# --- SETUP ---
# 1. Install the required Twilio library:
#    pip install twilio
#
# 2. Fill in your details in the CONFIGURATION section below.
#
# 3. Make sure your Django server and ngrok tunnel are running.
# --------------------------------------------------------------------

# --- CONFIGURATION ---
# Replace the placeholder values below with your actual Twilio credentials and phone numbers.
ACCOUNT_SID = ""  # Your Twilio Account SID
AUTH_TOKEN = ""             # Your Twilio Auth Token
TWILIO_NUMBER = ""                  # Your Twilio Phone Number
RECIPIENT_NUMBER = ""              # Your personal phone number to call (e.g., in India)

# IMPORTANT: Replace this with your actual ngrok URL
# It must point to your running voice bot webhook.
WEBHOOK_URL = ""

# --- MAIN EXECUTION ---
def initiate_test_call():
    """
    Uses the Twilio API to initiate an outbound call and connect it
    to the specified webhook.
    """
    # Validate that the placeholder values have been changed
    if "ACxxxx" in ACCOUNT_SID or "your_auth_token" in AUTH_TOKEN:
        print("❌ CONFIGURATION ERROR: Please replace the placeholder ACCOUNT_SID and AUTH_TOKEN values.")
        return

    if "<REPLACE-WITH-YOUR-ID>" in WEBHOOK_URL:
        print("❌ CONFIGURATION ERROR: Please replace the placeholder in the WEBHOOK_URL variable.")
        return

    print("--- Twilio Test Call Initiator ---")
    print(f"  ▶️  Requesting Twilio to call {RECIPIENT_NUMBER}")
    print(f"  ◀️  From your Twilio number: {TWILIO_NUMBER}")
    print(f"  🔗  Connecting to webhook: {WEBHOOK_URL}")
    print("------------------------------------")

    try:
        # Initialize the Twilio client
        client = Client(ACCOUNT_SID, AUTH_TOKEN)

        # Make the API call to create the outbound call
        call = client.calls.create(
            to=RECIPIENT_NUMBER,
            from_=TWILIO_NUMBER,
            url=WEBHOOK_URL  # This tells Twilio what to do when you answer
        )

        print(f"✅ SUCCESS! Call is being initiated.")
        print(f"   Call SID: {call.sid}")
        print("   Your phone should ring shortly.")

    except Exception as e:
        print(f"❌ ERROR: Could not initiate call.")
        print(f"   Details: {e}")

if __name__ == "__main__":
    initiate_test_call()
