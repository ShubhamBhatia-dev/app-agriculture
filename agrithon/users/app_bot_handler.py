# Download the helper library from https://www.twilio.com/docs/python/install
import os
from twilio.rest import Client

# Find your Account SID and Auth Token at twilio.com/console
# and set the environment variables. See http://twil.io/secure
account_sid = "ACaea20c3609c7e53893c37d310d76b99b"
auth_token = "45d1066d48bf7eee2efc57ed84b34df5"


client = Client(account_sid, auth_token)

def send_sms(to, otp):
    text = f"the verification code for jai jawan jai kisan is {otp}. This code is valid for 5 minutes."
    try:
        message = client.messages.create(
            body=text,
            from_="+18773138072",
            to=str("+91" + to),
        )
        success = True
    except:
        success = False

    return {
        "success": success,
        "code": otp,
    }

