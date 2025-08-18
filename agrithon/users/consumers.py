import json
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from .models import Chats

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # We won't join a group yet — wait for phone numbers from client
        self.room_name = None
        self.room_group_name = None
        await self.accept()

    async def disconnect(self, close_code):
        if self.room_group_name:
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        """
        Expected JSON:
        {
            "farmer_phoneNumber": "...",
            "vender_phoneNumber": "...",
            "farmer_name": "...",
            "vender_name": "...",
            "message": "..."
        }
        """
        text_data_json = json.loads(text_data)

        farmer_phoneNumber = text_data_json.get('farmer_phoneNumber', '')
        vender_phoneNumber = text_data_json.get('vender_phoneNumber', '')
        from_message = text_data_json.get('from_message')
        to_message = text_data_json.get('to_message')
        farmer_name = text_data_json.get('farmer_name', '')
        vender_name = text_data_json.get('vender_name', '')
        
        message = text_data_json.get('message', '')

        # If this is the first message, set the room name and join
        if not self.room_group_name:
            self.room_name = f"{farmer_phoneNumber}_{vender_phoneNumber}"
            self.room_group_name = f"chat_{self.room_name}"
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )

        # Save chat to DB
        await self.save_chat(
            farmer_phoneNumber,
            vender_phoneNumber,
            farmer_name,
            vender_name,
            message,
            from_message,
            to_message
        )

        # Broadcast to the group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'farmer_phoneNumber': farmer_phoneNumber,
                 "vender_phoneNumber":vender_phoneNumber,
                 "from_message":from_message,
                 "to_message":to_message,
                'vender_name': vender_name,
                'farmer_name':farmer_name,
                'message': message
            }
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
        'farmer_phoneNumber': event['farmer_phoneNumber'],
        'vender_phoneNumber': event['vender_phoneNumber'],
        'farmer_name': event['farmer_name'],
        'vender_name': event['vender_name'],
        'from_message': event['from_message'],
        'to_message': event['to_message'],
        'message': event['message']
    }))


    @sync_to_async
    def save_chat(self, farmer_phoneNumber, vender_phoneNumber, farmer_name, vender_name, message,from_message,to_message):
        Chats.objects.create(
            farmer_phoneNumber=farmer_phoneNumber,
            vender_phoneNumber=vender_phoneNumber,
            farmer_name=farmer_name,
            vender_name=vender_name,
            from_message=from_message,
            to_message=to_message,
            message=message
        )
