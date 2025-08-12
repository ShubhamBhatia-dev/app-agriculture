
from django.urls import path
from .views import CreateUserView, PhoneChecker, WhatsappChatManager, home,CallBotManager,AppSmsHandler,SaveDataToDatabase

urlpatterns = [
    path('', home, name='home'),  # root URL
    path('create-user/', CreateUserView.as_view(), name='create-user'),
    path('whatsapp-bot/', WhatsappChatManager.as_view(), name='whatsapp-bot'),
    path('voice-webhook/', CallBotManager.as_view(), name='voice_webhook'),
    path('app/sms-handler/',AppSmsHandler.as_view(),name="sms_handler"),
    path('app/phone-verify/', PhoneChecker.as_view(),name="phone-verifiy"),
    path('app/submit-user-data',SaveDataToDatabase.as_view(),name="submit-user-data")
]
