import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from .models import Conversation, Message


class ChatConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.me = self.scope["user"]
        if not self.me.is_authenticated:
            await self.close(code=4001)
            return

        self.other_id = self.scope["url_route"]["kwargs"]["other_user_id"]
        self.conversation = await self.get_or_create_conversation()

        a, b = sorted([self.me.id, self.other_id])
        self.group_name = f"chat_{a}_{b}"
        print(">>> me:", self.me.id, "other:", self.other_id, "group:", self.group_name)

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        print(">>> RECEIVE:", text_data)
        data = json.loads(text_data)
        if data.get("type") != "message.send":
            return
        text = (data.get("text") or "").strip()
        if not text:
            return

        payload = await self.save_message(text)
        await self.channel_layer.group_send(
            self.group_name,
            {"type": "chat.message", "message": payload},
        )

    async def chat_message(self, event):
        print(">>> BROADCAST to", self.me.id)
        await self.send(text_data=json.dumps({
            "type": "message.new",
            "message": event["message"],
        }))

    @database_sync_to_async
    def get_or_create_conversation(self):
        convo = (Conversation.objects
                 .filter(participants=self.me)
                 .filter(participants__id=self.other_id)
                 .first())
        if convo is None:
            convo = Conversation.objects.create()
            convo.participants.add(self.me, User.objects.get(id=self.other_id))
        return convo

    @database_sync_to_async
    def save_message(self, text):
        m = Message.objects.create(
            conversation=self.conversation,
            sender=self.me,
            text=text,
        )
        return {
            "id": m.id,
            "text": m.text,
            "sender": self.me.id,
            "sender_name": self.me.username,
            "timestamp": m.timestamp.isoformat(),
            "image": None,
        }