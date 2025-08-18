
from django.urls import path
from .views import CreateUserView, PhoneChecker, WhatsappChatManager, home,CallBotManager,AppSmsHandler,SaveDataToDatabase,SaveAppHistory,AppChatManager,FarmerCropAPIView,ChatHistoryView

urlpatterns = [
    path('', home, name='home'),  # root URL
    path('create-user/', CreateUserView.as_view(), name='create-user'),
    path('whatsapp-bot/', WhatsappChatManager.as_view(), name='whatsapp-bot'),
    path('voice-webhook/', CallBotManager.as_view(), name='voice_webhook'),
    path('app/sms-handler/',AppSmsHandler.as_view(),name="sms_handler"),
    path('app/phone-data/', PhoneChecker.as_view(),name="phone-verifiy"),
    path('app/submit-user-data/',SaveDataToDatabase.as_view(),name="submit-user-data"),
    path('app/history/',SaveAppHistory.as_view(),name="add history"),
    path('app/ai/',AppChatManager.as_view(),name="add history"),
    path('app/farmer-crops/', FarmerCropAPIView.as_view(), name='farmer-crops'),
    path('app/chat-history/', ChatHistoryView.as_view(), name="chat-history"),
]
